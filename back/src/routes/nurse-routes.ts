import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth'
import type { AuthRequest } from '../types/auth'
import { asyncHandler } from '../utils/http'
import { Availability, CaregiverProfile } from '../models'
import { CaregiverCredential } from '../models/caregiver-credential'
import { upload } from '../middlewares/upload'
import { recordAudit } from '../utils/audit'
import { Booking, Review, User } from '../models'
import { Complaint } from '../models/complaint'
import { CaregiverLeaveRequest, CaregiverWorkJournal } from '../models/caregiver-work'
import * as yup from 'yup'
import { taipeiDateKey, taipeiDateTimeToUtc, taipeiDayStartUtc, taipeiWeekday } from '../utils/datetime'
import { BLOCKING_BOOKING_STATUSES, findApprovedLeaveConflict, findBookingConflict, findPendingLeaveConflict, intervalsOverlap } from '../utils/availability-policy'
import { Notification } from '../models/notification'
import { emitLeaveRealtime } from '../realtime'

export const nurseRoutes = Router()

const optionalText = (label: string, max: number) =>
  yup.string().typeError(`${label}格式錯誤`).trim().max(max, `${label}內容過長`).optional()

const profileUpdateSchema = yup
  .object({
    name: yup.string().trim().min(1, '姓名不可留白').max(50, '姓名內容過長').optional(),
    phone: optionalText('電話', 30),
    email: yup
      .string()
      .transform((value) => (value === '' ? undefined : value))
      .trim()
      .email('電子信箱格式錯誤')
      .max(254)
      .optional(),
    introduction: optionalText('自我介紹', 2000),
    yearsExperience: yup.number().integer().min(0).max(80).optional(),
    serviceAreas: yup.array(yup.string().trim().max(100)).max(30).optional(),
    transportation: optionalText('交通方式', 100),
  })
  .noUnknown()

const journalSchema = yup
  .object({
    bookingId: yup
      .string()
      .matches(/^[a-f\d]{24}$/i, '預約編號格式錯誤')
      .optional(),
    title: yup.string().trim().required('日誌標題為必填').max(100),
    content: yup.string().trim().required('日誌內容為必填').max(3000),
    mood: yup.string().oneOf(['STEADY', 'TIRED', 'WORRIED', 'FULFILLED']).default('STEADY'),
    occurredAt: yup.date().typeError('紀錄日期格式錯誤').required('紀錄日期為必填'),
    followUpRequired: yup.boolean().default(false),
  })
  .noUnknown()

const leaveSchema = yup
  .object({
    startAt: yup.date().typeError('請假開始時間格式錯誤').required('請假開始時間為必填'),
    endAt: yup
      .date()
      .typeError('請假結束時間格式錯誤')
      .min(yup.ref('startAt'), '請假結束時間必須晚於開始時間')
      .required('請假結束時間為必填'),
    leaveType: yup.string().oneOf(['PERSONAL', 'SICK', 'FAMILY', 'OTHER']).required(),
    reason: yup.string().trim().required('請假原因為必填').max(1000),
  })
  .noUnknown()

async function ownProfile(request: AuthRequest) {
  return CaregiverProfile.findOne({ userId: request.auth?.userId })
}

