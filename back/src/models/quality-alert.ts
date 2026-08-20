import { Schema, model, type Types } from 'mongoose'

/**
 * 服務品質警訊：目前由「同一位居服員累積三次以上一星評價」自動建立。
 * 警訊與評價分開保存，才能記錄管理員後續警告、約談與結案處置。
 */
export interface IQualityAlert {
  caregiverId: Types.ObjectId
  caregiverUserId: Types.ObjectId
  type: 'THREE_ONE_STAR_REVIEWS' | 'HIGH_RISK_KEYWORD'
  severity: 'HIGH' | 'URGENT'
  title: string
  description: string
  reviewIds: Types.ObjectId[]
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'
  action?: 'WARNED' | 'INTERVIEW_REQUIRED' | 'SUSPEND_RECOMMENDED' | 'CLOSED'
  adminNote?: string
  handledByAdminId?: Types.ObjectId
  handledAt?: Date
}

const qualityAlertSchema = new Schema<IQualityAlert>(
  {
    caregiverId: { type: Schema.Types.ObjectId, ref: 'CaregiverProfile', required: true },
    caregiverUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['THREE_ONE_STAR_REVIEWS', 'HIGH_RISK_KEYWORD'],
      required: true,
    },
    severity: { type: String, enum: ['HIGH', 'URGENT'], default: 'HIGH' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    reviewIds: [{ type: Schema.Types.ObjectId, ref: 'Review' }],
    status: { type: String, enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'], default: 'OPEN' },
    action: {
      type: String,
      enum: ['WARNED', 'INTERVIEW_REQUIRED', 'SUSPEND_RECOMMENDED', 'CLOSED'],
    },
    adminNote: String,
    handledByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    handledAt: Date,
  },
  { timestamps: true },
)

qualityAlertSchema.index({ caregiverId: 1, status: 1, createdAt: -1 })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const QualityAlert = model<any>('QualityAlert', qualityAlertSchema)
