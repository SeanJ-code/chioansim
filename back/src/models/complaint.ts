import { Schema, model, type Types } from 'mongoose'

/** 正式申訴案件；與一般星等評價、緊急求救分開保存。 */
export interface IComplaint {
  complainantUserId: Types.ObjectId
  targetUserId?: Types.ObjectId
  bookingId?: Types.ObjectId
  category: string
  description: string
  evidenceUrls: string[]
  reportNumber?: string
  status: 'SUBMITTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  assignedAdminId?: Types.ObjectId
  acknowledgedBy?: Types.ObjectId
  acknowledgedAt?: Date
  activities: Array<{ type: string; label: string; actorRole: string; createdAt: Date }>
  replies: Array<{ authorUserId: Types.ObjectId; authorRole: 'ADMIN' | 'NURSE'; message: string; createdAt: Date }>
  adminDecision?: string
  resolutionNote?: string
  resolvedAt?: Date
}

const complaintSchema = new Schema<IComplaint>(
  {
    complainantUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    reportNumber: { type: String, unique: true, sparse: true, index: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    evidenceUrls: [String],
    status: {
      type: String,
      enum: [
        'SUBMITTED',
        'ACKNOWLEDGED',
        'IN_PROGRESS',
        'UNDER_REVIEW',
        'NEED_MORE_INFORMATION',
        'RESOLVED',
        'CLOSED',
        'NEED_MORE_INFORMATION',
        'REJECTED',
        'CANCELLED',
      ],
      default: 'SUBMITTED',
    },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'NORMAL', 'URGENT'], default: 'MEDIUM' },
    assignedAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: Date,
    activities: [{ _id: false, type: String, label: String, actorRole: String, createdAt: { type: Date, default: Date.now } }],
    replies: [{ authorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, authorRole: { type: String, enum: ['ADMIN', 'NURSE'], required: true }, message: { type: String, required: true, trim: true, maxlength: 2000 }, createdAt: { type: Date, default: Date.now } }],
    adminDecision: String,
    resolutionNote: String,
    resolvedAt: Date,
  },
  { timestamps: true },
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Complaint = model<any>('Complaint', complaintSchema)
