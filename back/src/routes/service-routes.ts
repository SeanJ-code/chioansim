import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth'
import type { AuthRequest } from '../types/auth'
import { asyncHandler } from '../utils/http'
import {
  Booking,
  CaregiverProfile,
  CareRecipient,
  ServiceRequest,
  ServiceType,
  UserRecipientRelation,
} from '../models'

export const serviceRoutes = Router()

// 服務類型是公開型錄：所有人可查詢，只有 ADMIN 能新增、修改與刪除。
serviceRoutes.get(
  '/types',
  asyncHandler(async (_request, response) => {
    response.json(await ServiceType.find({ active: true, hidden: { $ne: true } }).sort({ code: 1, name: 1 }))
  }),
)
// POST /services/types：建立服務項目，例如生活照顧、陪同就醫。
serviceRoutes.post(
  '/types',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(async (request, response) => {
    response.status(201).json(await ServiceType.create(request.body))
  }),
)
// PATCH /services/types/:id：部分更新既有服務項目。
serviceRoutes.patch(
  '/types/:id',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(async (request, response) => {
    response.json(
      await ServiceType.findByIdAndUpdate(request.params.id, request.body, {
        new: true,
        runValidators: true,
      }),
    )
  }),
)
// DELETE /services/types/:id：只隱藏資料，保留歷史預約仍可參照原服務項目。
serviceRoutes.delete(
  '/types/:id',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    await ServiceType.findByIdAndUpdate(request.params.id, {
      active: false,
      hidden: true,
      hiddenAt: new Date(),
      hiddenByUserId: request.auth?.userId,
    })
    response.status(204).send()
  }),
)

// POST /services/requests：USER/PATIENT 提出尚未被居服員承接的服務需求。
serviceRoutes.post(
  '/requests',
  authenticate,
  authorize('USER', 'PATIENT', 'NURSE', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    // PATIENT 為自己提出需求時自動連結本人的受照護資料，讓居服員看得到照護情況與照片。
    const ownRecipient =
      request.auth?.role === 'PATIENT' && !request.body.recipientId
        ? await CareRecipient.findOne({ accountUserId: request.auth.userId })
        : null
    const recipientId = request.body.recipientId || ownRecipient?._id
    // recipientId 是選填；有填時必須確認登入者是本人或具有可預約的家屬權限。
    if (recipientId) {
      const ownsPatient = await CareRecipient.exists({
        _id: recipientId,
        accountUserId: request.auth?.userId,
      })
      const relation = await UserRecipientRelation.exists({
        recipientId,
        userId: request.auth?.userId,
        canBookService: true,
      })
      if (!ownsPatient && !relation && request.auth?.role !== 'ADMIN') {
        response.status(403).json({ message: '無權為此受照護者提出需求' })
        return
      }
    }
    const serviceRequest = await ServiceRequest.create({
      ...request.body,
      recipientId,
      requesterUserId: request.auth?.userId,
    })
    response.status(201).json(serviceRequest)
  }),
)

// GET /services/requests：ADMIN 看全部、NURSE 看公開需求、使用者只看自己的需求。
serviceRoutes.get(
  '/requests',
  authenticate,
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    // 依角色動態產生 MongoDB 查詢條件，避免把不該看的需求傳給前端。
    const approvedNurse =
      request.auth?.role === 'NURSE'
        ? await CaregiverProfile.exists({
            userId: request.auth.userId,
            verificationStatus: 'APPROVED',
            active: true,
          })
        : false
    const roleFilter =
      request.auth?.role === 'ADMIN'
        ? {}
        : approvedNurse
          ? { $or: [{ status: 'OPEN' }, { requesterUserId: request.auth?.userId }] }
          : { requesterUserId: request.auth?.userId }
    response.json(
      await ServiceRequest.find({ ...roleFilter, hidden: { $ne: true } })
        .populate('serviceTypeIds')
        .populate('recipientId')
        .sort({ createdAt: -1 }),
    )
  }),
)

