import { Schema, model, type Types } from 'mongoose'

/**
 * 居服員的私人工作日誌。
 * 正式服務成果仍放在 ServiceRecord；本表保存交班提醒、心得與後續追蹤事項。
 */
export interface ICaregiverWorkJournal {
  caregiverId: Types.ObjectId
  bookingId?: Types.ObjectId
  title: string
  content: string
  mood?: 'STEADY' | 'TIRED' | 'WORRIED' | 'FULFILLED'
  occurredAt: Date
  followUpRequired: boolean
  /** 日誌佐證照片僅存檔案網址，實際檔案由 uploads 管理。 */
  photoUrls: string[]
  hidden: boolean
  hiddenAt?: Date
}

const caregiverWorkJournalSchema = new Schema<ICaregiverWorkJournal>(
  {
    caregiverId: { type: Schema.Types.ObjectId, ref: 'CaregiverProfile', required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    content: { type: String, required: true, trim: true, maxlength: 3000 },
    mood: {
      type: String,
      enum: ['STEADY', 'TIRED', 'WORRIED', 'FULFILLED'],
      default: 'STEADY',
    },
    occurredAt: { type: Date, required: true },
    followUpRequired: { type: Boolean, default: false },
    photoUrls: { type: [String], default: [] },
    hidden: { type: Boolean, default: false },
    hiddenAt: Date,
  },
  { timestamps: true },
)

caregiverWorkJournalSchema.index({ caregiverId: 1, occurredAt: -1 })

/** 居服員請假申請；送出後由管理員審核，不會直接刪除既有預約。 */
export interface ICaregiverLeaveRequest {
  caregiverId: Types.ObjectId
  startAt: Date
  endAt: Date
  leaveType: 'PERSONAL' | 'SICK' | 'FAMILY' | 'OTHER'
  reason: string
  /** 病假時由居服員上傳的假單或診斷證明。 */
  proofFileUrl?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  adminNote?: string
  reviewedByAdminId?: Types.ObjectId
  reviewedAt?: Date
  hidden: boolean
  hiddenAt?: Date
}

const caregiverLeaveRequestSchema = new Schema<ICaregiverLeaveRequest>(
  {
    caregiverId: { type: Schema.Types.ObjectId, ref: 'CaregiverProfile', required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    leaveType: {
      type: String,
      enum: ['PERSONAL', 'SICK', 'FAMILY', 'OTHER'],
      required: true,
    },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    proofFileUrl: String,
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
    },
    adminNote: String,
    reviewedByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    hidden: { type: Boolean, default: false },
    hiddenAt: Date,
  },
  { timestamps: true },
)

caregiverLeaveRequestSchema.index({ caregiverId: 1, startAt: -1 })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CaregiverWorkJournal = model<any>('CaregiverWorkJournal', caregiverWorkJournalSchema)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CaregiverLeaveRequest = model<any>('CaregiverLeaveRequest', caregiverLeaveRequestSchema)
