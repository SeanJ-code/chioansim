import { Schema, model } from 'mongoose'

/**
 * 本檔定義 MongoDB 資料結構（Schema）及可操作資料庫的 Model。
 * required=必填、unique=不可重複、enum=限定值、ref=參照另一個 Collection、
 * timestamps=true 會自動建立 createdAt 與 updatedAt。
 */
export const roles = ['USER', 'PATIENT', 'NURSE', 'ADMIN'] as const
// 從 roles 陣列產生 TypeScript 聯集型別，避免型別與實際允許角色不同步。
export type Role = (typeof roles)[number]

// 可重用的 GPS 子文件；{ _id:false } 表示它只是父資料的一部分，不需要獨立 ID。
const locationSchema = new Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: String,
    accuracyMeters: Number,
    sharingExpiresAt: Date,
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

// User 只保存登入與共用帳號資料；PATIENT/NURSE 的專屬資料放到各自 Profile。
const userSchema = new Schema(
  {
    account: { type: String, required: true, unique: true, trim: true, lowercase: true },
    // 永遠不存明碼；select:false 讓一般查詢也不會意外回傳雜湊密碼。
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    role: { type: String, enum: roles, required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'PENDING', 'DELETED'],
      default: 'ACTIVE',
    },
    deletedAt: Date,
    deletedByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    deleteReason: String,
  },
  { timestamps: true },
)

// 受照護者可以有登入帳號（PATIENT），也可以只是 USER 建立的家屬資料。
const careRecipientSchema = new Schema(
  {
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // sparse 允許多筆資料沒有 accountUserId，但有值時仍必須唯一。
    accountUserId: { type: Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
    name: { type: String, required: true },
    birthDate: Date,
    gender: String,
    phone: String,
    careLevel: String,
    mobilityStatus: String,
    heightCm: Number,
    weightKg: Number,
    transferSupport: String,
    bathingSupport: String,
    assistiveDevices: [String],
    homeEnvironmentNotes: String,
    // 接案前的生活近照／全身照，協助居服員評估移位、沐浴與人力需求。
    carePhotoUrls: [String],
    allergyNotes: String,
    medicalNotes: String,
    attentionNotes: String,
    attentionPhotoUrls: [String],
    address: {
      text: String,
      latitude: Number,
      longitude: Number,
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'DELETED'], default: 'ACTIVE' },
    deletedAt: Date,
    deletedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    deleteReason: String,
  },
  { timestamps: true },
)

// USER 與受照護者是多對多關係，所以用中介 Collection 保存親屬與權限。
const relationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'CareRecipient', required: true },
    relationship: { type: String, required: true },
    isPrimaryContact: { type: Boolean, default: false },
    canBookService: { type: Boolean, default: true },
    canViewRecord: { type: Boolean, default: true },
    canCancelBooking: { type: Boolean, default: false },
    canViewLocation: { type: Boolean, default: true },
    canViewMedicalNotes: { type: Boolean, default: false },
    canHandleInjuryDecision: { type: Boolean, default: false },
    canReceiveEmergencyNotice: { type: Boolean, default: true },
    authorizationExpiresAt: Date,
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true },
)
// 同一位 USER 對同一受照護者只能有一筆關係，交由資料庫保證一致性。
relationSchema.index({ userId: 1, recipientId: 1 }, { unique: true })

// 居服員專屬資料：證照、服務範圍、定位、評價與棄單次數。
const caregiverSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    // 公開媒合頁使用的本人近照；新申請者必須提供，讓家庭能安心辨識服務人員。
    profilePhotoUrl: { type: String, required: true },
    introduction: String,
    yearsExperience: { type: Number, default: 0 },
    serviceAreas: [String],
    serviceTypeIds: [{ type: Schema.Types.ObjectId, ref: 'ServiceType' }],
    certificateNumber: { type: String, required: true },
    certificateFileUrl: { type: String, required: true },
    certificateExpiresAt: Date,
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
      default: 'PENDING',
    },
    transportation: String,
    active: { type: Boolean, default: false },
    currentLocation: locationSchema,
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    abandonmentCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

