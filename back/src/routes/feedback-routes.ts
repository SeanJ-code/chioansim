import { Router } from 'express'
import { Types } from 'mongoose'
import { authenticate, authorize } from '../middlewares/auth'
import type { AuthRequest } from '../types/auth'
import { asyncHandler } from '../utils/http'
import { Booking, CaregiverProfile, CareRecipient, EmergencyAlert, Review, User } from '../models'
import { Complaint } from '../models/complaint'
import { upload } from '../middlewares/upload'
import { recordAudit } from '../utils/audit'
import { QualityAlert } from '../models/quality-alert'

export const feedbackRoutes = Router()
// 評價與求救都屬個人操作，整組路由統一要求登入。
feedbackRoutes.use(authenticate)

// 評價新增、修改或刪除後，重新聚合可見評分並快取到 CaregiverProfile。
async function updateNurseRating(targetUserId: string): Promise<void> {
  // aggregate 在 MongoDB 端計算平均與筆數，避免把全部評價載入 Node.js 才運算。
  const [summary] = await Review.aggregate([
    {
      $match: {
        targetUserId: new Types.ObjectId(targetUserId),
        targetRole: 'NURSE',
        visible: true,
        hidden: { $ne: true },
      },
    },
    { $group: { _id: '$targetUserId', average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ])
  await CaregiverProfile.findOneAndUpdate(
    { userId: targetUserId },
    { ratingAverage: summary?.average || 0, ratingCount: summary?.count || 0 },
  )

  // 累積三次以上一星就建立品質警訊；同一位居服員未結案時不重複洗版。
  const oneStarReviews = await Review.find({
    targetUserId,
    targetRole: 'NURSE',
    rating: 1,
    visible: true,
    hidden: { $ne: true },
  })
    .select('_id')
    .sort({ createdAt: -1 })
  if (oneStarReviews.length >= 3) {
    const caregiver = await CaregiverProfile.findOne({ userId: targetUserId })
    if (
      caregiver &&
      !(await QualityAlert.exists({
        caregiverId: caregiver._id,
        type: 'THREE_ONE_STAR_REVIEWS',
        status: { $in: ['OPEN', 'ACKNOWLEDGED'] },
      }))
    ) {
      await QualityAlert.create({
        caregiverId: caregiver._id,
        caregiverUserId: targetUserId,
        type: 'THREE_ONE_STAR_REVIEWS',
        severity: 'HIGH',
        title: '居服員累積三次以上一星評價',
        description: `目前共有 ${oneStarReviews.length} 次一星評價，請管理員檢視留言並主動關懷雙方。`,
        reviewIds: oneStarReviews.map((review) => review._id),
      })
    }
  }
}

// POST /feedback/reviews：只有已完成案件的實際參與者可以互相評價。
feedbackRoutes.post(
  '/reviews',
  upload.array('photos', 5),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const booking = await Booking.findById(request.body.bookingId)
    const target = await User.findById(request.body.targetUserId)
    if (!booking || booking.get('status') !== 'COMPLETED' || !target) {
      response.status(400).json({ message: '只有已完成的預約可以評價有效對象' })
      return
    }
    // 分別確認登入者是否為下單者、PATIENT 本人或承接 NURSE。
    const reviewerIsRequester = booking.get('requesterUserId').toString() === request.auth?.userId
    const recipient = await CareRecipient.findById(booking.get('recipientId'))
    const reviewerIsPatient = recipient?.get('accountUserId')?.toString() === request.auth?.userId
    const nurse = await CaregiverProfile.findById(booking.get('caregiverId'))
    const reviewerIsNurse = nurse?.get('userId').toString() === request.auth?.userId
    if (
      !reviewerIsRequester &&
      !reviewerIsPatient &&
      !reviewerIsNurse &&
      request.auth?.role !== 'ADMIN'
    ) {
      response.status(403).json({ message: '只有此預約參與者可以評價' })
      return
    }
    const requesterUserId = booking.get('requesterUserId').toString()
    const patientUserId = recipient?.get('accountUserId')?.toString()
    const nurseUserId = nurse?.get('userId').toString()
    const allowedTargets = reviewerIsNurse
      ? [requesterUserId, patientUserId]
      : [nurseUserId]
    if (request.auth?.role !== 'ADMIN' && !allowedTargets.includes(target.id)) {
      response.status(400).json({ message: '只能評價這次服務的實際對象' })
      return
    }
    const rating = Number(request.body.rating)
    const comment = String(request.body.comment || '').trim()
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) {
      response.status(400).json({ message: '請填寫 1 至 5 星與照護日誌內容' })
      return
    }
    const files = request.files as Express.Multer.File[] | undefined
    let careTags: string[] = []
    try {
      const parsed = request.body.careTags ? JSON.parse(request.body.careTags) : []
      careTags = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
    } catch {
      response.status(400).json({ message: '照護標籤格式不正確' })
      return
    }
    const review = await Review.create({
      ...request.body,
      rating,
      comment,
      careTags,
      photoUrls: files?.map((file) => `/uploads/${file.filename}`) || [],
      reviewerUserId: request.auth?.userId,
      targetRole: target.get('role'),
    })
    if (target.get('role') === 'NURSE') await updateNurseRating(target.id)
    response.status(201).json(review)
  }),
)

