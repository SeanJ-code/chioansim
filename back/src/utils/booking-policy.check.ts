import assert from 'node:assert/strict'
import {
  isCancellationRefundEligible,
  LOCATION_SHARING_STATUSES,
  nextBookingCompletionStatus,
} from './booking-policy'

const now = new Date('2026-08-12T09:00:00+08:00')
assert.equal(
  isCancellationRefundEligible('ACCEPTED', new Date('2026-08-15T09:00:00+08:00'), now),
  true,
)
assert.equal(
  isCancellationRefundEligible('ACCEPTED', new Date('2026-08-15T08:59:59+08:00'), now),
  false,
)
assert.equal(
  isCancellationRefundEligible('PENDING', new Date('2026-08-12T10:00:00+08:00'), now),
  true,
)
assert.equal(nextBookingCompletionStatus('IN_SERVICE', 'NURSE'), 'AWAITING_USER_CONFIRMATION')
assert.equal(nextBookingCompletionStatus('ACCEPTED', 'NURSE'), null)
assert.equal(nextBookingCompletionStatus('ARRIVED', 'NURSE'), null)
assert.equal(nextBookingCompletionStatus('AWAITING_USER_CONFIRMATION', 'USER'), 'COMPLETED')
assert.equal(nextBookingCompletionStatus('ACCEPTED', 'USER'), null)
assert.deepEqual(LOCATION_SHARING_STATUSES, ['DEPARTED', 'ARRIVED'])
console.log('預約規則檢查通過')
