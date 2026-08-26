import type { AuthRequest } from '../types/auth'
import { AuditLog } from '../models/audit-log'
import type { BookingActor } from './booking-policy'

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
    ...(request.auth.role === 'ADMIN' ? { adminUserId: request.auth.userId } : {}),
    actorUserId: request.auth.userId,
    actorRole: request.auth.role,
    action,
    targetCollection,
    targetId,
    beforeData,
    afterData,
    reason: request.body?.reason,
    ipAddress: request.ip,
  })
}

export async function recordBookingAudit(
  actor: BookingActor,
  action: string,
  bookingId: unknown,
  before: unknown,
  after: unknown,
  requestId?: string,
): Promise<void> {
  await AuditLog.create({
    ...(actor.role === 'ADMIN' ? { adminUserId: actor.userId } : {}),
    actorUserId: actor.userId,
    actorRole: actor.role,
    action,
    targetCollection: 'bookings',
    targetId: String(bookingId),
    entityType: 'BOOKING',
    entityId: bookingId,
    beforeData: before,
    afterData: after,
    before,
    after,
    requestId,
  })
}
