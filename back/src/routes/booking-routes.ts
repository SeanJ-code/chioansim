import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth'
import type { AuthRequest } from '../types/auth'
import { asyncHandler } from '../utils/http'
import {
  isCancellationRefundEligible,
  LOCATION_SHARING_STATUSES,
  nextBookingCompletionStatus,
} from '../utils/booking-policy'
import {
  Booking,
  Availability,
  CaregiverProfile,
  CareRecipient,
  InjuryReport,
  ServiceRequest,
  ServiceType,
  ServiceRecord,
  UserRecipientRelation,
} from '../models'
import { upload } from '../middlewares/upload'
import type { Types } from 'mongoose'
import { Notification } from '../models/notification'
import { emitBookingRealtime } from '../realtime'
import { taipeiDateTimeToUtc, taipeiWeekday } from '../utils/datetime'
import { bookingCreateSchema, bookingRescheduleSchema } from '../utils/booking-validation'

const NON_BLOCKING_BOOKING_STATUSES = ['CANCELLED', 'ABANDONED', 'COMPLETED']

export const bookingRoutes = Router()
// 預約含個資、定位與健康紀錄，所以本檔全部 API 都必須登入。
bookingRoutes.use(authenticate)

// 共用資料層級權限：管理員、下單者、承接 NURSE、PATIENT 本人或獲授權家屬可查看。
type ViewableBooking = {
  get(path: 'requesterUserId' | 'caregiverId'): Types.ObjectId
  get(path: 'recipientId'): Types.ObjectId | null
}

async function canView(request: AuthRequest, booking: ViewableBooking): Promise<boolean> {
  if (
    request.auth?.role === 'ADMIN' ||
    booking.get('requesterUserId').toString() === request.auth?.userId
  )
    return true
  if (request.auth?.role === 'NURSE') {
    return Boolean(
      await CaregiverProfile.exists({
        _id: booking.get('caregiverId'),
        userId: request.auth.userId,
      }),
    )
  }
  const recipientId = booking.get('recipientId')
  if (!recipientId) return false
  if (await CareRecipient.exists({ _id: recipientId, accountUserId: request.auth?.userId }))
    return true
  return Boolean(
    await UserRecipientRelation.exists({
      recipientId,
      userId: request.auth?.userId,
      canViewRecord: true,
    }),
  )
}

function gpsLocation(body: Record<string, unknown>, sharingExpiresAt: Date) {
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  if (body.consent !== true || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw Object.assign(new Error('請同意定位分享並提供有效的經緯度'), { statusCode: 400 })
  }
  return {
    latitude,
    longitude,
    address: typeof body.address === 'string' ? body.address : undefined,
    accuracyMeters: Number.isFinite(Number(body.accuracyMeters)) ? Number(body.accuracyMeters) : undefined,
    sharingExpiresAt,
    updatedAt: new Date(),
  }
}

function hideExpiredLocation<T extends { get(path: string): unknown; set(path: string, value: unknown): unknown }>(booking: T): T {
  const expiresAt = booking.get('latestLocation.sharingExpiresAt')
  if (expiresAt && new Date(String(expiresAt)) <= new Date()) booking.set('latestLocation', undefined)
  return booking
}

// GET /bookings：依登入角色自動篩選與自己有關的預約。
bookingRoutes.get(
  '/',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    let filter: Record<string, unknown> = {}
    if (request.auth?.role === 'NURSE') {
      const profile = await CaregiverProfile.findOne({ userId: request.auth.userId })
      filter = { $or: [{ caregiverId: profile?._id }, { requesterUserId: request.auth.userId }] }
    } else if (request.auth?.role === 'PATIENT') {
      const recipient = await CareRecipient.findOne({ accountUserId: request.auth.userId })
      filter = { recipientId: recipient?._id }
    } else if (request.auth?.role === 'USER') {
      filter = { requesterUserId: request.auth.userId }
    }
    const bookings = await Booking.find({ ...filter, hidden: { $ne: true } })
        .populate('recipientId')
        .populate({ path: 'caregiverId', populate: { path: 'userId', select: 'name' } })
        .populate('serviceTypeIds')
        .sort({ scheduledStartAt: -1 })
    response.json(bookings.map(hideExpiredLocation))
  }),
)

