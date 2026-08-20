import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth'
import type { AuthRequest } from '../types/auth'
import { asyncHandler } from '../utils/http'
import { CareRecipient, InjuryReport, UserRecipientRelation } from '../models'
import { upload } from '../middlewares/upload'
import { Consent } from '../models/consent'

export const patientRoutes = Router()
// 此檔所有 API 都涉及個資，所以先統一要求登入。
patientRoutes.use(authenticate)

// 共用權限判斷：ADMIN、受照護者本人帳號，或有效家屬關係可以存取。
async function canAccess(request: AuthRequest, recipientId: string): Promise<boolean> {
  if (request.auth?.role === 'ADMIN') return true
  if (
    await CareRecipient.exists({
      _id: recipientId,
      accountUserId: request.auth?.userId,
      status: { $ne: 'DELETED' },
    })
  )
    return true
  return Boolean(
    await UserRecipientRelation.exists({
      recipientId,
      userId: request.auth?.userId,
      status: 'ACTIVE',
    }),
  )
}

// POST /patients：建立受照護者，同時把建立者設為主要聯絡家屬。
patientRoutes.post(
  '/',
  authorize('USER', 'NURSE', 'ADMIN'),
  upload.array('carePhotos', 4),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    if (!request.body.name) {
      response.status(400).json({ message: 'name 為必填' })
      return
    }
    const files = request.files as Express.Multer.File[] | undefined
    const numberOrUndefined = (value: unknown) =>
      value === '' || value === undefined ? undefined : Number(value)
    const assistiveDevices = Array.isArray(request.body.assistiveDevices)
      ? request.body.assistiveDevices
      : request.body.assistiveDevices
        ? JSON.parse(request.body.assistiveDevices)
        : []
    const recipient = await CareRecipient.create({
      name: request.body.name,
      birthDate: request.body.birthDate || undefined,
      gender: request.body.gender,
      phone: request.body.phone,
      careLevel: request.body.careLevel,
      mobilityStatus: request.body.mobilityStatus,
      heightCm: numberOrUndefined(request.body.heightCm),
      weightKg: numberOrUndefined(request.body.weightKg),
      transferSupport: request.body.transferSupport,
      bathingSupport: request.body.bathingSupport,
      assistiveDevices,
      homeEnvironmentNotes: request.body.homeEnvironmentNotes,
      allergyNotes: request.body.allergyNotes,
      medicalNotes: request.body.medicalNotes,
      attentionNotes: request.body.attentionNotes,
      address: request.body.address || { text: request.body.addressText },
      emergencyContact: request.body.emergencyContact || {
        name: request.body.emergencyContactName,
        phone: request.body.emergencyContactPhone,
        relationship: request.body.emergencyContactRelationship,
      },
      carePhotoUrls: files?.map((file) => `/uploads/${file.filename}`) || [],
      createdByUserId: request.auth?.userId,
    })
    // 關係資料獨立保存，未來同一受照護者就能授權給多位家屬。
    await UserRecipientRelation.create({
      userId: request.auth?.userId,
      recipientId: recipient._id,
      relationship: request.body.relationship || '家屬',
      isPrimaryContact: true,
    })
    response.status(201).json(recipient)
  }),
)

// GET /patients：ADMIN 看全部；一般帳號只看自己或有家屬關係的資料。
patientRoutes.get(
  '/',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    if (request.auth?.role === 'ADMIN') {
      response.json(
        await CareRecipient.find({ status: { $ne: 'DELETED' } }).sort({ createdAt: -1 }),
      )
      return
    }
    const relations = await UserRecipientRelation.find({
      userId: request.auth?.userId,
      status: 'ACTIVE',
    }).select('recipientId')
    const ids = relations.map((relation) => relation.get('recipientId'))
    response.json(
      await CareRecipient.find({
        status: { $ne: 'DELETED' },
        $or: [{ _id: { $in: ids } }, { accountUserId: request.auth?.userId }],
      }),
    )
  }),
)

// GET /patients/:id：先做資料層級權限檢查，再讀取單筆。
patientRoutes.get(
  '/:id',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    if (!(await canAccess(request, String(request.params.id)))) {
      response.status(403).json({ message: '無權查看此受照護者' })
      return
    }
    response.json(
      await CareRecipient.findOne({ _id: request.params.id, status: { $ne: 'DELETED' } }),
    )
  }),
)

// PATCH /patients/:id：部分更新；new:true 回傳更新後資料，runValidators 重新跑 Schema 驗證。
patientRoutes.patch(
  '/:id',
  authorize('USER', 'NURSE', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    if (!(await canAccess(request, String(request.params.id)))) {
      response.status(403).json({ message: '無權修改此受照護者' })
      return
    }
    response.json(
      await CareRecipient.findByIdAndUpdate(request.params.id, request.body, {
        new: true,
        runValidators: true,
      }),
    )
  }),
)

