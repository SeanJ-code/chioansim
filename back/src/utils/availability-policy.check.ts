import assert from 'node:assert/strict'
import { intervalsOverlap, requireSchedulingInterval } from './availability-policy'

const at = (hour: number) => new Date(Date.UTC(2026, 8, 18, hour))
assert.equal(intervalsOverlap(at(9), at(12), at(14), at(16)), false)
assert.equal(intervalsOverlap(at(9), at(13), at(12), at(15)), true)
assert.equal(intervalsOverlap(at(9), at(12), at(12), at(15)), false)
assert.equal(intervalsOverlap(at(12), at(15), at(9), at(12)), false)
assert.throws(() => requireSchedulingInterval(at(9), undefined), (error: unknown) => error instanceof Error && 'code' in error && error.code === 'BOOKING_INTERVAL_INVALID')
assert.throws(() => requireSchedulingInterval(at(12), at(9)), (error: unknown) => error instanceof Error && 'code' in error && error.code === 'BOOKING_INTERVAL_INVALID')