// POST /bookings：使用者指定居服員與可服務時段提出預約；同一時段只允許成功一次。
bookingRoutes.post(
  '/',
  authorize('USER', 'PATIENT', 'NURSE', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const { availabilityId, recipientId, serviceTypeIds, serviceAddress, specialRequirements } = await bookingCreateSchema.validate(request.body, { abortEarly: false, stripUnknown: true })
    if (recipientId) {
      const ownsRecipient = await CareRecipient.exists({ _id: recipientId, accountUserId: request.auth?.userId })
      const relation = await UserRecipientRelation.exists({ recipientId, userId: request.auth?.userId, canBookService: true, status: 'ACTIVE' })
      if (!ownsRecipient && !relation && request.auth?.role !== 'ADMIN') {
        response.status(403).json({ message: '您沒有為這位受照護者預約的權限' })
        return
      }
    }
    const [caregiverId, dateText, startTime, endTime] = String(availabilityId).split('|')
    if (!caregiverId || !dateText || !startTime || !endTime) {
      response.status(409).json({ message: '這個時段剛被預約或已不開放，請重新選擇' })
      return
    }
    const date = new Date(`${dateText}T00:00:00.000Z`)
    if ([0, 6].includes(taipeiWeekday(dateText))) {
      response.status(409).json({ message: '這個時段剛被預約或已不開放，請重新選擇' })
      return
    }
    const blocked = await Availability.exists({ caregiverId, date: { $gte: date, $lt: new Date(date.getTime() + 86_400_000) }, status: { $in: ['LEAVE', 'UNAVAILABLE'] }, hidden: { $ne: true } })
    if (blocked) { response.status(409).json({ message: '這位居服員當日休假或暫停服務' }); return }
    let createdRequestId: Types.ObjectId | undefined
    try {
      const approvedCaregiver = await CaregiverProfile.exists({
        _id: caregiverId, verificationStatus: 'APPROVED', active: true,
      })
      if (!approvedCaregiver) throw new Error('這位居服員目前未開放預約')
      const types = await ServiceType.find({ _id: { $in: serviceTypeIds }, active: true, hidden: { $ne: true } })
      if (types.length !== serviceTypeIds.length) throw new Error('服務項目不存在或已停用')
      const scheduledStartAt = taipeiDateTimeToUtc(dateText, startTime)
      const scheduledEndAt = taipeiDateTimeToUtc(dateText, endTime)
      if (scheduledStartAt <= new Date() || scheduledEndAt <= scheduledStartAt || startTime < '09:00' || endTime > '17:00') throw Object.assign(new Error('請選擇未來週一至週五 09:00–17:00 的有效時段'), { statusCode: 400 })
      const overlaps = await Booking.exists({
        caregiverId, hidden: { $ne: true },
        status: { $nin: NON_BLOCKING_BOOKING_STATUSES },
        scheduledStartAt: { $lt: scheduledEndAt }, scheduledEndAt: { $gt: scheduledStartAt },
      })
      if (overlaps) throw new Error('這位居服員在此時段已有其他服務')
      const serviceRequest = await ServiceRequest.create({
        requesterUserId: request.auth?.userId, recipientId: recipientId || undefined, serviceTypeIds,
        preferredDate: scheduledStartAt, preferredStartTime: startTime,
        estimatedDuration: Math.max(0, (scheduledEndAt.getTime() - scheduledStartAt.getTime()) / 60000),
        serviceAddress, specialRequirements, status: 'MATCHED',
      })
      createdRequestId = serviceRequest._id
      const booking = await Booking.create({
        bookingNumber: `BK${Date.now()}`, serviceRequestId: serviceRequest._id,
        requesterUserId: request.auth?.userId, recipientId: recipientId || undefined,
        caregiverId, serviceTypeIds, scheduledStartAt, scheduledEndAt,
        serviceAddress, status: 'PENDING',
      })
      await emitBookingRealtime(booking.id)
      response.status(201).json(booking)
    } catch (error) {
      if (createdRequestId) await ServiceRequest.findByIdAndDelete(createdRequestId)
      throw error
    }
  }),
)