// GET /nurses/me/dashboard：一次取得工作台首屏需要的摘要，減少前端重複請求。
nurseRoutes.get(
  '/me/dashboard',
  authenticate,
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await ownProfile(request)
    if (!profile) {
      response.status(404).json({ message: '找不到居服員資料' })
      return
    }
    const now = new Date()
    const [user, credentials, bookings, journals, leaves, complaints, receivedReviews] =
      await Promise.all([
        User.findById(request.auth?.userId).select('name phone email account'),
        CaregiverCredential.find({ caregiverId: profile._id }).sort({ createdAt: -1 }),
        Booking.find({ caregiverId: profile._id, hidden: { $ne: true } })
          .populate(
            'recipientId',
            'name careLevel mobilityStatus heightCm weightKg profilePhotoUrls healthNotes allergyNotes specialRequirements',
          )
          .populate('requesterUserId', 'name role account phone')
          .populate('serviceTypeIds', 'name durationMinutes')
          .sort({ scheduledStartAt: 1 })
          .limit(30),
        CaregiverWorkJournal.find({ caregiverId: profile._id, hidden: { $ne: true } })
          .sort({ occurredAt: -1 })
          .limit(20),
        CaregiverLeaveRequest.find({ caregiverId: profile._id, hidden: { $ne: true } })
          .sort({ startAt: -1 })
          .limit(20),
        Complaint.find({ complainantUserId: request.auth?.userId })
          .populate('replies.authorUserId', 'name role')
          .sort({ createdAt: -1 })
          .limit(20),
        Review.find({ targetUserId: request.auth?.userId, hidden: { $ne: true } })
          .sort({ createdAt: -1 })
          .limit(20),
      ])
    response.json({
      user,
      profile,
      credentials,
      bookings,
      journals,
      leaves,
      complaints,
      receivedReviews,
      summary: {
        upcomingBookings: bookings.filter(
          (item) =>
            item.get('scheduledStartAt') >= now &&
            !['COMPLETED', 'CANCELLED'].includes(item.get('status')),
        ).length,
        completedBookings: bookings.filter((item) => item.get('status') === 'COMPLETED').length,
        pendingLeaves: leaves.filter((item) => item.get('status') === 'PENDING').length,
        pendingReports: complaints.filter((item) =>
          ['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'UNDER_REVIEW', 'NEED_MORE_INFORMATION', 'RESOLVED'].includes(item.get('status')),
        ).length,
      },
    })
  }),
)

// GET /nurses/me/profile：姓名與電話來自帳號，專業資料來自 CaregiverProfile。
nurseRoutes.get(
  '/me/profile',
  authenticate,
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const [user, profile] = await Promise.all([
      User.findById(request.auth?.userId).select('account name phone email'),
      ownProfile(request),
    ])
    response.json({ user, profile })
  }),
)

// GET /nurses：公開媒合頁只能看到已核准且啟用的居服員，避免洩漏待審資料。
nurseRoutes.get(
  '/',
  asyncHandler(async (request, response) => {
    response.json(
      await CaregiverProfile.find({ verificationStatus: 'APPROVED', active: true })
        .populate('userId', 'name phone email')
        .populate('serviceTypeIds'),
    )
  }),
)

// GET /nurses/:id：取得單一公開居服員資料，populate 將參照 ID 換成可閱讀內容。
nurseRoutes.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const nurse = await CaregiverProfile.findOne({
      _id: request.params.id,
      verificationStatus: 'APPROVED',
      active: true,
    })
      .populate('userId', 'name phone email')
      .populate('serviceTypeIds')
    if (!nurse) {
      response.status(404).json({ message: '找不到 Nurse' })
      return
    }
    response.json(nurse)
  }),
)

// PATCH /nurses/me/profile：居服員修改自己的介紹，但不可自行改審核、評分或棄單紀錄。
nurseRoutes.patch(
  '/me/profile',
  authenticate,
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const input = await profileUpdateSchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })
    const { name, phone, email, ...profileUpdate } = input
    const [user, profile] = await Promise.all([
      User.findByIdAndUpdate(
        request.auth?.userId,
        { name, phone, email },
        { new: true, runValidators: true },
      ),
      CaregiverProfile.findOneAndUpdate({ userId: request.auth?.userId }, profileUpdate, {
        new: true,
        runValidators: true,
      }),
    ])
    response.json({ user, profile })
  }),
)

// 工作日誌 CRUD；DELETE 只隱藏，保留未來稽核與服務爭議查詢能力。
nurseRoutes.get(
  '/me/journals',
  authenticate,
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await ownProfile(request)
    response.json(
      await CaregiverWorkJournal.find({ caregiverId: profile?._id, hidden: { $ne: true } }).sort({
        occurredAt: -1,
      }),
    )
  }),
)

nurseRoutes.post(
  '/me/journals',
  authenticate,
  authorize('NURSE'),
  upload.array('photos', 3),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await ownProfile(request)
    const input = await journalSchema.validate(
      { ...request.body, followUpRequired: request.body.followUpRequired === 'true' },
      { abortEarly: false, stripUnknown: true },
    )
    const files = (request.files as Express.Multer.File[] | undefined) || []
    response.status(201).json(
      await CaregiverWorkJournal.create({
        ...input,
        caregiverId: profile?._id,
        photoUrls: files.map((file) => `/uploads/${file.filename}`),
      }),
    )
  }),
)

