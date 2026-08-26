import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth'
import type { AuthRequest } from '../types/auth'
import { asyncHandler } from '../utils/http'
import {
  LOCATION_SHARING_STATUSES,
} from '../utils/booking-policy'
import {
  Booking,
  Availability,
  CaregiverProfile,
  CareRecipient,
  InjuryReport,
  ServiceRequest,
  ServiceType,
  UserRecipientRelation,
} from '../models'
import { upload } from '../middlewares/upload'
import type { Types } from 'mongoose'
import { taipeiDateTimeToUtc, taipeiWeekday } from '../utils/datetime'
import { bookingCreateSchema, bookingRescheduleSchema } from '../utils/booking-validation'
import {
  abandonBooking,
  acceptBooking,
  arriveBooking,
  cancelBooking,
  confirmCompletion,
  departBooking,
  flagInjuryDecision,
  publishBookingChange,
  requestCompletion,
  rescheduleBooking,
  resolveInjuryDecision,
  startService,
  stopLocationSharing,
} from '../services/booking-workflow.service'

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
      await publishBookingChange(booking.id)
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
    response.json(await acceptBooking(String(request.params.id), request.auth!, request.get('x-request-id')))
  }),
)

// PATCH、DELETE 預約保留給 ADMIN，避免一般使用者任意跳過合法狀態流程。
bookingRoutes.patch(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (request, response) => {
    const allowed = ['estimatedDistanceKm', 'estimatedDurationMin', 'estimatedArrivalAt']
    const rejected = Object.keys(request.body || {}).filter((key) => !allowed.includes(key))
    if (rejected.length) {
      response.status(422).json({ code: 'BUSINESS_RULE_VIOLATION', message: `此路徑不可修改工作流程欄位：${rejected.join('、')}` })
      return
    }
    const update = Object.fromEntries(allowed.filter((key) => key in request.body).map((key) => [key, request.body[key]]))
    const booking = await Booking.findByIdAndUpdate(request.params.id, update, { new: true, runValidators: true })
    if (!booking) { response.status(404).json({ code: 'NOT_FOUND', message: '找不到預約' }); return }
    await publishBookingChange(String(booking._id))
    response.json(booking)
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
    await publishBookingChange(String(booking._id))
    response.status(204).send()
  }),
)

// POST /bookings/:id/depart：NURSE 宣告出發並提交初始位置、距離與 ETA。
bookingRoutes.post(
  '/:id/depart',
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const booking = await Booking.findById(request.params.id)
    if (!booking) { response.status(404).json({ message: '找不到工作任務' }); return }
    const sharingExpiresAt = new Date(new Date(booking.get('scheduledEndAt') || Date.now()).getTime() + 2 * 60 * 60 * 1000)
    const location = gpsLocation(request.body.location || {}, sharingExpiresAt)
    const update = {
      estimatedArrivalAt: request.body.estimatedArrivalAt,
      estimatedDurationMin: request.body.estimatedDurationMin,
      estimatedDistanceKm: request.body.estimatedDistanceKm,
      latestLocation: location,
    }
    response.json(await departBooking(String(request.params.id), request.auth!, update, request.get('x-request-id')))
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
    await publishBookingChange(String(updated._id), 'location:changed')
    response.json(updated)
  }),
)

// POST /bookings/:id/location/stop：居服員可隨時停止分享；任務結束時也會自動清除。
bookingRoutes.post(
  '/:id/location/stop',
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    response.json(await stopLocationSharing(String(request.params.id), request.auth!, request.get('x-request-id')))
  }),
)

// POST /bookings/:id/arrive：更新為已抵達，並記錄抵達時間與座標。
bookingRoutes.post(
  '/:id/arrive',
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const location = request.body.location
      ? gpsLocation(request.body.location, new Date(Date.now() + 2 * 60 * 60 * 1000))
      : undefined
    response.json(await arriveBooking(String(request.params.id), request.auth!, location, request.get('x-request-id')))
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
      try {
        await flagInjuryDecision(String(booking._id), request.auth!, request.get('x-request-id'))
      } catch (error) {
        await InjuryReport.findByIdAndDelete(report._id)
        throw error
      }
    } else await publishBookingChange(String(booking._id))
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
  authorize('USER', 'PATIENT', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const decision = request.body.decision
    if (!['CONTINUE', 'CANCEL'].includes(decision)) {
      response.status(400).json({ message: 'decision 必須為 CONTINUE 或 CANCEL' })
      return
    }
    response.json(await resolveInjuryDecision(String(request.params.id), String(request.params.reportId), decision, request.auth!, request.get('x-request-id')))
  }),
)

// POST /bookings/:id/start：只允許承接者從 ARRIVED 進入 IN_SERVICE。
bookingRoutes.post(
  '/:id/start',
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    response.json(await startService(String(request.params.id), request.auth!, request.get('x-request-id')))
  }),
)

// 居服員只能提出完成；保留舊 /complete 路徑相容既有前端。
bookingRoutes.post(
  ['/:id/request-completion', '/:id/complete'],
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const booking = await requestCompletion(String(request.params.id), request.auth!, request.get('x-request-id'))
    response.json({ booking })
  }),
)

// 申請人／受照護者確認後才原子化結案並產生正式服務紀錄。
bookingRoutes.post(
  '/:id/confirm-completion',
  authorize('USER', 'PATIENT', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    response.json(await confirmCompletion(String(request.params.id), request.auth!, request.get('x-request-id')))
  }),
)

// POST /bookings/:id/abandon：NURSE 棄單並累加 abandonmentCount，供後續媒合與裁決使用。
bookingRoutes.post(
  '/:id/abandon',
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    response.json(await abandonBooking(String(request.params.id), request.body.reason, request.auth!, request.get('x-request-id')))
  }),
)

// POST /bookings/:id/cancel：案件參與者或 ADMIN 可提供原因取消預約。
bookingRoutes.post(
  '/:id/cancel',
  authorize('USER', 'PATIENT', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const reason = String(request.body.reason || '').trim()
    if (!reason) {
      response.status(400).json({ message: '請先選擇取消原因' })
      return
    }
    response.json(await cancelBooking(String(request.params.id), reason, request.auth!, request.get('x-request-id')))
  }),
)

// 使用者改期後回到待確認，避免沿用居服員對舊時段的承諾。
bookingRoutes.patch(
  '/:id/reschedule',
  authorize('USER', 'PATIENT', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const { date: dateText, startTime, endTime } = await bookingRescheduleSchema.validate(request.body, { abortEarly: false, stripUnknown: true })
    const scheduledStartAt = taipeiDateTimeToUtc(dateText, startTime), scheduledEndAt = taipeiDateTimeToUtc(dateText, endTime)
    if ([0, 6].includes(taipeiWeekday(dateText)) || scheduledStartAt <= new Date() || scheduledEndAt <= scheduledStartAt || startTime < '09:00' || endTime > '17:00') return void response.status(400).json({ message: '請選擇未來週一至週五 09:00–17:00 的有效時段' })
    const dayStart = new Date(`${dateText}T00:00:00.000Z`)
    response.json(await rescheduleBooking(String(request.params.id), request.auth!, { scheduledStartAt, scheduledEndAt, startTime, dayStart }, request.get('x-request-id')))
  }),
)