// GET /feedback/reviews：可用 targetUserId 篩選某人的公開評價。
feedbackRoutes.get(
  '/reviews',
  asyncHandler(async (request, response) => {
    const filter = request.query.targetUserId
      ? { targetUserId: request.query.targetUserId, visible: true, hidden: { $ne: true } }
      : { visible: true, hidden: { $ne: true } }
    response.json(
      await Review.find(filter)
        .populate('reviewerUserId', 'name role')
        .populate('targetUserId', 'name role')
        .sort({ createdAt: -1 }),
    )
  }),
)

// GET /feedback/reviews/summary：只回傳目前帳號參與的雙向評價總覽。
feedbackRoutes.get(
  '/reviews/summary',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const userId = new Types.ObjectId(request.auth!.userId)
    const participantFilter =
      request.auth?.role === 'ADMIN'
        ? {}
        : { $or: [{ reviewerUserId: userId }, { targetUserId: userId }] }
    const reviewFilter = { ...participantFilter, visible: true, hidden: { $ne: true } }
    const [[summary], reviews] = await Promise.all([
      Review.aggregate([
        { $match: reviewFilter },
        {
          $group: {
            _id: null,
            average: { $avg: '$rating' },
            count: { $sum: 1 },
            givenCount: { $sum: { $cond: [{ $eq: ['$reviewerUserId', userId] }, 1, 0] } },
            receivedCount: { $sum: { $cond: [{ $eq: ['$targetUserId', userId] }, 1, 0] } },
          },
        },
      ]),
      Review.find(reviewFilter)
        .populate('reviewerUserId', 'name role')
        .populate('targetUserId', 'name role')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ])
    response.json({
      average: Number(summary?.average || 0),
      count: Number(summary?.count || 0),
      givenCount: Number(summary?.givenCount || 0),
      receivedCount: Number(summary?.receivedCount || 0),
      reviews: (reviews as unknown as Array<{
        _id: Types.ObjectId
        rating: number
        comment?: string
        reviewerUserId: unknown
        targetUserId: unknown
        createdAt: Date
      }>).map((review) => {
        const reviewer = review.reviewerUserId as unknown as { _id: Types.ObjectId; name?: string; role?: string }
        const target = review.targetUserId as unknown as { _id: Types.ObjectId; name?: string; role?: string }
        return {
          _id: review._id,
          rating: review.rating,
          comment: review.comment || '',
          direction: reviewer?._id?.equals(userId) ? 'GIVEN' : 'RECEIVED',
          reviewerName: reviewer?.name || '平台成員',
          reviewerRole: reviewer?.role || '',
          targetName: target?.name || '平台成員',
          targetRole: target?.role || '',
          createdAt: review.createdAt,
        }
      }),
    })
  }),
)

// PATCH /feedback/reviews/:id：一般人只能改自己的評價；ADMIN 可進行裁決或隱藏。
feedbackRoutes.patch(
  '/reviews/:id',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const filter =
      request.auth?.role === 'ADMIN'
        ? { _id: request.params.id }
        : { _id: request.params.id, reviewerUserId: request.auth?.userId }
    const review = await Review.findOneAndUpdate(filter, request.body, {
      new: true,
      runValidators: true,
    })
    if (review?.get('targetRole') === 'NURSE')
      await updateNurseRating(review.get('targetUserId').toString())
    response.json(review)
  }),
)

// DELETE /feedback/reviews/:id：隱藏評價並重算 NURSE 平均分，原始內容仍保留。
feedbackRoutes.delete(
  '/reviews/:id',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const review = await Review.findById(request.params.id)
    if (
      !review ||
      (request.auth?.role !== 'ADMIN' &&
        review.get('reviewerUserId').toString() !== request.auth?.userId)
    ) {
      response.status(403).json({ message: '無權刪除此評價' })
      return
    }
    review.set({
      visible: false,
      hidden: true,
      hiddenAt: new Date(),
      hiddenByUserId: request.auth?.userId,
    })
    await review.save()
    if (review.get('targetRole') === 'NURSE')
      await updateNurseRating(review.get('targetUserId').toString())
    response.status(204).send()
  }),
)

