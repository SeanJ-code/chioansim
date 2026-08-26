import assert from 'node:assert/strict'
import { taipeiDateKey, taipeiDateTimeToUtc, taipeiWeekday } from './datetime'

assert.equal(taipeiDateTimeToUtc('2026-08-26', '14:00').toISOString(), '2026-08-26T06:00:00.000Z')
assert.equal(taipeiDateKey(new Date('2026-08-25T16:00:00.000Z')), '2026-08-26')
assert.equal(taipeiWeekday('2026-08-26'), 3)
assert.throws(() => taipeiDateTimeToUtc('2026-02-30', '14:00'))
assert.throws(() => taipeiDateTimeToUtc('2026-08-26', '24:00'))
console.log('Datetime contract check passed')
