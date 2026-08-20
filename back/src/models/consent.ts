import { Schema, model, type Types } from 'mongoose'

/** 記錄 USER 代表自己或受照護者同意的文件版本與時間。 */
export interface IConsent {
  userId: Types.ObjectId
  recipientId?: Types.ObjectId
  documentType: string
  documentVersion: string
  fileUrl?: string
  agreedAt: Date
  revokedAt?: Date
  status: 'ACTIVE' | 'REVOKED'
}

const consentSchema = new Schema<IConsent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'CareRecipient' },
    documentType: { type: String, required: true },
    documentVersion: { type: String, required: true },
    fileUrl: String,
    agreedAt: { type: Date, default: Date.now },
    revokedAt: Date,
    status: { type: String, enum: ['ACTIVE', 'REVOKED'], default: 'ACTIVE' },
  },
  { timestamps: true },
)
consentSchema.index(
  { userId: 1, recipientId: 1, documentType: 1, documentVersion: 1 },
  { unique: true },
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Consent = model<any>('Consent', consentSchema)