// 收藏是帳號與居服員之間的關係，獨立保存以避免把可變清單塞進 User。
const favoriteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    caregiverId: { type: Schema.Types.ObjectId, ref: 'CaregiverProfile', required: true },
  },
  { timestamps: true },
)
favoriteSchema.index({ userId: 1, caregiverId: 1 }, { unique: true })

// 平日 09:00–17:00 預設可服務；此集合只記錄居服員主動設定的休假例外。
const availabilitySchema = new Schema(
  {
    caregiverId: { type: Schema.Types.ObjectId, ref: 'CaregiverProfile', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: { type: String, enum: ['AVAILABLE', 'BOOKED', 'LEAVE', 'UNAVAILABLE'], default: 'LEAVE' },
    hidden: { type: Boolean, default: false },
    hiddenAt: Date,
    hiddenByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

// 服務型錄，例如陪伴、備餐、沐浴；由 ADMIN 維護，需求與預約只參照其 ID。
const serviceTypeSchema = new Schema(
  {
    code: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    name: { type: String, required: true, unique: true },
    description: String,
    durationMinutes: { type: Number, required: true },
    basePrice: { type: Number, required: true },
    active: { type: Boolean, default: true },
    hidden: { type: Boolean, default: false },
    hiddenAt: Date,
    hiddenByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

// ServiceRequest 是「尚未媒合的需求」，recipientId 可省略，讓 USER 能為自己預約。
const serviceRequestSchema = new Schema(
  {
    requesterUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'CareRecipient' },
    serviceTypeIds: [{ type: Schema.Types.ObjectId, ref: 'ServiceType', required: true }],
    preferredDate: { type: Date, required: true },
    preferredStartTime: { type: String, required: true },
    estimatedDuration: Number,
    serviceAddress: {
      text: { type: String, required: true },
      latitude: Number,
      longitude: Number,
    },
    specialRequirements: String,
    status: {
      type: String,
      enum: ['OPEN', 'MATCHED', 'CANCELLED', 'COMPLETED'],
      default: 'OPEN',
    },
    hidden: { type: Boolean, default: false },
    hiddenAt: Date,
    hiddenByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

// Booking 是需求被 NURSE 接下後形成的正式案件，並保存整段服務狀態與 GPS。
const bookingSchema = new Schema(
  {
    bookingNumber: { type: String, required: true, unique: true },
    serviceRequestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
    requesterUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'CareRecipient' },
    caregiverId: { type: Schema.Types.ObjectId, ref: 'CaregiverProfile', required: true },
    serviceTypeIds: [{ type: Schema.Types.ObjectId, ref: 'ServiceType' }],
    scheduledStartAt: { type: Date, required: true },
    scheduledEndAt: Date,
    serviceAddress: { text: String, latitude: Number, longitude: Number },
    // 成交當下的服務總額快照；歷史畫面不可用日後調整的型錄價格重算。
    totalAmount: { type: Number, min: 0 },
    estimatedDistanceKm: Number,
    estimatedDurationMin: Number,
    estimatedArrivalAt: Date,
    // 狀態機：已接案→出發→抵達→服務中→完成，也可能等待傷況判定、取消或棄單。
    status: {
      type: String,
      enum: [
        'PENDING',
        'ACCEPTED',
        'DEPARTED',
        'ARRIVED',
        'WAITING_DECISION',
        'IN_SERVICE',
        'AWAITING_USER_CONFIRMATION',
        'COMPLETED',
        'CANCELLED',
        'ABANDONED',
      ],
      default: 'PENDING',
    },
    latestLocation: locationSchema,
    locationSharingStoppedAt: Date,
    acceptedAt: Date,
    departedAt: Date,
    arrivedAt: Date,
    serviceStartedAt: Date,
    completionRequestedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    cancellationRefundEligible: Boolean,
    attendanceStatus: {
      type: String,
      enum: ['NOT_CHECKED_IN', 'CHECKED_IN', 'LATE', 'OVERDUE', 'COMPLETED'],
      default: 'NOT_CHECKED_IN',
    },
    qrScanCount: { type: Number, default: 0 },
    lastQrScannedAt: Date,
    hidden: { type: Boolean, default: false },
    hiddenAt: Date,
    hiddenByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

// 傷況紀錄可隸屬某次預約，也可單獨記錄某位受照護者平時的外傷狀況。
const injuryReportSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    recipientId: { type: Schema.Types.ObjectId, ref: 'CareRecipient' },
    reportedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stage: {
      type: String,
      enum: ['BEFORE_SERVICE', 'DURING_SERVICE', 'AFTER_SERVICE'],
      required: true,
    },
    hasInjury: { type: Boolean, required: true },
    hasNegativeScene: { type: Boolean, default: false },
    description: String,
    photoUrls: [{ type: String, required: true }],
    decision: { type: String, enum: ['PENDING', 'CONTINUE', 'CANCEL'], default: 'PENDING' },
    decidedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    decidedAt: Date,
  },
  { timestamps: true },
)

// 一個 Booking 最多一筆正式服務成果，因此 bookingId 設為 unique。
const serviceRecordSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'CareRecipient' },
    caregiverId: { type: Schema.Types.ObjectId, ref: 'CaregiverProfile', required: true },
    completedItems: [String],
    notes: String,
    checkInLocation: locationSchema,
    checkOutLocation: locationSchema,
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
)

// 雙向評價：reviewer 是評價者、target 是被評價者，targetRole 方便管理統計。
const reviewSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    reviewerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetRole: { type: String, enum: roles, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: String,
    photoUrls: [{ type: String }],
    careTags: [{ type: String }],
    // 私密照護紀錄沿用同一筆 Review 的 booking/rating 關聯，不進公開評論內容。
    journalContent: { type: String, trim: true, maxlength: 1000 },
    journalPhotoUrls: [{ type: String }],
    journalCreatedAt: Date,
    visible: { type: Boolean, default: true },
    adminDecision: String,
    hidden: { type: Boolean, default: false },
    hiddenAt: Date,
    hiddenByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)
// 同一案件中，同一評價者不可重複評價同一人。
reviewSchema.index({ bookingId: 1, reviewerUserId: 1, targetUserId: 1 }, { unique: true })

// PATIENT 的求救事件；ADMIN 可確認、結案或標示誤觸。
const emergencySchema = new Schema(
  {
    patientUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'CareRecipient' },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    message: String,
    location: locationSchema,
    status: {
      type: String,
      enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM'],
      default: 'OPEN',
    },
    handledByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    hidden: { type: Boolean, default: false },
    hiddenAt: Date,
    hiddenByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

// model 將 Schema 變成可呼叫 find/create/update/delete 的資料庫操作物件。
// <any> 只放寬 route 層的 TypeScript 推論；資料寫入時仍會由上面的 Schema 驗證。
/* eslint-disable @typescript-eslint/no-explicit-any */
export const User = model<any>('User', userSchema)
export const CareRecipient = model<any>('CareRecipient', careRecipientSchema)
export const UserRecipientRelation = model<any>('UserRecipientRelation', relationSchema)
export const CaregiverProfile = model<any>('CaregiverProfile', caregiverSchema)
export const Favorite = model<any>('Favorite', favoriteSchema)
export const Availability = model<any>('Availability', availabilitySchema)
export const ServiceType = model<any>('ServiceType', serviceTypeSchema)
export const ServiceRequest = model<any>('ServiceRequest', serviceRequestSchema)
export const Booking = model<any>('Booking', bookingSchema)
export const InjuryReport = model<any>('InjuryReport', injuryReportSchema)
export const ServiceRecord = model<any>('ServiceRecord', serviceRecordSchema)
export const Review = model<any>('Review', reviewSchema)
export const EmergencyAlert = model<any>('EmergencyAlert', emergencySchema)
/* eslint-enable @typescript-eslint/no-explicit-any */
