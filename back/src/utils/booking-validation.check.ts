import assert from 'node:assert/strict'
import { bookingCreateSchema, bookingRescheduleSchema } from './booking-validation'

async function check() {
  const id = '507f1f77bcf86cd799439011'
  await bookingCreateSchema.validate({ availabilityId: `${id}|2026-08-26|10:00|12:00`, serviceTypeIds: [id], serviceAddress: { text: '花蓮縣測試路 1 號' } })
  await bookingRescheduleSchema.validate({ date: '2026-08-26', startTime: '12:00', endTime: '14:00' })
  await assert.rejects(bookingCreateSchema.validate({ availabilityId: 'bad', serviceTypeIds: [], serviceAddress: {} }))
  await assert.rejects(bookingRescheduleSchema.validate({ date: '2026-02-30', startTime: 'x', endTime: '14:00' }))
  console.log('Booking payload validation check passed')
}

void check()
