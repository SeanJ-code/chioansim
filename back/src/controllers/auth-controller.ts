import bcrypt from 'bcrypt'
import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import * as yup from 'yup'
import { getJwtSecret } from '../configs/env'
import { signToken } from '../middlewares/auth'
import {
  CareRecipient,
  CaregiverProfile,
  roles,
  User,
  UserRecipientRelation,
  type Role,
} from '../models'
import { CaregiverCredential } from '../models/caregiver-credential'
import { RefreshToken } from '../models/refresh-token'
import type { AuthRequest } from '../types/auth'
import {
  hashRefreshToken,
  issueRefreshToken,
  refreshCookieName,
  refreshCookieOptions,
} from '../utils/refresh-token'

const accountRule = yup
  .string()
  .typeError('帳號格式錯誤')
  .required('帳號為必填')
  .min(4, '帳號至少需要 4 個字元')
  .max(20, '帳號最多 20 個字元')
  .matches(/^[a-zA-Z0-9]+$/, '帳號只能使用英文字母與數字')

const passwordRule = yup
  .string()
  .typeError('密碼格式錯誤')
  .required('密碼為必填')
  .min(8, '密碼至少需要 8 個字元')
  .max(72, '密碼最多 72 個字元')

const optionalText = (label: string, max = 200) =>
  yup.string().typeError(`${label}格式錯誤`).max(max, `${label}內容過長`).optional()

const patientProfileSchema = yup
  .object({
    name: optionalText('受照護者姓名', 50),
    birthDate: optionalText('出生日期', 10).matches(/^$|^\d{4}-\d{2}-\d{2}$/, '出生日期格式錯誤'),
    gender: optionalText('性別', 20),
    careLevel: optionalText('照護需求程度', 50),
    mobilityStatus: optionalText('行動狀況', 50),
    heightCm: yup.number().typeError('身高請輸入數字').min(50).max(250).optional(),
    weightKg: yup.number().typeError('體重請輸入數字').min(10).max(300).optional(),
    transferSupport: optionalText('移位協助程度', 100),
    bathingSupport: optionalText('沐浴協助需求', 200),
    assistiveDevices: yup.array(optionalText('輔具名稱', 100)).max(10).optional(),
    homeEnvironmentNotes: optionalText('居家環境與搬運提醒', 1000),
    allergyNotes: optionalText('過敏注意事項', 1000),
    medicalNotes: optionalText('健康與用藥提醒', 1000),
    attentionNotes: optionalText('特別留意事項', 1000),
    address: yup
      .object({ text: optionalText('照護地址', 300) })
      .noUnknown()
      .optional(),
    emergencyContact: yup
      .object({
        name: optionalText('緊急聯絡人姓名', 50),
        phone: optionalText('緊急聯絡人電話', 30),
        relationship: optionalText('緊急聯絡人關係', 50),
      })
      .noUnknown()
      .optional(),
  })
  .noUnknown()
  .optional()

const registerSchema = yup
  .object({
    account: accountRule,
    password: passwordRule,
    name: yup
      .string()
      .typeError('姓名格式錯誤')
      .required('姓名為必填')
      .max(50, '姓名最多 50 個字元'),
    phone: optionalText('聯絡電話', 30),
    email: yup.string().typeError('電子信箱格式錯誤').email('電子信箱格式錯誤').max(254).optional(),
    role: yup
      .string()
      .oneOf([...roles], '使用身份不正確')
      .default('USER'),
    carePurpose: yup.string().oneOf(['FAMILY', 'SELF']).optional(),
    patientProfile: patientProfileSchema,
  })
  .noUnknown()

const loginSchema = yup
  .object({
    account: accountRule,
    password: yup.string().typeError('密碼格式錯誤').required('密碼為必填'),
  })
  .noUnknown()

const recoveryVerifySchema = yup
  .object({
    account: accountRule,
    email: yup.string().typeError('電子信箱格式錯誤').email('電子信箱格式錯誤').max(254).optional(),
    phone: optionalText('電話號碼', 30),
  })
  .noUnknown()

const recoveryResetSchema = yup
  .object({
    resetToken: yup.string().typeError('重設憑證格式錯誤').required('重設憑證為必填'),
    newPassword: passwordRule,
  })
  .noUnknown()