// POST /feedback/complaints：USER、PATIENT、NURSE 都可針對案件提出正式申訴。
feedbackRoutes.post(
  '/complaints',
  authorize('USER', 'PATIENT', 'NURSE'),
  upload.array('evidence', 6),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    if (!request.body.category || !request.body.description) {
      response.status(400).json({ message: '申訴 category 與 description 為必填' })
      return
    }
    const files = request.files as Express.Multer.File[] | undefined
    const complaint = await Complaint.create({
      complainantUserId: request.auth?.userId,
      targetUserId: request.body.targetUserId || undefined,
      bookingId: request.body.bookingId || undefined,
      category: request.body.category,
      description: request.body.description,
      evidenceUrls: files?.map((file) => `/uploads/${file.filename}`) || [],
      priority: request.body.priority || 'NORMAL',
    })
    response.status(201).json(complaint)
  }),
)

// GET /feedback/complaints：一般身分只看自己的申訴，ADMIN 可查看全部案件。
feedbackRoutes.get(
  '/complaints',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const filter = request.auth?.role === 'ADMIN' ? {} : { complainantUserId: request.auth?.userId }
    response.json(
      await Complaint.find(filter)
        .populate('complainantUserId', 'name role')
        .populate('targetUserId', 'name role')
        .sort({ createdAt: -1 }),
    )
  }),
)

// GET /feedback/complaints/:id：申訴人與 ADMIN 可查看處理進度。
feedbackRoutes.get(
  '/complaints/:id',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const filter =
      request.auth?.role === 'ADMIN'
        ? { _id: request.params.id }
        : { _id: request.params.id, complainantUserId: request.auth?.userId }
    const complaint = await Complaint.findOne(filter)
    response.status(complaint ? 200 : 404).json(complaint || { message: '找不到申訴案件' })
  }),
)

// PATCH /feedback/complaints/:id：申訴人只能撤回；ADMIN 可受理、要求補件與裁決。
feedbackRoutes.patch(
  '/complaints/:id',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    if (request.auth?.role !== 'ADMIN') {
      const complaint = await Complaint.findOneAndUpdate(
        { _id: request.params.id, complainantUserId: request.auth?.userId, status: 'SUBMITTED' },
        { status: 'CANCELLED' },
        { new: true },
      )
      response.status(complaint ? 200 : 403).json(complaint || { message: '此申訴無法撤回' })
      return
    }

    const allowedStatuses = ['UNDER_REVIEW', 'NEED_MORE_INFORMATION', 'RESOLVED', 'REJECTED']
    if (!allowedStatuses.includes(request.body.status)) {
      response.status(400).json({ message: '申訴處理狀態無效' })
      return
    }
    const before = await Complaint.findById(request.params.id)
    const complaint = await Complaint.findByIdAndUpdate(
      request.params.id,
      {
        status: request.body.status,
        priority: request.body.priority,
        assignedAdminId: request.auth?.userId,
        adminDecision: request.body.adminDecision,
        resolutionNote: request.body.resolutionNote,
        resolvedAt: ['RESOLVED', 'REJECTED'].includes(request.body.status) ? new Date() : undefined,
      },
      { new: true, runValidators: true },
    )
    await recordAudit(
      request,
      'HANDLE_COMPLAINT',
      'complaints',
      String(request.params.id),
      before?.toObject(),
      complaint?.toObject(),
    )
    response.json(complaint)
  }),
)

// POST /feedback/emergencies：只有 PATIENT 帳號能發出求救並連結其照護資料。
feedbackRoutes.post(
  '/emergencies',
  authorize('PATIENT'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const recipient = await CareRecipient.findOne({ accountUserId: request.auth?.userId })
    const alert = await EmergencyAlert.create({
      ...request.body,
      patientUserId: request.auth?.userId,
      recipientId: recipient?._id,
    })
    response.status(201).json(alert)
  }),
)

// GET /feedback/emergencies：PATIENT 看自己的紀錄，ADMIN 看全部待處理事件。
feedbackRoutes.get(
  '/emergencies',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const filter = request.auth?.role === 'ADMIN' ? {} : { patientUserId: request.auth?.userId }
    response.json(
      await EmergencyAlert.find({ ...filter, hidden: { $ne: true } }).sort({ createdAt: -1 }),
    )
  }),
)

// PATCH /feedback/emergencies/:id：ADMIN 更新處理狀態並記錄處理者與結案時間。
feedbackRoutes.patch(
  '/emergencies/:id',
  authorize('ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    response.json(
      await EmergencyAlert.findByIdAndUpdate(
        request.params.id,
        {
          ...request.body,
          handledByAdminId: request.auth?.userId,
          resolvedAt: ['RESOLVED', 'FALSE_ALARM'].includes(request.body.status)
            ? new Date()
            : undefined,
        },
        { new: true },
      ),
    )
  }),
)

// DELETE /feedback/emergencies/:id：管理員只隱藏誤建事件，保留安全稽核紀錄。
feedbackRoutes.delete(
  '/emergencies/:id',
  authorize('ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    await EmergencyAlert.findByIdAndUpdate(request.params.id, {
      status: 'FALSE_ALARM',
      hidden: true,
      hiddenAt: new Date(),
      hiddenByUserId: request.auth?.userId,
    })
    response.status(204).send()
  }),
)
