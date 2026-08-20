import type { AuthRequest } from '../types/auth'
import { AuditLog } from '../models/audit-log'

/** 集中寫入 ADMIN 稽核紀錄，避免各 route 重複組合欄位。 */
export async function recordAudit(
  request: AuthRequest,
  action: string,
  targetCollection: string,
  targetId?: string,
  beforeData?: unknown,
  afterData?: unknown,
): Promise<void> {
  if (!request.auth?.userId) return
  await AuditLog.create({
    adminUserId: request.auth.userId,
    action,
    targetCollection,
    targetId,
    beforeData,
    afterData,
    reason: request.body?.reason,
    ipAddress: request.ip,
  })
}