const nurseSchema = yup
  .object({
    account: accountRule,
    password: passwordRule,
    name: yup.string().typeError('姓名格式錯誤').required('姓名為必填').max(50),
    phone: optionalText('聯絡電話', 30),
    email: yup.string().typeError('電子信箱格式錯誤').email('電子信箱格式錯誤').max(254).optional(),
    certificateName: optionalText('證照名稱', 100),
    certificateNumber: yup
      .string()
      .typeError('技術士證號格式錯誤')
      .required('技術士證號為必填')
      .max(100),
    issuingAuthority: optionalText('發證機關', 100),
    certificateExpiresAt: optionalText('證照有效期限', 10).matches(
      /^$|^\d{4}-\d{2}-\d{2}$/,
      '證照有效期限格式錯誤',
    ),
    yearsExperience: optionalText('服務年資', 3).matches(
      /^$|^\d{1,3}$/,
      '服務年資必須是 0 到 999 的整數',
    ),
    transportation: optionalText('主要交通方式', 100),
    serviceAreas: optionalText('可服務地區', 500),
    introduction: optionalText('自我介紹', 2000),
  })
  .noUnknown()

async function validate<T extends yup.AnyObjectSchema>(
  schema: T,
  body: unknown,
): Promise<yup.InferType<T>> {
  return schema.validate(body, { abortEarly: false, stripUnknown: true })
}

const normalizedAccount = (account: string) => account.trim().toLowerCase()
const normalizedOptional = (value?: string) => value?.trim() || undefined

function authResult(user: InstanceType<typeof User>, role: Role, accessToken: string) {
  return {
    accessToken,
    token: accessToken,
    user: { id: user.id, account: user.get('account'), name: user.get('name'), role },
  }
}

export async function register(request: Request, response: Response): Promise<void> {
  const rawBody = { ...request.body }
  if (typeof rawBody.patientProfile === 'string') {
    try {
      rawBody.patientProfile = JSON.parse(rawBody.patientProfile)
    } catch {
      response.status(400).json({ message: '受照護者資料格式錯誤' })
      return
    }
  }
  const input = await validate(registerSchema, rawBody)
  const role = input.role as Role
  if (role === 'NURSE') {
    response.status(400).json({ message: 'Nurse 請使用 /api/auth/register-nurse 並上傳政府證照' })
    return
  }
  if (role === 'ADMIN') {
    const setupKey = process.env.ADMIN_SETUP_KEY?.trim()
    if (!setupKey || request.headers['x-admin-setup-key'] !== setupKey) {
      response.status(403).json({ message: '建立管理員需要有效的 x-admin-setup-key' })
      return
    }
  }

  const account = normalizedAccount(input.account)
  if (await User.exists({ account })) {
    response.status(409).json({ message: '帳號已存在' })
    return
  }

  let user!: InstanceType<typeof User>
  const files = request.files as Record<string, Express.Multer.File[]> | undefined
  const recipientPhotos = files?.recipientPhotos || []
  await mongoose.connection.transaction(async (session) => {
    ;[user] = await User.create(
      [
        {
          account,
          passwordHash: await bcrypt.hash(input.password, 12),
          name: input.name.trim(),
          phone: normalizedOptional(input.phone),
          email: normalizedOptional(input.email)?.toLowerCase(),
          role,
        },
      ],
      { session },
    )
    const shouldCreateRecipient =
      role === 'PATIENT' || (role === 'USER' && input.carePurpose === 'FAMILY')
    if (shouldCreateRecipient) {
      const recipientName =
        input.patientProfile?.name?.trim() || (role === 'PATIENT' ? input.name.trim() : '')
      if (!recipientName) throw new yup.ValidationError('請填寫受照護者姓名')
      const [recipient] = await CareRecipient.create(
        [
          {
            createdByUserId: user._id,
            ...(role === 'PATIENT' ? { accountUserId: user._id } : {}),
            name: recipientName,
            phone: role === 'PATIENT' ? normalizedOptional(input.phone) : undefined,
            ...input.patientProfile,
            carePhotoUrls: recipientPhotos.map((file) => `/uploads/${file.filename}`),
          },
        ],
        { session },
      )
      if (role === 'USER') {
        await UserRecipientRelation.create(
          [
            {
              userId: user._id,
              recipientId: recipient._id,
              relationship: '主要照護家屬',
              isPrimaryContact: true,
            },
          ],
          { session },
        )
      }
    }
  })

  await issueRefreshToken(response, user.id)
  const accessToken = signToken(user.id, role)
  response.status(201).json(authResult(user, role, accessToken))
}

