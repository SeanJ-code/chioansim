import { Schema, model, type Types } from 'mongoose'

/** 正式申訴案件；與一般星等評價、緊急求救分開保存。 */
export interface IComplaint {
  complainantUserId: Types.ObjectId
  targetUserId?: Types.ObjectId
  bookingId?: Types.ObjectId
  category: string
  description: string
  evidenceUrls: string[]
  status:
    'SUBMITTED' | 'UNDER_REVIEW' | 'NEED_MORE_INFORMATION' | 'RESOLVED' | 'REJECTED' | 'CANCELLED'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  assignedAdminId?: Types.ObjectId
  adminDecision?: string
  resolutionNote?: string
  resolvedAt?: Date
}

const complaintSchema = new Schema<IComplaint>(
  {
    complainantUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    category: { type: String, required: true },
    description: { type: String, required: true },
    evidenceUrls: [String],
    status: {
      type: String,
      enum: [
        'SUBMITTED',
        'UNDER_REVIEW',
        'NEED_MORE_INFORMATION',
        'RESOLVED',
        'REJECTED',
        'CANCELLED',
      ],
      default: 'SUBMITTED',
    },
    priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' },
    assignedAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    adminDecision: String,
    resolutionNote: String,
    resolvedAt: Date,
  },
  { timestamps: true },
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Complaint = model<any>('Complaint', complaintSchema)
