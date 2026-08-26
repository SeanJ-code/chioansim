import type { Role } from '../models'

export const BOOKING_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'DEPARTED',
  'ARRIVED',
  'WAITING_DECISION',
  'IN_SERVICE',
  'AWAITING_USER_CONFIRMATION',
  'COMPLETED',
  'CANCELLED',
  'ABANDONED',
] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]
export type BookingActor = Pick<{ userId: string; role: Role }, 'userId' | 'role'>

const transitions: Partial<Record<BookingStatus, Partial<Record<BookingStatus, readonly Role[]>>>> = {
  PENDING: {
    PENDING: ['USER', 'PATIENT', 'ADMIN'],
    ACCEPTED: ['NURSE'],
    CANCELLED: ['USER', 'PATIENT', 'ADMIN'],
    ABANDONED: ['NURSE'],
  },
  ACCEPTED: {
    PENDING: ['USER', 'PATIENT', 'ADMIN'],
    DEPARTED: ['NURSE'],
    CANCELLED: ['USER', 'PATIENT', 'ADMIN'],
    ABANDONED: ['NURSE'],
  },
  DEPARTED: {
    ARRIVED: ['NURSE'],
    CANCELLED: ['USER', 'PATIENT', 'ADMIN'],
    ABANDONED: ['NURSE'],
  },
  ARRIVED: {
    WAITING_DECISION: ['USER', 'PATIENT', 'NURSE', 'ADMIN'],
    IN_SERVICE: ['NURSE'],
    CANCELLED: ['USER', 'PATIENT', 'ADMIN'],
    ABANDONED: ['NURSE'],
  },
  WAITING_DECISION: {
    ARRIVED: ['USER', 'PATIENT', 'ADMIN'],
    CANCELLED: ['USER', 'PATIENT', 'ADMIN'],
    ABANDONED: ['NURSE'],
  },
  IN_SERVICE: { AWAITING_USER_CONFIRMATION: ['NURSE'] },
  AWAITING_USER_CONFIRMATION: { COMPLETED: ['USER', 'PATIENT', 'ADMIN'] },
}

export function canTransitionBooking(
  currentStatus: string,
  nextStatus: string,
  actor: BookingActor,
  _booking?: unknown,
): { allowed: boolean; message?: string } {
  const roles = transitions[currentStatus as BookingStatus]?.[nextStatus as BookingStatus]
  return roles?.includes(actor.role)
    ? { allowed: true }
    : { allowed: false, message: `不可由 ${currentStatus} 變更為 ${nextStatus}` }
}

export function isCancellationRefundEligible(
  status: string,
  scheduledStartAt: Date,
  now = new Date(),
): boolean {
  return status === 'PENDING' || scheduledStartAt.getTime() - now.getTime() >= 72 * 60 * 60 * 1000
}

export function nextBookingCompletionStatus(status: string, actor: 'NURSE' | 'USER') {
  if (actor === 'NURSE' && status === 'IN_SERVICE')
    return 'AWAITING_USER_CONFIRMATION' as const
  if (actor === 'USER' && status === 'AWAITING_USER_CONFIRMATION') return 'COMPLETED' as const
  return null
}

export const LOCATION_SHARING_STATUSES = ['DEPARTED', 'ARRIVED'] as const
