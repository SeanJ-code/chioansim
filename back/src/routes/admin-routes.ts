import { Router } from 'express'
import bcrypt from 'bcrypt'
import * as yup from 'yup'
import { authenticate, authorize } from '../middlewares/auth'
import { asyncHandler } from '../utils/http'
import {
  Booking,
  CaregiverProfile,
  CareRecipient,
  EmergencyAlert,
  Review,
  ServiceRequest,
  User,
} from '../models'
import type { AuthRequest } from '../types/auth'
import { AuditLog } from '../models/audit-log'
import { recordAudit } from '../utils/audit'
import { CaregiverLeaveRequest } from '../models/caregiver-work'
import { CaregiverCredential } from '../models/caregiver-credential'
import { Complaint } from '../models/complaint'
import { QualityAlert } from '../models/quality-alert'
import { ACTIVE_BOOKING_STATUSES, findBookingConflict } from '../utils/availability-policy'
import { Notification } from '../models/notification'
import { emitLeaveRealtime } from '../realtime'

export const adminRoutes = Router()
// use 套用到本檔全部路由：必須先通過 JWT，再確認角色為 ADMIN。
adminRoutes.use(authenticate, authorize('ADMIN'))

const createUserSchema = yup.object({
  account: yup.string().trim().lowercase().min(4, '帳號至少 4 個字元').required('請填寫帳號'),
  password: yup.string().min(8, '密碼至少 8 個字元').required('請填寫臨時密碼'),
  name: yup.string().trim().required('請填寫姓名'),
  phone: yup.string().trim().optional(),
  email: yup.string().trim().lowercase().email('Email 格式不正確').optional(),
  role: yup.string().oneOf(['USER', 'PATIENT', 'NURSE', 'ADMIN']).required(),
})

// POST /admin/users：管理員可建立帳號；專屬 Profile 仍由各角色後續流程補齊。
adminRoutes.post(
  '/users',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const input = await createUserSchema.validate(request.body, { abortEarly: false, stripUnknown: true })
    const user = await User.create({
      ...input,
      passwordHash: await bcrypt.hash(input.password, 12),
      password: undefined,
      status: input.role === 'NURSE' ? 'PENDING' : 'ACTIVE',
    })
    await recordAudit(request, 'CREATE_USER', 'users', user.id, undefined, user.toObject())
    response.status(201).json(user)
  }),
)

// GET /admin/users：列出帳號，可用 ?role=NURSE 等條件篩選。
adminRoutes.get(
  '/users',
  asyncHandler(async (request, response) => {
    const filter = request.query.role
      ? { role: String(request.query.role).toUpperCase(), status: { $ne: 'DELETED' } }
      : { status: { $ne: 'DELETED' } }
    response.json(await User.find(filter).sort({ createdAt: -1 }))
  }),
)

// GET /admin/nurses：管理頁需要看到包含 PENDING/REJECTED 的完整居服員名單。
adminRoutes.get(
  '/nurses',
  asyncHandler(async (_request, response) => {
    response.json(
      await CaregiverProfile.find()
        .populate('userId', 'account name phone email role status')
        .sort({ createdAt: -1 }),
    )
  }),
)

// GET /admin/nurses/:id/overview：人員中心點開居服員時才載入完整管理資料。
adminRoutes.get(
  '/nurses/:id/overview',
  asyncHandler(async (request, response) => {
    const caregiver = await CaregiverProfile.findById(request.params.id).populate(
      'userId',
      'account name phone email role status',
    )
    if (!caregiver) {
      response.status(404).json({ message: '找不到居服員' })
      return
    }
    const [credentials, leaves, bookings, alerts, auditLogs] = await Promise.all([
      CaregiverCredential.find({ caregiverId: caregiver._id }).sort({ expiresAt: 1, createdAt: -1 }),
      CaregiverLeaveRequest.find({ caregiverId: caregiver._id, hidden: { $ne: true } }).sort({ startAt: -1 }),
      Booking.find({ caregiverId: caregiver._id, hidden: { $ne: true } })
        .populate('serviceTypeIds', 'name')
        .sort({ scheduledStartAt: -1 })
        .limit(30),
      QualityAlert.find({ caregiverId: caregiver._id }).sort({ createdAt: -1 }),
      AuditLog.find({ targetId: { $in: [String(caregiver._id), String(caregiver.get('userId')?._id)] } })
        .populate('adminUserId', 'name account')
        .sort({ createdAt: -1 })
        .limit(30),
    ])
    response.json({ caregiver, credentials, leaves, bookings, alerts, auditLogs })
  }),
)