// GET /bookings/:id：populate 將受照護者、居服員與服務 ID 展開成完整資料。
bookingRoutes.get(
  '/:id',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const booking = await Booking.findOne({ _id: request.params.id, hidden: { $ne: true } })
      .populate('recipientId')
      .populate({ path: 'caregiverId', populate: { path: 'userId', select: 'name phone' } })
      .populate('serviceTypeIds')
    if (!booking || !(await canView(request, booking))) {
      response
        .status(booking ? 403 : 404)
        .json({ message: booking ? '無權查看此預約' : '找不到預約' })
      return
    }
    response.json(hideExpiredLocation(booking))
  }),
)

// POST /bookings/:id/accept：指定的居服員核對案主資料後承接任務。
bookingRoutes.post(
  '/:id/accept',
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await CaregiverProfile.findOne({ userId: request.auth?.userId })
    const booking = await Booking.findOneAndUpdate(
      { _id: request.params.id, caregiverId: profile?._id, status: 'PENDING', hidden: { $ne: true } },
      { status: 'ACCEPTED', acceptedAt: new Date() },
      { new: true, runValidators: true },
    )
    if (!booking) {
      response.status(409).json({ message: '這筆任務已被處理或不屬於目前登入的居服員' })
      return
    }
    await Notification.create({
      recipientUserId: booking.get('requesterUserId'),
      type: 'BOOKING',
      title: '居服員已確認任務',
      message: '您的安心照護預約已由居服員確認。',
      bookingId: booking._id,
    })
    response.json(booking)
  }),
)

// PATCH、DELETE 預約保留給 ADMIN，避免一般使用者任意跳過合法狀態流程。
bookingRoutes.patch(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (request, response) => {
    response.json(
      await Booking.findByIdAndUpdate(request.params.id, request.body, {
        new: true,
        runValidators: true,
      }),
    )
  }),
)

bookingRoutes.delete(
  '/:id',
  authorize('USER', 'PATIENT', 'NURSE', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const booking = await Booking.findById(request.params.id)
    if (!booking || !(await canView(request, booking))) {
      response.status(booking ? 403 : 404).json({ message: booking ? '無權隱藏此預約' : '找不到預約' })
      return
    }
    await Booking.findByIdAndUpdate(booking._id, {
      hidden: true,
      hiddenAt: new Date(),
      hiddenByUserId: request.auth?.userId,
    })
    response.status(204).send()
  }),
)

// POST /bookings/:id/depart：NURSE 宣告出發並提交初始位置、距離與 ETA。
bookingRoutes.post(
  '/:id/depart',
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await CaregiverProfile.findOne({ userId: request.auth?.userId })
    const booking = await Booking.findOne({ _id: request.params.id, caregiverId: profile?._id })
    if (!booking) { response.status(404).json({ message: '找不到工作任務' }); return }
    if (booking.get('status') !== 'ACCEPTED') {
      response.status(409).json({ message: '只有已確認的任務才能開始前往與分享位置' })
      return
    }
    const sharingExpiresAt = new Date(new Date(booking.get('scheduledEndAt') || Date.now()).getTime() + 2 * 60 * 60 * 1000)
    const location = gpsLocation(request.body.location || {}, sharingExpiresAt)
    const update = {
      status: 'DEPARTED',
      departedAt: new Date(),
      estimatedArrivalAt: request.body.estimatedArrivalAt,
      estimatedDurationMin: request.body.estimatedDurationMin,
      estimatedDistanceKm: request.body.estimatedDistanceKm,
      latestLocation: location,
    }
    const updated = await Booking.findOneAndUpdate(
      { _id: request.params.id, caregiverId: profile?._id, status: 'ACCEPTED' },
      update,
      { new: true },
    )
    if (!updated) { response.status(409).json({ message: '任務狀態已變更，請重新整理' }); return }
    await CaregiverProfile.findByIdAndUpdate(profile?._id, { currentLocation: location })
    await Notification.create({ recipientUserId: updated.get('requesterUserId'), type: 'BOOKING', title: '居服員已出發', message: '居服員正在前往您的服務地點。', bookingId: updated._id })
    response.json(updated)
  }),
)