nurseRoutes.patch(
  '/me/journals/:journalId',
  authenticate,
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await ownProfile(request)
    const input = await journalSchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })
    response.json(
      await CaregiverWorkJournal.findOneAndUpdate(
        { _id: request.params.journalId, caregiverId: profile?._id, hidden: { $ne: true } },
        input,
        { new: true, runValidators: true },
      ),
    )
  }),
)

nurseRoutes.delete(
  '/me/journals/:journalId',
  authenticate,
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await ownProfile(request)
    await CaregiverWorkJournal.findOneAndUpdate(
      { _id: request.params.journalId, caregiverId: profile?._id },
      { hidden: true, hiddenAt: new Date() },
    )
    response.status(204).send()
  }),
)

// 請假申請：居服員可新增、查看與撤回待審申請；管理員審核日後可沿用此 Collection。
nurseRoutes.get(
  '/me/leaves',
  authenticate,
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await ownProfile(request)
    response.json(
      await CaregiverLeaveRequest.find({ caregiverId: profile?._id, hidden: { $ne: true } }).sort({
        startAt: -1,
      }),
    )
  }),
)

nurseRoutes.post(
  '/me/leaves',
  authenticate,
  authorize('NURSE'),
  upload.single('proof'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await ownProfile(request)
    if (!profile) {
      response.status(404).json({ message: '找不到居服員資料' })
      return
    }
    const input = await leaveSchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })
    if (input.startAt >= input.endAt) {
      response.status(400).json({ message: '請假結束時間必須晚於開始時間' })
      return
    }
    if (input.endAt <= new Date()) {
      response.status(400).json({ message: '不能申請已結束的過去時段' })
      return
    }
    if (input.leaveType === 'SICK' && !request.file) {
      response.status(400).json({ message: '病假請上傳假單或診斷證明。' })
      return
    }
    const duplicate = await Promise.all([
      findPendingLeaveConflict(profile._id, input.startAt, input.endAt),
      findApprovedLeaveConflict(profile._id, input.startAt, input.endAt),
    ])
    if (duplicate.some(Boolean)) {
      response.status(409).json({ code: 'LEAVE_CONFLICT', message: '此時段已有待審或已核准的請假' })
      return
    }
    const leave = await CaregiverLeaveRequest.create({
        ...input,
        caregiverId: profile._id,
        proofFileUrl: request.file ? `/uploads/${request.file.filename}` : undefined,
      })
    const bookingConflicts = await findBookingConflict(profile._id, input.startAt, input.endAt)
    await Promise.all([
      recordAudit(request, 'CAREGIVER_LEAVE_SUBMITTED', 'caregiverleaverequests', String(leave._id), undefined, leave.toObject()),
      Notification.insertMany((await User.find({ role: 'ADMIN', status: 'ACTIVE' }).select('_id')).map((admin) => ({ recipientUserId: admin._id, type: 'SYSTEM', title: '有新的居服員請假待審核', message: bookingConflicts.length ? '此申請與既有照護任務重疊，請優先處理。' : '請前往管理頁確認請假時段。' }))),
      emitLeaveRealtime(profile._id),
    ])
    response.status(201).json({ ...leave.toObject(), hasBookingConflict: bookingConflicts.length > 0 })
  }),
)

nurseRoutes.patch(
  '/me/leaves/:leaveId/cancel',
  authenticate,
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await ownProfile(request)
    const leave = await CaregiverLeaveRequest.findOneAndUpdate(
      { _id: request.params.leaveId, caregiverId: profile?._id, status: 'PENDING' },
      { status: 'CANCELLED' },
      { new: true },
    )
    if (leave) await Promise.all([
      recordAudit(request, 'CAREGIVER_LEAVE_CANCELLED', 'caregiverleaverequests', String(leave._id), { status: 'PENDING' }, leave.toObject()),
      emitLeaveRealtime(profile?._id),
    ])
    response.status(leave ? 200 : 409).json(leave || { message: '只有待審中的請假可以撤回' })
  }),
)

// POST /nurses/me/availability：只記錄主動暫停服務；正式請假必須走 Leave 審核。
nurseRoutes.post(
  '/me/availability',
  authenticate,
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await CaregiverProfile.findOne({ userId: request.auth?.userId })
    if (!profile) {
      response.status(404).json({ message: '找不到 Nurse 資料' })
      return
    }
    const dateText = String(request.body.date || '')
    const date = new Date(`${dateText}T00:00:00.000Z`)
    if ([0, 6].includes(taipeiWeekday(dateText))) {
      response.status(400).json({ message: '週六、週日原本就不開放預約，不需要另外安排休假' })
      return
    }
    if (request.body.status !== 'UNAVAILABLE') {
      response.status(400).json({ message: '正式請假請使用安心請假提出申請' })
      return
    }
    response.status(201).json(
      await Availability.create({
        caregiverId: profile._id,
        date,
        startTime: '09:00',
        endTime: '17:00',
        status: 'UNAVAILABLE',
      }),
    )
  }),
)