// GET /admin/nurse-leaves：管理員查看全部請假，並可依狀態篩選待審案件。
adminRoutes.get(
  '/nurse-leaves',
  asyncHandler(async (request, response) => {
    const filter = request.query.status ? { status: request.query.status } : {}
    response.json(
      await CaregiverLeaveRequest.find({ ...filter, hidden: { $ne: true } })
        .populate({
          path: 'caregiverId',
          populate: { path: 'userId', select: 'name phone email' },
        })
        .sort({ startAt: -1 }),
    )
  }),
)

// PATCH /admin/nurse-leaves/:id：核准或拒絕請假，保留審核人與時間供稽核。
adminRoutes.patch(
  '/nurse-leaves/:id',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    if (!['APPROVED', 'REJECTED'].includes(request.body.status)) {
      response.status(400).json({ message: '請假審核狀態只能是 APPROVED 或 REJECTED' })
      return
    }
    const before = await CaregiverLeaveRequest.findById(request.params.id)
    if (!before || before.get('status') !== 'PENDING') {
      response.status(409).json({ message: '找不到待審中的請假申請' })
      return
    }
    if (request.body.status === 'APPROVED') {
      if (new Date(before.get('endAt')) <= new Date()) {
        response.status(409).json({ code: 'LEAVE_ALREADY_EXPIRED', message: '請假結束時間已早於現在，無法核准。' })
        return
      }
      const conflicts = await findBookingConflict(before.get('caregiverId'), before.get('startAt'), before.get('endAt'), undefined, ACTIVE_BOOKING_STATUSES)
      if (conflicts.length) {
        response.status(409).json({
          code: 'LEAVE_BOOKING_CONFLICT',
          message: '此請假時段與既有照護任務重疊',
          conflicts: conflicts.map((booking) => ({ _id: booking._id, bookingNumber: booking.get('bookingNumber'), scheduledStartAt: booking.get('scheduledStartAt'), scheduledEndAt: booking.get('scheduledEndAt'), status: booking.get('status') })),
        })
        return
      }
    }
    const leave = await CaregiverLeaveRequest.findOneAndUpdate(
      { _id: request.params.id, status: 'PENDING', updatedAt: before.get('updatedAt') },
      {
        status: request.body.status,
        adminNote: request.body.adminNote,
        reviewedByAdminId: request.auth?.userId,
        reviewedAt: new Date(),
      },
      { new: true, runValidators: true },
    )
    if (!leave) {
      response.status(409).json({ message: '找不到待審中的請假申請' })
      return
    }
    await recordAudit(
      request,
      request.body.status === 'APPROVED' ? 'CAREGIVER_LEAVE_APPROVED' : 'CAREGIVER_LEAVE_REJECTED',
      'caregiverleaverequests',
      String(request.params.id),
      before?.toObject(),
      leave.toObject(),
    )
    const caregiver = await CaregiverProfile.findById(leave.get('caregiverId')).select('userId')
    if (caregiver?.get('userId')) await Notification.create({
      recipientUserId: caregiver.get('userId'),
      type: 'SYSTEM',
      title: request.body.status === 'APPROVED' ? '您的請假已核准' : '您的請假未核准',
      message: `${new Date(leave.get('startAt')).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })} 的請假申請已完成審核。`,
    })
    await emitLeaveRealtime(leave.get('caregiverId'))
    response.json(leave)
  }),
)

// PATCH /admin/nurse-leaves/:id/cancel：只有管理員能撤銷已核准請假。
adminRoutes.patch(
  '/nurse-leaves/:id/cancel',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const before = await CaregiverLeaveRequest.findOne({ _id: request.params.id, status: 'APPROVED', hidden: { $ne: true } })
    if (!before) {
      response.status(409).json({ message: '找不到可撤銷的已核准請假' })
      return
    }
    const leave = await CaregiverLeaveRequest.findOneAndUpdate(
      { _id: before._id, status: 'APPROVED', updatedAt: before.get('updatedAt') },
      { status: 'CANCELLED', adminNote: request.body.adminNote, reviewedByAdminId: request.auth?.userId, reviewedAt: new Date() },
      { new: true, runValidators: true },
    )
    if (!leave) {
      response.status(409).json({ message: '請假狀態已由其他操作更新，請重新整理' })
      return
    }
    await recordAudit(request, 'CAREGIVER_LEAVE_CANCELLED_BY_ADMIN', 'caregiverleaverequests', String(leave._id), before.toObject(), leave.toObject())
    const caregiver = await CaregiverProfile.findById(leave.get('caregiverId')).select('userId')
    if (caregiver?.get('userId')) await Notification.create({ recipientUserId: caregiver.get('userId'), type: 'SYSTEM', title: '已核准請假已由管理員撤銷', message: '如需重新請假，請再次提出申請。' })
    await emitLeaveRealtime(leave.get('caregiverId'))
    response.json(leave)
  }),
)