// PATCH /bookings/:id/location：NURSE 定期更新 GPS，USER/PATIENT 查預約即可看到最新位置。
bookingRoutes.patch(
  '/:id/location',
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await CaregiverProfile.findOne({ userId: request.auth?.userId })
    const booking = await Booking.findOne({ _id: request.params.id, caregiverId: profile?._id })
    if (!booking) { response.status(404).json({ message: '找不到工作任務' }); return }
    const sharingExpiresAt = new Date(new Date(booking.get('scheduledEndAt') || Date.now()).getTime() + 2 * 60 * 60 * 1000)
    const location = gpsLocation(request.body, sharingExpiresAt)
    const updated = await Booking.findOneAndUpdate(
      {
        _id: request.params.id,
        caregiverId: profile?._id,
        status: { $in: [...LOCATION_SHARING_STATUSES] },
      },
      { latestLocation: location, estimatedArrivalAt: request.body.estimatedArrivalAt },
      { new: true },
    )
    if (!updated) {
      response.status(409).json({ message: '目前任務狀態不允許分享位置' })
      return
    }
    // 通過任務狀態檢查後，才保存居服員的全域最新位置。
    await CaregiverProfile.findByIdAndUpdate(profile?._id, { currentLocation: location })
    response.json(updated)
  }),
)

// POST /bookings/:id/location/stop：居服員可隨時停止分享；任務結束時也會自動清除。
bookingRoutes.post(
  '/:id/location/stop',
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await CaregiverProfile.findOne({ userId: request.auth?.userId })
    await CaregiverProfile.findByIdAndUpdate(profile?._id, { $unset: { currentLocation: 1 } })
    const booking = await Booking.findOneAndUpdate(
      { _id: request.params.id, caregiverId: profile?._id },
      { $unset: { latestLocation: 1 }, locationSharingStoppedAt: new Date() },
      { new: true },
    )
    if (!booking) { response.status(404).json({ message: '找不到工作任務' }); return }
    response.json(booking)
  }),
)

// POST /bookings/:id/arrive：更新為已抵達，並記錄抵達時間與座標。
bookingRoutes.post(
  '/:id/arrive',
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await CaregiverProfile.findOne({ userId: request.auth?.userId })
    const booking = await Booking.findOneAndUpdate(
      { _id: request.params.id, caregiverId: profile?._id, status: 'DEPARTED' },
      {
        status: 'ARRIVED',
        arrivedAt: new Date(),
        latestLocation: request.body.location
          ? gpsLocation(request.body.location, new Date(Date.now() + 2 * 60 * 60 * 1000))
          : undefined,
      },
      { new: true },
    )
    if (!booking) { response.status(409).json({ message: '只有前往中的任務可以回報抵達' }); return }
    await Notification.create({ recipientUserId: booking.get('requesterUserId'), type: 'BOOKING', title: '居服員已抵達', message: '居服員已抵達服務地點並完成打卡。', bookingId: booking._id })
    response.json(booking)
  }),
)

