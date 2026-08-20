import { Schema, model, type Types } from 'mongoose'

/** 一位 NURSE 可有多張政府證照與技能證明。 */
export interface ICaregiverCredential {
  caregiverId: Types.ObjectId
  kind: 'CERTIFICATE' | 'SKILL'
  name: string
  number?: string
  issuingAuthority?: string
  proficiencyLevel?: string
  yearsExperience?: number
  issuedAt?: Date
  expiresAt?: Date
  fileUrl: string
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
  verifiedByAdminId?: Types.ObjectId
  verifiedAt?: Date
  rejectionReason?: string
}

const caregiverCredentialSchema = new Schema<ICaregiverCredential>(
  {
    caregiverId: { type: Schema.Types.ObjectId, ref: 'CaregiverProfile', required: true },
    kind: { type: String, enum: ['CERTIFICATE', 'SKILL'], required: true },
    name: { type: String, required: true },
    number: String,
    issuingAuthority: String,
    proficiencyLevel: String,
    yearsExperience: Number,
    issuedAt: Date,
    expiresAt: Date,
    fileUrl: { type: String, required: true },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
      default: 'PENDING',
    },
    verifiedByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    rejectionReason: String,
  },
  { timestamps: true },
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CaregiverCredential = model<any>('CaregiverCredential', caregiverCredentialSchema)