// GET /nurses/me/availability：取得本人時段，依日期與開始時間排序。
nurseRoutes.get(
  '/me/availability',
  authenticate,
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await CaregiverProfile.findOne({ userId: request.auth?.userId })
    response.json(
      await Availability.find({
        caregiverId: profile?._id,
        hidden: { $ne: true },
      }).sort({ date: 1, startTime: 1 }),
    )
  }),
)

// PATCH /nurses/availability/:id：條件同時包含 caregiverId，避免修改別人的時段。
nurseRoutes.patch(
  '/availability/:availabilityId',
  authenticate,
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await CaregiverProfile.findOne({ userId: request.auth?.userId })
    response.json(
      await Availability.findOneAndUpdate(
        { _id: request.params.availabilityId, caregiverId: profile?._id },
        {
          ...request.body,
          ...(request.body.date
            ? { date: new Date(`${String(request.body.date)}T00:00:00.000Z`) }
            : {}),
        },
        { new: true, runValidators: true },
      ),
    )
  }),
)

// DELETE /nurses/availability/:id：將時段隱藏，不實體刪除。
nurseRoutes.delete(
  '/availability/:availabilityId',
  authenticate,
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await CaregiverProfile.findOne({ userId: request.auth?.userId })
    await Availability.findOneAndUpdate(
      {
        _id: request.params.availabilityId,
        caregiverId: profile?._id,
      },
      {
        status: 'UNAVAILABLE',
        hidden: true,
        hiddenAt: new Date(),
        hiddenByUserId: request.auth?.userId,
      },
    )
    response.status(204).send()
  }),
)

// POST /nurses/me/credentials：NURSE 新增政府證照或技能證明，需上傳證明檔。
nurseRoutes.post(
  '/me/credentials',
  authenticate,
  authorize('NURSE'),
  upload.single('file'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await CaregiverProfile.findOne({ userId: request.auth?.userId })
    if (!profile || !request.file || !['CERTIFICATE', 'SKILL'].includes(request.body.kind)) {
      response.status(400).json({ message: 'kind、name 與證明 file 為必填' })
      return
    }
    response.status(201).json(
      await CaregiverCredential.create({
        caregiverId: profile._id,
        kind: request.body.kind,
        name: request.body.name,
        number: request.body.number,
        issuingAuthority: request.body.issuingAuthority,
        proficiencyLevel: request.body.proficiencyLevel,
        yearsExperience: request.body.yearsExperience,
        issuedAt: request.body.issuedAt,
        expiresAt: request.body.expiresAt,
        fileUrl: `/uploads/${request.file.filename}`,
      }),
    )
  }),
)

// GET /nurses/me/credentials：NURSE 查看自己的全部待審與已審證明。
nurseRoutes.get(
  '/me/credentials',
  authenticate,
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await CaregiverProfile.findOne({ userId: request.auth?.userId })
    response.json(
      await CaregiverCredential.find({ caregiverId: profile?._id }).sort({ createdAt: -1 }),
    )
  }),
)