// POST /bookings/:id/injuries：服務前/中/後上傳傷況或負面場景證據。
bookingRoutes.post(
  '/:id/injuries',
  upload.array('photos', 6),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const booking = await Booking.findById(request.params.id)
    if (!booking || !(await canView(request, booking))) {
      response.status(403).json({ message: '無權新增此外傷紀錄' })
      return
    }
    const files = request.files as Express.Multer.File[] | undefined
    if (!files?.length) {
      response.status(400).json({ message: '至少上傳一張 photos 圖片' })
      return
    }
    const report = await InjuryReport.create({
      bookingId: booking._id,
      recipientId: booking.get('recipientId'),
      reportedByUserId: request.auth?.userId,
      stage: request.body.stage || 'BEFORE_SERVICE',
      hasInjury: request.body.hasInjury === 'true',
      hasNegativeScene: request.body.hasNegativeScene === 'true',
      description: request.body.description,
      photoUrls: files.map((file) => `/uploads/${file.filename}`),
    })
    // 有異常就暫停在 WAITING_DECISION，不能直接開始服務。
    if (report.get('hasInjury') || report.get('hasNegativeScene')) {
      booking.set('status', 'WAITING_DECISION')
      await booking.save()
    }
    response.status(201).json(report)
  }),
)

// GET /bookings/:id/injuries：取得此案件所有傷況歷史。
bookingRoutes.get(
  '/:id/injuries',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const booking = await Booking.findById(request.params.id)
    if (!booking || !(await canView(request, booking))) {
      response.status(403).json({ message: '無權查看外傷紀錄' })
      return
    }
    response.json(await InjuryReport.find({ bookingId: booking._id }).sort({ createdAt: -1 }))
  }),
)

// PATCH .../decision：只有下單 USER 或 ADMIN 能判斷繼續或取消。
bookingRoutes.patch(
  '/:id/injuries/:reportId/decision',
  authorize('USER', 'PATIENT', 'NURSE', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const booking = await Booking.findById(request.params.id)
    if (
      !booking ||
      (request.auth?.role !== 'ADMIN' &&
        booking.get('requesterUserId').toString() !== request.auth?.userId)
    ) {
      response.status(403).json({ message: '只有下單者或管理員可以決定是否繼續' })
      return
    }
    const decision = request.body.decision
    if (!['CONTINUE', 'CANCEL'].includes(decision)) {
      response.status(400).json({ message: 'decision 必須為 CONTINUE 或 CANCEL' })
      return
    }
    const report = await InjuryReport.findOneAndUpdate(
      { _id: request.params.reportId, bookingId: booking._id },
      { decision, decidedByUserId: request.auth?.userId, decidedAt: new Date() },
      { new: true },
    )
    // CONTINUE 回到 ARRIVED，仍需由 NURSE 明確呼叫 /start；CANCEL 則終止案件。
    booking.set(
      decision === 'CONTINUE'
        ? { status: 'ARRIVED' }
        : {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: '外傷／負面場景判定取消',
          },
    )
    await booking.save()
    response.json({ report, booking })
  }),
)

// POST /bookings/:id/start：只允許承接者從 ARRIVED 進入 IN_SERVICE。
bookingRoutes.post(
  '/:id/start',
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await CaregiverProfile.findOne({ userId: request.auth?.userId })
    const booking = await Booking.findOneAndUpdate(
      { _id: request.params.id, caregiverId: profile?._id, status: 'ARRIVED' },
      {
        $set: { status: 'IN_SERVICE', serviceStartedAt: new Date() },
        $unset: { latestLocation: 1 },
      },
      { new: true },
    )
    if (!booking) { response.status(409).json({ message: '只有已抵達的任務可以開始服務' }); return }
    await CaregiverProfile.findByIdAndUpdate(profile?._id, { $unset: { currentLocation: 1 } })
    await Notification.create({ recipientUserId: booking.get('requesterUserId'), type: 'BOOKING', title: '照護服務已開始', message: '居服員已開始執行本次照護服務。', bookingId: booking._id })
    response.json(booking)
  }),
)