// GET /admin/users/:id：查詢單一帳號，密碼雜湊仍因 select:false 不會回傳。
adminRoutes.get(
  '/users/:id',
  asyncHandler(async (request, response) => {
    response.json(await User.findById(request.params.id))
  }),
)

// PATCH /admin/users/:id：停權、復權或修改資料，但禁止直接寫入密碼欄位。
adminRoutes.patch(
  '/users/:id',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const update = { ...request.body }
    delete update.passwordHash
    delete update.password
    const before = await User.findById(request.params.id)
    const user = await User.findByIdAndUpdate(request.params.id, update, {
      new: true,
      runValidators: true,
    })
    await recordAudit(
      request,
      'UPDATE_USER',
      'users',
      String(request.params.id),
      before?.toObject(),
      user?.toObject(),
    )
    response.json(user)
  }),
)

// DELETE /admin/users/:id：軟刪除帳號，保留預約、申訴與責任追蹤所需關聯。
adminRoutes.delete(
  '/users/:id',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const before = await User.findById(request.params.id)
    const user = await User.findByIdAndUpdate(
      request.params.id,
      {
        status: 'DELETED',
        deletedAt: new Date(),
        deletedByAdminId: request.auth?.userId,
        deleteReason: request.body?.reason,
      },
      { new: true },
    )
    await recordAudit(
      request,
      'SOFT_DELETE_USER',
      'users',
      String(request.params.id),
      before?.toObject(),
      user?.toObject(),
    )
    response.json({ message: '帳號已停用並保留稽核紀錄', user })
  }),
)

// GET /admin/audit-logs：只有 ADMIN 可查詢重要管理操作，不提供修改與刪除。
adminRoutes.get(
  '/audit-logs',
  asyncHandler(async (request, response) => {
    const filter = request.query.action ? { action: String(request.query.action) } : {}
    response.json(
      await AuditLog.find(filter)
        .populate('adminUserId', 'account name')
        .sort({ createdAt: -1 })
        .limit(200),
    )
  }),
)

