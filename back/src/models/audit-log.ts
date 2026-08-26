import { Schema, model, type Types } from 'mongoose'

/** ADMIN 的重要操作紀錄只能新增，不提供一般修改或刪除 API。 */
export interface IAuditLog {
  adminUserId?: Types.ObjectId
  actorUserId?: Types.ObjectId
  actorRole?: string
  action: string
  targetCollection: string
  targetId?: string
  entityType?: string
  entityId?: Types.ObjectId
  beforeData?: unknown
  afterData?: unknown
  before?: unknown
  after?: unknown
  requestId?: string
  reason?: string
  ipAddress?: string
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    adminUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole: String,
    action: { type: String, required: true },
    targetCollection: { type: String, required: true },
    targetId: String,
    entityType: String,
    entityId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    beforeData: Schema.Types.Mixed,
    afterData: Schema.Types.Mixed,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    requestId: String,
    reason: String,
    ipAddress: String,
  },
  { timestamps: true },
)

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AuditLog = model<any>('AuditLog', auditLogSchema)
