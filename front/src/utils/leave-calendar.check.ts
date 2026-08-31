import assert from 'node:assert/strict'
// @ts-expect-error Node 的原生 TypeScript 執行需要保留副檔名。
import { leaveCalendarSegments } from './leave-calendar.ts'

const segments = leaveCalendarSegments({ _id: '1', startAt: '2026-09-18T07:00:00.000Z', endAt: '2026-09-20T03:00:00.000Z' })
assert.deepEqual(segments.map((item) => item.date), ['2026-09-18', '2026-09-19', '2026-09-20'])
assert.equal(segments[0]?.startTime, '15:00')
assert.equal(segments[2]?.startTime, '00:00')
