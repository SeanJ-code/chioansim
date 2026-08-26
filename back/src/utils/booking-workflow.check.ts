import assert from 'node:assert/strict'
import { canTransitionBooking, type BookingStatus } from './booking-policy'

const nurse = { userId: 'nurse', role: 'NURSE' as const }
const user = { userId: 'user', role: 'USER' as const }

const allowed: Array<[BookingStatus, BookingStatus, typeof nurse | typeof user]> = [
  ['PENDING', 'ACCEPTED', nurse],
  ['ACCEPTED', 'DEPARTED', nurse],
  ['DEPARTED', 'ARRIVED', nurse],
  ['ARRIVED', 'IN_SERVICE', nurse],
  ['IN_SERVICE', 'AWAITING_USER_CONFIRMATION', nurse],
  ['AWAITING_USER_CONFIRMATION', 'COMPLETED', user],
  ['WAITING_DECISION', 'ARRIVED', user],
]
const rejected: Array<[BookingStatus, BookingStatus, typeof nurse | typeof user]> = [
  ['PENDING', 'IN_SERVICE', nurse],
  ['PENDING', 'COMPLETED', user],
  ['ACCEPTED', 'COMPLETED', user],
  ['DEPARTED', 'COMPLETED', user],
  ['ARRIVED', 'COMPLETED', user],
  ['COMPLETED', 'IN_SERVICE', nurse],
  ['CANCELLED', 'ACCEPTED', nurse],
  ['ABANDONED', 'IN_SERVICE', nurse],
]

for (const [from, to, actor] of allowed) assert.equal(canTransitionBooking(from, to, actor).allowed, true, `${from} → ${to}`)
for (const [from, to, actor] of rejected) assert.equal(canTransitionBooking(from, to, actor).allowed, false, `${from} → ${to}`)

console.log('Booking workflow transition check passed')
