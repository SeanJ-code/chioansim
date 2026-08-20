import { Schema, model, type Types } from 'mongoose'

/** ADMIN 的重要操作紀錄只能新增，不提供一般修改或刪除 API。 */
export interface IAuditLog {
  adminUserId: Types.ObjectId
  action: string
  targetCollection: string
  targetId?: string
  beforeData?: unknown
  afterData?: unknown
  reason?: string
  ipAddress?: string
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    adminUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    targetCollection: { type: String, required: true },
    targetId: String,
    beforeData: Schema.Types.Mixed,
    afterData: Schema.Types.Mixed,
    reason: String,
    ipAddress: String,
  },
  { timestamps: true },
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AuditLog = model<any>('AuditLog', auditLogSchema)