// GET /admin/statistics：並行統計帳號、預約、求救與各角色評價。
adminRoutes.get(
  '/statistics',
  asyncHandler(async (_request, response) => {
    // Promise.all 讓互不相依的六項查詢同時進行，比逐項 await 更快。
    const [users, patients, nurses, bookings, openEmergencies, reviews] = await Promise.all([
      User.countDocuments({ status: { $ne: 'DELETED' } }),
      CareRecipient.countDocuments({ status: { $ne: 'DELETED' } }),
      CaregiverProfile.countDocuments(),
      Booking.aggregate([
        { $match: { hidden: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      EmergencyAlert.countDocuments({ status: 'OPEN', hidden: { $ne: true } }),
      Review.aggregate([
        { $match: { visible: true, hidden: { $ne: true } } },
        { $group: { _id: '$targetRole', average: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
    ])
    response.json({
      users,
      patients,
      nurses,
      bookingsByStatus: bookings,
      openEmergencies,
      reviewsByRole: reviews,
    })
  }),
)

// GET /admin/dashboard：把分散的營運資料轉成管理員可理解的品質、需求與即時安全摘要。
adminRoutes.get(
  '/dashboard',
  asyncHandler(async (_request, response) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const inThirtyDays = new Date(now.getTime() + 30 * 86400000)

    const activeServiceStatuses = ['DEPARTED', 'ARRIVED', 'WAITING_DECISION', 'IN_SERVICE']
    const [
      roles,
      recipientCount,
      caregiverCount,
      pendingCredentials,
      todayBookings,
      activeServices,
      openEmergencies,
      openComplaints,
      ratingDistribution,
      reviewSummary,
      serviceDemand,
      caregiverFrequency,
      journey,
      alerts,
      recentReviews,
      recentBookings,
      monthlyBookings,
      pendingTooLong,
      awaitingConfirmation,
      expiringCredentials,
    ] = await Promise.all([
      User.aggregate([
        { $match: { status: { $ne: 'DELETED' } } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      CareRecipient.countDocuments({ status: { $ne: 'DELETED' } }),
      CaregiverProfile.countDocuments(),
      CaregiverCredential.countDocuments({ verificationStatus: 'PENDING' }),
      Booking.countDocuments({
        scheduledStartAt: { $gte: today, $lt: tomorrow },
        hidden: { $ne: true },
      }),
      Booking.countDocuments({ status: { $in: activeServiceStatuses }, hidden: { $ne: true } }),
      EmergencyAlert.countDocuments({ status: 'OPEN', hidden: { $ne: true } }),
      Complaint.countDocuments({
        status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFORMATION'] },
      }),
      Review.aggregate([
        { $match: { visible: true, hidden: { $ne: true } } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
      Review.aggregate([
        { $match: { visible: true, hidden: { $ne: true } } },
        {
          $group: {
            _id: null,
            average: { $avg: '$rating' },
            count: { $sum: 1 },
            positive: { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } },
          },
        },
      ]),
      Booking.aggregate([
        { $match: { hidden: { $ne: true } } },
        { $unwind: '$serviceTypeIds' },
        { $group: { _id: '$serviceTypeIds', count: { $sum: 1 }, completedCount: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } }, requesterIds: { $addToSet: '$requesterUserId' }, caregiverIds: { $addToSet: '$caregiverId' } } },
        { $sort: { count: -1 } },
        {
          $lookup: {
            from: 'servicetypes',
            localField: '_id',
            foreignField: '_id',
            as: 'service',
          },
        },
        { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, code: '$service.code', name: { $ifNull: ['$service.name', '未分類服務'] }, count: 1, completedCount: 1, uniqueRequesterCount: { $size: '$requesterIds' }, uniqueCaregiverCount: { $size: '$caregiverIds' } } },
      ]),
      Booking.aggregate([
        { $match: { hidden: { $ne: true } } },
        {
          $group: {
            _id: '$caregiverId',
            bookingCount: { $sum: 1 },
            completedCount: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
            requesterIds: { $addToSet: '$requesterUserId' },
          },
        },
        { $sort: { bookingCount: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: 'caregiverprofiles',
            localField: '_id',
            foreignField: '_id',
            as: 'caregiver',
          },
        },
        { $unwind: '$caregiver' },
        {
          $lookup: {
            from: 'users',
            localField: 'caregiver.userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            caregiverId: '$_id',
            userId: '$user._id',
            name: '$user.name',
            bookingCount: 1,
            completedCount: 1,
            uniqueRequesterCount: { $size: '$requesterIds' },
            ratingAverage: '$caregiver.ratingAverage',
            ratingCount: '$caregiver.ratingCount',
            verificationStatus: '$caregiver.verificationStatus',
            active: '$caregiver.active',
          },
        },
      ]),
      Promise.all([
        User.countDocuments({ status: { $ne: 'DELETED' } }),
        ServiceRequest.countDocuments({ hidden: { $ne: true } }),
        Booking.countDocuments({ hidden: { $ne: true } }),
        Booking.countDocuments({ status: 'COMPLETED', hidden: { $ne: true } }),
        Review.countDocuments({ visible: true, hidden: { $ne: true } }),
      ]),
      QualityAlert.find({ status: { $ne: 'RESOLVED' } })
        .populate({ path: 'caregiverId', populate: { path: 'userId', select: 'name phone email status' } })
        .populate('reviewIds', 'rating comment createdAt')
        .sort({ severity: -1, createdAt: -1 })
        .limit(20),
      Review.find({ visible: true, hidden: { $ne: true } })
        .populate('reviewerUserId', 'name role')
        .populate('targetUserId', 'name role')
        .sort({ createdAt: -1 })
        .limit(12),
      Booking.find({ hidden: { $ne: true }, scheduledStartAt: { $gte: new Date(Date.now() - 30 * 86400000) } })
        .populate('requesterUserId', 'name account')
        .populate('recipientId', 'name carePhotoUrls careLevel mobilityStatus heightCm weightKg attentionNotes')
        .populate({ path: 'caregiverId', populate: { path: 'userId', select: 'name' } })
        .populate('serviceTypeIds', 'name')
        .populate('serviceRequestId', 'specialRequirements serviceAddress')
        .sort({ updatedAt: -1 })
        .limit(60),
      Booking.aggregate([
        { $match: { hidden: { $ne: true }, scheduledStartAt: { $gte: monthStart } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Booking.countDocuments({
        status: 'PENDING',
        createdAt: { $lte: twoHoursAgo },
        hidden: { $ne: true },
      }),
      Booking.countDocuments({
        status: 'AWAITING_USER_CONFIRMATION',
        completionRequestedAt: { $lte: twentyFourHoursAgo },
        hidden: { $ne: true },
      }),
      CaregiverCredential.countDocuments({
        verificationStatus: 'APPROVED',
        expiresAt: { $gte: now, $lte: inThirtyDays },
      }),
    ])

    const roleCounts = Object.fromEntries(roles.map((item) => [item._id, item.count]))
    const [registered, requested, booked, completed, reviewed] = journey
    const bookingCounts: Record<string, number> = Object.fromEntries(
      monthlyBookings.map((item) => [String(item._id), Number(item.count)]),
    )
    const completedCount = Number(bookingCounts.COMPLETED || 0)
    const cancelledCount = Number(bookingCounts.CANCELLED || 0) + Number(bookingCounts.ABANDONED || 0)
    const finishedCount = completedCount + cancelledCount
    const monthlyCompletedIds = await Booking.distinct('_id', {
      status: 'COMPLETED', scheduledStartAt: { $gte: monthStart }, hidden: { $ne: true },
    })
    const monthlyReviewed = monthlyCompletedIds.length
      ? (await Review.distinct('bookingId', { bookingId: { $in: monthlyCompletedIds }, visible: true, hidden: { $ne: true } })).length
      : 0
    const attention = [
      { type: 'BOOKING_PENDING', filter: 'PENDING_OVER_2H', priority: 'HIGH', count: pendingTooLong, title: '預約等待居服員確認超過 2 小時', description: '建議優先確認居服員安排', targetTab: 'services', targetStatus: 'PENDING' },
      { type: 'USER_CONFIRMATION', filter: 'CONFIRMATION_OVER_24H', priority: 'MEDIUM', count: awaitingConfirmation, title: '使用者等待確認完成超過 24 小時', description: '可主動關懷服務是否順利完成', targetTab: 'services', targetStatus: 'AWAITING_USER_CONFIRMATION' },
      { type: 'QUALITY_ALERT', priority: 'HIGH', count: alerts.length + openEmergencies, title: '品質與安全事件待處理', description: '包含低星評價與開啟中的安全通報', targetTab: 'quality' },
      { type: 'CREDENTIAL', filter: 'DOCUMENT_ATTENTION', priority: 'LOW', count: pendingCredentials + expiringCredentials, title: '居服員文件待審或即將到期', description: `${pendingCredentials} 件待審、${expiringCredentials} 件 30 日內到期`, targetTab: 'members' },
    ].filter((item) => item.count > 0)
    response.json({
      pulse: {
        roleCounts,
        recipientCount,
        caregiverCount,
        pendingCredentials,
        todayBookings,
        activeServices,
        openEmergencies,
        openComplaints,
      },
      reviews: {
        distribution: ratingDistribution,
        summary: reviewSummary[0] || { average: 0, count: 0, positive: 0 },
        recent: recentReviews,
      },
      serviceDemand,
      caregiverFrequency,
      journey: { registered, requested, booked, completed, reviewed },
      performance: {
        completionRate: finishedCount ? Math.round((completedCount / finishedCount) * 100) : 0,
        cancellationRate: finishedCount ? Math.round((cancelledCount / finishedCount) * 100) : 0,
        reviewRate: completedCount ? Math.round((monthlyReviewed / completedCount) * 100) : 0,
        inProgressCount: Object.entries(bookingCounts).filter(([status]) => !['COMPLETED', 'CANCELLED', 'ABANDONED'].includes(status)).reduce((sum, [, count]) => sum + count, 0),
        ratingAverage: reviewSummary[0]?.average || 0,
      },
      attention,
      alerts,
      recentBookings,
    })
  }),
)

// PATCH /admin/quality-alerts/:id：保存警告、約談、暫停接案或結案的管理處置。
adminRoutes.patch(
  '/quality-alerts/:id',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const allowedStatuses = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED']
    const allowedActions = ['WARNED', 'INTERVIEW_REQUIRED', 'SUSPEND_RECOMMENDED', 'CLOSED']
    const { status, action, adminNote } = request.body
    if (!allowedStatuses.includes(status) || (action && !allowedActions.includes(action))) {
      response.status(400).json({ message: '警訊處理狀態或處置方式不正確' })
      return
    }
    const before = await QualityAlert.findById(request.params.id)
    if (!before) {
      response.status(404).json({ message: '找不到品質警訊' })
      return
    }
    const alert = await QualityAlert.findByIdAndUpdate(
      request.params.id,
      {
        status,
        action,
        adminNote,
        handledByAdminId: request.auth?.userId,
        handledAt: new Date(),
      },
      { new: true, runValidators: true },
    )
    if (action === 'SUSPEND_RECOMMENDED') {
      await CaregiverProfile.findByIdAndUpdate(before.get('caregiverId'), { active: false })
    }
    await recordAudit(
      request,
      'HANDLE_QUALITY_ALERT',
      'qualityalerts',
      String(request.params.id),
      before.toObject(),
      alert?.toObject(),
    )
    response.json(alert)
  }),
)