// GET /services/requests/:id：查單筆時仍需再次檢查角色與資料所有權。
serviceRoutes.get(
  '/requests/:id',
  authenticate,
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const item = await ServiceRequest.findOne({
      _id: request.params.id,
      hidden: { $ne: true },
    })
      .populate('serviceTypeIds')
      .populate('recipientId')
    if (!item) {
      response.status(404).json({ message: '找不到服務需求' })
      return
    }
    const allowed =
      request.auth?.role === 'ADMIN' ||
      (request.auth?.role === 'NURSE' &&
        Boolean(
          await CaregiverProfile.exists({
            userId: request.auth.userId,
            verificationStatus: 'APPROVED',
            active: true,
          }),
        )) ||
      item.get('requesterUserId').toString() === request.auth?.userId
    response.status(allowed ? 200 : 403).json(allowed ? item : { message: '無權查看此需求' })
  }),
)

// PATCH /services/requests/:id：非 ADMIN 的條件包含 requesterUserId，只能改自己的需求。
serviceRoutes.patch(
  '/requests/:id',
  authenticate,
  authorize('USER', 'PATIENT', 'NURSE', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const filter =
      request.auth?.role === 'ADMIN'
        ? { _id: request.params.id }
        : { _id: request.params.id, requesterUserId: request.auth?.userId }
    response.json(
      await ServiceRequest.findOneAndUpdate(filter, request.body, {
        new: true,
        runValidators: true,
      }),
    )
  }),
)

// DELETE /services/requests/:id：保留資料，只從一般查詢結果隱藏。
serviceRoutes.delete(
  '/requests/:id',
  authenticate,
  authorize('USER', 'PATIENT', 'NURSE', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const filter =
      request.auth?.role === 'ADMIN'
        ? { _id: request.params.id }
        : { _id: request.params.id, requesterUserId: request.auth?.userId }
    await ServiceRequest.findOneAndUpdate(filter, {
      status: 'CANCELLED',
      hidden: true,
      hiddenAt: new Date(),
      hiddenByUserId: request.auth?.userId,
    })
    response.status(204).send()
  }),
)

// POST /services/requests/:id/accept：已核准 NURSE 接案，需求轉成正式 Booking。
serviceRoutes.post(
  '/requests/:id/accept',
  authenticate,
  authorize('NURSE'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const profile = await CaregiverProfile.findOne({
      userId: request.auth?.userId,
      verificationStatus: 'APPROVED',
      active: true,
    })
    // findOneAndUpdate 同時要求 status=OPEN 並改成 MATCHED，可避免兩位 NURSE 同時搶到。
    const serviceRequest = profile
      ? await ServiceRequest.findOneAndUpdate(
          { _id: request.params.id, status: 'OPEN' },
          { status: 'MATCHED' },
          { new: true },
        )
      : null
    if (!profile || !serviceRequest) {
      response.status(409).json({ message: 'Nurse 未通過審核或需求已被承接' })
      return
    }
    // 先鎖定需求再建立 Booking；若建立失敗，要把需求還原為 OPEN。
    try {
      const booking = await Booking.create({
        bookingNumber: `BK${Date.now()}`,
        serviceRequestId: serviceRequest._id,
        requesterUserId: serviceRequest.get('requesterUserId'),
        recipientId: serviceRequest.get('recipientId'),
        caregiverId: profile._id,
        serviceTypeIds: serviceRequest.get('serviceTypeIds'),
        scheduledStartAt: serviceRequest.get('preferredDate'),
        serviceAddress: serviceRequest.get('serviceAddress'),
        acceptedAt: new Date(),
      })
      response.status(201).json(booking)
    } catch (error) {
      await ServiceRequest.findByIdAndUpdate(serviceRequest._id, { status: 'OPEN' })
      throw error
    }
  }),
)