// 居服員只能提出完成；保留舊 /complete 路徑相容既有前端。
bookingRoutes.post(
  ['/:id/request-completion', '/:id/complete'],
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await CaregiverProfile.findOne({ userId: request.auth?.userId })
    const booking = await Booking.findOneAndUpdate(
      { _id: request.params.id, caregiverId: profile?._id, hidden: { $ne: true }, status: 'IN_SERVICE' },
      { status: 'AWAITING_USER_CONFIRMATION', completionRequestedAt: new Date(), $unset: { latestLocation: 1 } },
      { new: true },
    )
    if (!booking) {
      response.status(409).json({ message: '此任務目前無法提出完成，請重新整理確認狀態' })
      return
    }
    await Notification.create({
      recipientUserId: booking.get('requesterUserId'),
      type: 'BOOKING',
      title: '請確認本次照護服務',
      message: '居服員已提出完成，請核對後確認本次服務。',
      bookingId: booking._id,
    })
    await CaregiverProfile.findByIdAndUpdate(profile?._id, { $unset: { currentLocation: 1 } })
    response.json({ booking })
  }),
)

// 申請人／受照護者確認後才原子化結案並產生正式服務紀錄。
bookingRoutes.post(
  '/:id/confirm-completion',
  authorize('USER', 'PATIENT', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const current = await Booking.findById(request.params.id)
    if (!current || !(await canView(request, current))) {
      response.status(403).json({ message: '無權確認此預約' })
      return
    }
    if (!nextBookingCompletionStatus(String(current.get('status')), 'USER')) {
      response.status(409).json({ message: '居服員尚未提出完成，或此任務已經結案' })
      return
    }
    const completedAt = new Date()
    const booking = await Booking.findOneAndUpdate(
      { _id: current._id, status: 'AWAITING_USER_CONFIRMATION' },
      { status: 'COMPLETED', attendanceStatus: 'COMPLETED', completedAt, $unset: { latestLocation: 1 } },
      { new: true },
    )
    if (!booking) {
      response.status(409).json({ message: '任務狀態已更新，請重新整理後再確認' })
      return
    }
    await ServiceRequest.findByIdAndUpdate(booking.get('serviceRequestId'), { status: 'COMPLETED' })
    const caregiver = await CaregiverProfile.findById(booking.get('caregiverId'))
    if (caregiver) {
      await Notification.create({
        recipientUserId: caregiver.get('userId'),
        type: 'BOOKING',
        title: '使用者已確認完成',
        message: '本次照護服務已由雙方確認並正式結案。',
        bookingId: booking._id,
      })
    }
    const record = await ServiceRecord.findOneAndUpdate(
      { bookingId: booking._id },
      {
        bookingId: booking._id,
        recipientId: booking.get('recipientId'),
        caregiverId: booking.get('caregiverId'),
        completedItems: booking.get('serviceTypeIds') || [],
        notes: '使用者已確認本次服務完成。',
        startedAt: booking.get('serviceStartedAt'),
        completedAt,
      },
      { upsert: true, new: true },
    )
    response.json({ booking, record })
  }),
)

// POST /bookings/:id/abandon：NURSE 棄單並累加 abandonmentCount，供後續媒合與裁決使用。
bookingRoutes.post(
  '/:id/abandon',
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await CaregiverProfile.findOne({ userId: request.auth?.userId })
    const booking = await Booking.findOneAndUpdate(
      { _id: request.params.id, caregiverId: profile?._id },
      { status: 'ABANDONED', cancelledAt: new Date(), cancellationReason: request.body.reason, $unset: { latestLocation: 1 } },
      { new: true },
    )
    // $inc 是 MongoDB 原子累加，不需先讀取舊數字再寫回。
    if (booking)
      await CaregiverProfile.findByIdAndUpdate(profile?._id, { $inc: { abandonmentCount: 1 } })
    response.json(booking)
  }),
)