// DELETE /patients/:id：只有建立者或 ADMIN 可刪除，並同步清除失效的家屬關係。
patientRoutes.delete(
  '/:id',
  authorize('USER', 'NURSE', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const recipient = await CareRecipient.findById(request.params.id)
    const owns = recipient?.get('createdByUserId')?.toString() === request.auth?.userId
    if (!owns && request.auth?.role !== 'ADMIN') {
      response.status(403).json({ message: '只有建立者或管理員可以刪除' })
      return
    }
    // 軟刪除保留醫療、預約與爭議稽核所需關聯，不真正移除文件。
    recipient.set({
      status: 'DELETED',
      deletedAt: new Date(),
      deletedByUserId: request.auth?.userId,
      deleteReason: request.body?.reason,
    })
    await recipient.save()
    await UserRecipientRelation.updateMany(
      { recipientId: request.params.id },
      { status: 'INACTIVE' },
    )
    response.json({ message: '受照護者資料已停用並保留稽核紀錄' })
  }),
)

// POST /patients/:id/relations：授權另一個 USER 預約或查看受照護紀錄。
patientRoutes.post(
  '/:id/relations',
  authorize('USER', 'NURSE', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const recipient = await CareRecipient.findById(request.params.id)
    if (
      !recipient ||
      (recipient.get('createdByUserId')?.toString() !== request.auth?.userId &&
        request.auth?.role !== 'ADMIN')
    ) {
      response.status(403).json({ message: '無權新增家屬關係' })
      return
    }
    const relation = await UserRecipientRelation.create({
      ...request.body,
      recipientId: recipient._id,
    })
    response.status(201).json(relation)
  }),
)

// POST /patients/:id/injuries：不限定預約，也能記錄平時發現的外傷與照片。
patientRoutes.post(
  '/:id/injuries',
  authorize('USER', 'NURSE', 'ADMIN'),
  upload.array('photos', 6),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    if (!(await canAccess(request, String(request.params.id)))) {
      response.status(403).json({ message: '無權新增此受照護者的傷況紀錄' })
      return
    }
    // upload.array 會把多個 photos 放到 request.files。
    const files = request.files as Express.Multer.File[] | undefined
    if (!files?.length) {
      response.status(400).json({ message: '至少上傳一張 photos 圖片' })
      return
    }
    const report = await InjuryReport.create({
      recipientId: request.params.id,
      reportedByUserId: request.auth?.userId,
      stage: request.body.stage || 'BEFORE_SERVICE',
      hasInjury: request.body.hasInjury === 'true',
      hasNegativeScene: request.body.hasNegativeScene === 'true',
      description: request.body.description,
      photoUrls: files.map((file) => `/uploads/${file.filename}`),
    })
    response.status(201).json(report)
  }),
)

// GET /patients/:id/injuries：依建立時間由新到舊取得傷況歷史。
patientRoutes.get(
  '/:id/injuries',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    if (!(await canAccess(request, String(request.params.id)))) {
      response.status(403).json({ message: '無權查看此受照護者的傷況紀錄' })
      return
    }
    response.json(
      await InjuryReport.find({ recipientId: request.params.id }).sort({ createdAt: -1 }),
    )
  }),
)

// POST /patients/:id/consents：USER 代表自己或家屬同意服務、照片、定位等文件。
patientRoutes.post(
  '/:id/consents',
  authorize('USER', 'NURSE', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    if (!(await canAccess(request, String(request.params.id)))) {
      response.status(403).json({ message: '無權為此受照護者建立同意文件' })
      return
    }
    const consent = await Consent.create({
      ...request.body,
      userId: request.auth?.userId,
      recipientId: request.params.id,
    })
    response.status(201).json(consent)
  }),
)

// GET /patients/:id/consents：PATIENT 可查看自己的同意狀態，但不能自行新增或修改。
patientRoutes.get(
  '/:id/consents',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    if (!(await canAccess(request, String(request.params.id)))) {
      response.status(403).json({ message: '無權查看同意文件' })
      return
    }
    response.json(await Consent.find({ recipientId: request.params.id }).sort({ createdAt: -1 }))
  }),
)

// PATCH /patients/:id/consents/:consentId/revoke：撤回同意但保留歷史文件。
patientRoutes.patch(
  '/:id/consents/:consentId/revoke',
  authorize('USER', 'NURSE', 'ADMIN'),
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    if (!(await canAccess(request, String(request.params.id)))) {
      response.status(403).json({ message: '無權撤回此同意文件' })
      return
    }
    response.json(
      await Consent.findOneAndUpdate(
        { _id: request.params.consentId, recipientId: request.params.id },
        { status: 'REVOKED', revokedAt: new Date() },
        { new: true },
      ),
    )
  }),
)
