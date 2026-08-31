import { Availability, Booking } from '../models'
import { CaregiverLeaveRequest } from '../models/caregiver-work'
import { taipeiDateKey, taipeiDateTimeToUtc } from './datetime'

export const ACTIVE_BOOKING_STATUSES = ['ACCEPTED', 'DEPARTED', 'ARRIVED', 'WAITING_DECISION', 'IN_SERVICE', 'AWAITING_USER_CONFIRMATION'] as const
export const BLOCKING_BOOKING_STATUSES = ['PENDING', ...ACTIVE_BOOKING_STATUSES] as const

export const intervalsOverlap = (startA: Date, endA: Date, startB: Date, endB: Date) => startA < endB && endA > startB

export const findApprovedLeaveConflict = (caregiverId: unknown, startAt: Date, endAt: Date) => CaregiverLeaveRequest.findOne({ caregiverId, status: 'APPROVED', hidden: { $ne: true }, startAt: { $lt: endAt }, endAt: { $gt: startAt } })
export const findPendingLeaveConflict = (caregiverId: unknown, startAt: Date, endAt: Date) => CaregiverLeaveRequest.findOne({ caregiverId, status: 'PENDING', hidden: { $ne: true }, startAt: { $lt: endAt }, endAt: { $gt: startAt } })
export const findBookingConflict = (caregiverId: unknown, startAt: Date, endAt: Date, excludeId?: unknown, statuses: readonly string[] = BLOCKING_BOOKING_STATUSES) => Booking.find({ ...(excludeId ? { _id: { $ne: excludeId } } : {}), caregiverId, status: { $in: statuses }, hidden: { $ne: true }, scheduledStartAt: { $lt: endAt }, scheduledEndAt: { $gt: startAt } })

export async function findAvailabilityConflict(caregiverId: unknown, startAt: Date, endAt: Date) {
  const day = taipeiDateKey(startAt)
  const dayStart = new Date(`${day}T00:00:00.000Z`)
  const items = await Availability.find({ caregiverId, status: 'UNAVAILABLE', hidden: { $ne: true }, date: { $gte: dayStart, $lt: new Date(dayStart.getTime() + 86_400_000) } })
  return items.find((item) => intervalsOverlap(startAt, endAt, taipeiDateTimeToUtc(day, item.get('startTime')), taipeiDateTimeToUtc(day, item.get('endTime')))) || null
}