// POST /bookings/:id/cancel：案件參與者或 ADMIN 可提供原因取消預約。
bookingRoutes.post(
  '/:id/cancel',
  authorize('USER', 'PATIENT', 'NURSE', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const booking = await Booking.findById(request.params.id)
    if (!booking || !(await canView(request, booking))) {
      response.status(403).json({ message: '無權取消此預約' })
      return
    }
    if (['IN_SERVICE', 'AWAITING_USER_CONFIRMATION', 'COMPLETED', 'CANCELLED', 'ABANDONED'].includes(String(booking.get('status')))) {
      response.status(409).json({ message: '進行中、已完成或已取消的服務不能再次取消' })
      return
    }
    const reason = String(request.body.reason || '').trim()
    if (!reason) {
      response.status(400).json({ message: '請先選擇取消原因' })
      return
    }
    const refundEligible = isCancellationRefundEligible(
      String(booking.get('status')),
      new Date(booking.get('scheduledStartAt')),
    )
    booking.set({
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: reason,
      cancellationRefundEligible: refundEligible,
    })
    await booking.save()
    await CaregiverProfile.findByIdAndUpdate(booking.get('caregiverId'), { $unset: { currentLocation: 1 } })
    await ServiceRequest.findByIdAndUpdate(booking.get('serviceRequestId'), { status: 'CANCELLED' })
    const caregiver = await CaregiverProfile.findById(booking.get('caregiverId'))
    const recipients = [booking.get('requesterUserId'), caregiver?.get('userId')]
      .filter(Boolean)
      .filter((id) => String(id) !== request.auth?.userId)
    if (recipients.length) {
      await Notification.insertMany(
        recipients.map((recipientUserId) => ({
          recipientUserId,
          type: 'BOOKING',
          title: '照護預約已取消',
          message: `取消原因：${reason}`,
          bookingId: booking._id,
        })),
      )
    }
    response.json({ booking, refundEligible })
  }),
)

// 使用者改期後回到待確認，避免沿用居服員對舊時段的承諾。
bookingRoutes.patch(
  '/:id/reschedule',
  authorize('USER', 'PATIENT', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const booking = await Booking.findById(request.params.id)
    if (!booking || !(await canView(request, booking))) return void response.status(403).json({ message: '無權變更此預約' })
    if (!['PENDING', 'ACCEPTED'].includes(String(booking.get('status')))) return void response.status(409).json({ message: '只有待確認或已確認的任務可以變更時間' })
    const { date: dateText, startTime, endTime } = await bookingRescheduleSchema.validate(request.body, { abortEarly: false, stripUnknown: true })
    const scheduledStartAt = taipeiDateTimeToUtc(dateText, startTime), scheduledEndAt = taipeiDateTimeToUtc(dateText, endTime)
    if ([0, 6].includes(taipeiWeekday(dateText)) || scheduledStartAt <= new Date() || scheduledEndAt <= scheduledStartAt || startTime < '09:00' || endTime > '17:00') return void response.status(400).json({ message: '請選擇未來週一至週五 09:00–17:00 的有效時段' })
    const caregiverId = booking.get('caregiverId')
    const dayStart = new Date(`${dateText}T00:00:00.000Z`)
    const blocked = await Availability.exists({ caregiverId, date: { $gte: dayStart, $lt: new Date(dayStart.getTime() + 86_400_000) }, status: { $in: ['LEAVE', 'UNAVAILABLE'] }, hidden: { $ne: true } })
    const overlaps = await Booking.exists({ _id: { $ne: booking._id }, caregiverId, status: { $nin: NON_BLOCKING_BOOKING_STATUSES }, scheduledStartAt: { $lt: scheduledEndAt }, scheduledEndAt: { $gt: scheduledStartAt } })
    if (blocked || overlaps) return void response.status(409).json({ message: blocked ? '居服員這一天休假或暫停服務' : '居服員在此時段已有其他任務' })
    booking.set({ scheduledStartAt, scheduledEndAt, status: 'PENDING', acceptedAt: undefined })
    await booking.save()
    await ServiceRequest.findByIdAndUpdate(booking.get('serviceRequestId'), { preferredDate: scheduledStartAt, preferredStartTime: startTime, estimatedDuration: (scheduledEndAt.getTime() - scheduledStartAt.getTime()) / 60000, status: 'MATCHED' })
    const caregiver = await CaregiverProfile.findById(caregiverId)
    if (caregiver?.get('userId')) await Notification.create({ recipientUserId: caregiver.get('userId'), type: 'BOOKING', title: '照護預約時間已變更', message: '使用者已變更服務時間，請重新確認任務。', bookingId: booking._id })
    response.json(booking)
  }),
)