export async function login(request: Request, response: Response): Promise<void> {
  const input = await validate(loginSchema, request.body)
  const user = await User.findOne({ account: normalizedAccount(input.account) }).select(
    '+passwordHash',
  )
  if (!user || !(await bcrypt.compare(input.password, String(user.get('passwordHash'))))) {
    response.status(401).json({ message: '帳號或密碼錯誤' })
    return
  }
  // 舊版把待審 NURSE 帳號設為 PENDING；登入時升級為 ACTIVE，接案資格仍維持待審。
  if (user.get('role') === 'NURSE' && user.get('status') === 'PENDING') {
    user.set('status', 'ACTIVE')
    await user.save()
  }
  if (user.get('status') !== 'ACTIVE') {
    response.status(403).json({ message: '帳號尚未啟用或已停權' })
    return
  }

  const role = user.get('role') as Role
  await issueRefreshToken(response, user.id)
  const accessToken = signToken(user.id, role)
  response.json(authResult(user, role, accessToken))
}

export async function verifyPasswordRecovery(request: Request, response: Response): Promise<void> {
  const input = await validate(recoveryVerifySchema, request.body)
  const email = normalizedOptional(input.email)?.toLowerCase()
  const phone = normalizedOptional(input.phone)
  if ((!email && !phone) || (email && phone)) {
    response.status(400).json({ message: '請輸入帳號，並擇一填寫 Email 或電話號碼' })
    return
  }

  const user = await User.findOne({
    account: normalizedAccount(input.account),
    status: 'ACTIVE',
    ...(email ? { email } : { phone }),
  })
  if (!user) {
    response.status(400).json({ message: '帳號與聯絡資料不相符，請重新確認' })
    return
  }

  const resetToken = jwt.sign(
    {
      userId: user.id,
      purpose: 'PASSWORD_RESET',
      accountVersion: new Date(user.get('updatedAt')).getTime(),
    },
    getJwtSecret(),
    { expiresIn: '10m' },
  )
  response.json({ resetToken, message: '資料核對完成，請設定新的登入密碼' })
}

export async function resetPassword(request: Request, response: Response): Promise<void> {
  const input = await validate(recoveryResetSchema, request.body)
  try {
    const payload = jwt.verify(input.resetToken, getJwtSecret()) as {
      userId: string
      purpose?: string
      accountVersion?: number
    }
    if (payload.purpose !== 'PASSWORD_RESET') throw new Error('invalid purpose')

    const user = await User.findOne({ _id: payload.userId, status: 'ACTIVE' }).select(
      '+passwordHash',
    )
    if (!user || new Date(user.get('updatedAt')).getTime() !== payload.accountVersion) {
      response.status(400).json({ message: '帳號不存在或目前無法重設密碼' })
      return
    }
    user.set('passwordHash', await bcrypt.hash(input.newPassword, 12))
    await user.save()
    await RefreshToken.deleteMany({ userId: user._id })
    response.json({ message: '密碼已更新，請返回登入頁使用新密碼登入' })
  } catch {
    response.status(400).json({ message: '重設連結已失效，請重新核對帳號資料' })
  }
}

export async function refresh(request: Request, response: Response): Promise<void> {
  const rawToken = request.cookies?.[refreshCookieName]
  if (!rawToken || typeof rawToken !== 'string') {
    response.status(401).json({ message: '缺少 Refresh Token Cookie' })
    return
  }

  const storedToken = await RefreshToken.findOneAndDelete({ tokenHash: hashRefreshToken(rawToken) })
  const user = storedToken
    ? await User.findOne({ _id: storedToken.get('userId'), status: 'ACTIVE' })
    : null
  if (!user) {
    response.clearCookie(refreshCookieName, refreshCookieOptions)
    response.status(401).json({ message: 'Refresh Token 無效或已過期' })
    return
  }

  await issueRefreshToken(response, user.id)
  const role = user.get('role') as Role
  const accessToken = signToken(user.id, role)
  response.json(authResult(user, role, accessToken))
}