// 公開未來 14 天排班：週一至週五 09:00–17:00 自動產生；休假與已預約時段不回傳。
nurseRoutes.get(
  '/:id/availability',
  asyncHandler(async (request, response) => {
    const caregiver = await CaregiverProfile.exists({
      _id: request.params.id,
      verificationStatus: 'APPROVED',
      active: true,
    })
    if (!caregiver) {
      response.status(404).json({ message: '這位居服員目前未開放預約' })
      return
    }
    const firstKey = taipeiDateKey(new Date())
    const start = taipeiDayStartUtc(firstKey)
    const end = new Date(start.getTime() + 14 * 86_400_000)
    const [exceptions, leaves, bookings] = await Promise.all([
      Availability.find({ caregiverId: request.params.id, date: { $gte: start, $lt: end }, hidden: { $ne: true }, status: 'UNAVAILABLE' }).select('date startTime endTime'),
      CaregiverLeaveRequest.find({ caregiverId: request.params.id, startAt: { $lt: end }, endAt: { $gt: start }, status: { $in: ['PENDING', 'APPROVED'] }, hidden: { $ne: true } }).select('startAt endAt'),
      Booking.find({ caregiverId: request.params.id, scheduledStartAt: { $lt: end }, scheduledEndAt: { $gt: start }, status: { $in: BLOCKING_BOOKING_STATUSES }, hidden: { $ne: true } }).select('scheduledStartAt scheduledEndAt'),
    ])
    const slots = []
    const now = new Date()
    for (let offset = 0; offset < 14; offset += 1) {
      const day = new Date(start.getTime() + offset * 86_400_000)
      const key = day.toISOString().slice(0, 10)
      if ([0, 6].includes(taipeiWeekday(key))) continue
      for (let hour = 9; hour < 17; hour += 2) {
        const startTime = `${String(hour).padStart(2, '0')}:00`
        const endTime = `${String(Math.min(hour + 2, 17)).padStart(2, '0')}:00`
        const from = taipeiDateTimeToUtc(key, startTime)
        const to = taipeiDateTimeToUtc(key, endTime)
        if (from <= now) continue
        const unavailable = exceptions.some((item) => taipeiDateKey(item.get('date')) === key && intervalsOverlap(from, to, taipeiDateTimeToUtc(key, item.get('startTime')), taipeiDateTimeToUtc(key, item.get('endTime'))))
        const onLeave = leaves.some((item) => intervalsOverlap(from, to, item.get('startAt'), item.get('endAt')))
        const booked = bookings.some((item) => intervalsOverlap(from, to, item.get('scheduledStartAt'), item.get('scheduledEndAt')))
        if (!unavailable && !onLeave && !booked)
          slots.push({
            _id: `${request.params.id}|${key}|${startTime}|${endTime}`,
            date: day,
            startTime,
            endTime,
            status: 'AVAILABLE',
          })
      }
    }
    response.json(slots)
  }),
)

// GET /nurses/:id/credentials：公開頁只顯示已通過審核的證照與技能。
nurseRoutes.get(
  '/:id/credentials',
  asyncHandler(async (request, response) => {
    response.json(
      await CaregiverCredential.find({
        caregiverId: request.params.id,
        verificationStatus: 'APPROVED',
      }),
    )
  }),
)

// PATCH /nurses/:id/credentials/:credentialId/verification：ADMIN 審核單張證明。
nurseRoutes.patch(
  '/:id/credentials/:credentialId/verification',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const status = request.body.verificationStatus
    if (!['APPROVED', 'REJECTED', 'EXPIRED'].includes(status)) {
      response.status(400).json({ message: '證明審核狀態無效' })
      return
    }
    const before = await CaregiverCredential.findOne({
      _id: request.params.credentialId,
      caregiverId: request.params.id,
    })
    const credential = await CaregiverCredential.findOneAndUpdate(
      { _id: request.params.credentialId, caregiverId: request.params.id },
      {
        verificationStatus: status,
        verifiedByAdminId: request.auth?.userId,
        verifiedAt: new Date(),
        rejectionReason: request.body.rejectionReason,
      },
      { new: true, runValidators: true },
    )
    await recordAudit(
      request,
      'VERIFY_CAREGIVER_CREDENTIAL',
      'caregivercredentials',
      String(request.params.credentialId),
      before?.toObject(),
      credential?.toObject(),
    )
    response.json(credential)
  }),
)

// PATCH /nurses/:id/verification：只有 ADMIN 能核准、拒絕或標記證照過期。
nurseRoutes.patch(
  '/:id/verification',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const status = request.body.verificationStatus
    if (!['APPROVED', 'REJECTED', 'EXPIRED'].includes(status)) {
      response.status(400).json({ message: 'verificationStatus 無效' })
      return
    }
    const profile = await CaregiverProfile.findByIdAndUpdate(
      request.params.id,
      { verificationStatus: status, active: status === 'APPROVED' },
      { new: true },
    )
    // 此處只管理接案資格；網站登入停權由 /admin/users/:id 獨立處理。
    await recordAudit(
      request,
      'VERIFY_CAREGIVER_PROFILE',
      'caregiverprofiles',
      String(request.params.id),
      undefined,
      profile?.toObject(),
    )
    response.json(profile)
  }),
)