export async function logout(request: Request, response: Response): Promise<void> {
  const rawToken = request.cookies?.[refreshCookieName]
  if (typeof rawToken === 'string') {
    await RefreshToken.findOneAndDelete({ tokenHash: hashRefreshToken(rawToken) })
  }
  response.clearCookie(refreshCookieName, refreshCookieOptions)
  response.json({ message: '已登出' })
}

export async function registerNurse(request: Request, response: Response): Promise<void> {
  const input = await validate(nurseSchema, request.body)
  const files = request.files as Record<string, Express.Multer.File[]> | undefined
  const certificateFile = files?.certificate?.[0]
  const profilePhotoFile = files?.profilePhoto?.[0]
  if (!certificateFile || !profilePhotoFile) {
    response.status(400).json({ message: '中華民國技術士證圖檔或 PDF 與本人近照皆為必填' })
    return
  }

  const account = normalizedAccount(input.account)
  if (await User.exists({ account })) {
    response.status(409).json({ message: '帳號已存在' })
    return
  }

  let user!: InstanceType<typeof User>
  let nurse!: InstanceType<typeof CaregiverProfile>
  await mongoose.connection.transaction(async (session) => {
    ;[user] = await User.create(
      [
        {
          account,
          passwordHash: await bcrypt.hash(input.password, 12),
          name: input.name.trim(),
          phone: normalizedOptional(input.phone),
          email: normalizedOptional(input.email)?.toLowerCase(),
          role: 'NURSE',
          // 帳號立即可登入；是否能承接工作由居服員 Profile 審核狀態控制。
          status: 'ACTIVE',
        },
      ],
      { session },
    )
    ;[nurse] = await CaregiverProfile.create(
      [
        {
          userId: user._id,
          profilePhotoUrl: `/uploads/${profilePhotoFile.filename}`,
          certificateNumber: input.certificateNumber.trim(),
          certificateFileUrl: `/uploads/${certificateFile.filename}`,
          certificateExpiresAt: normalizedOptional(input.certificateExpiresAt),
          introduction: normalizedOptional(input.introduction),
          yearsExperience: Number(input.yearsExperience || 0),
          serviceAreas:
            input.serviceAreas
              ?.split(',')
              .map((item) => item.trim())
              .filter(Boolean) || [],
          transportation: normalizedOptional(input.transportation),
        },
      ],
      { session },
    )
    await CaregiverCredential.create(
      [
        {
          caregiverId: nurse._id,
          kind: 'CERTIFICATE',
          name: normalizedOptional(input.certificateName) || '中華民國技術士證',
          number: input.certificateNumber.trim(),
          issuingAuthority: normalizedOptional(input.issuingAuthority),
          expiresAt: normalizedOptional(input.certificateExpiresAt),
          fileUrl: `/uploads/${certificateFile.filename}`,
        },
      ],
      { session },
    )
  })

  await issueRefreshToken(response, user.id)
  const accessToken = signToken(user.id, 'NURSE')
  response.status(201).json({
    ...authResult(user, 'NURSE', accessToken),
    message: '帳號建立完成；證照審核通過後即可查看並承接工作',
    caregiverProfile: nurse,
  })
}

export async function me(rawRequest: Request, response: Response): Promise<void> {
  const request = rawRequest as AuthRequest
  const userId = request.auth?.userId
  const role = request.auth?.role
  const profileQuery =
    role === 'PATIENT'
      ? CareRecipient.findOne({ accountUserId: userId })
      : role === 'NURSE'
        ? CaregiverProfile.findOne({ userId })
        : Promise.resolve(null)
  const [user, profile] = await Promise.all([User.findById(userId), profileQuery])
  response.json({
    user,
    patient: role === 'PATIENT' ? profile : null,
    nurse: role === 'NURSE' ? profile : null,
  })
}
