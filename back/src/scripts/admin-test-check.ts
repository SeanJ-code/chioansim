import 'dotenv/config'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { Booking, CaregiverProfile, CareRecipient, Review, User, UserRecipientRelation } from '../models'
import { Notification } from '../models/notification'

async function check() {
  const uri = process.env.ADMIN_TEST_MONGODB_URI || ''
  assert(uri && !/\/chioansim(?:\?|$)/.test(uri), '只允許檢查隔離測試資料庫')
  await mongoose.connect(uri)
  const bookings = await Booking.find({ bookingNumber: /^test-booking-/ })
  const [users, recipients, caregivers, relations] = await Promise.all([
    User.find({ _id: { $in: bookings.map((b) => b.requesterUserId) } }).distinct('_id'),
    CareRecipient.find({ _id: { $in: bookings.map((b) => b.recipientId) } }).distinct('_id'),
    CaregiverProfile.find({ _id: { $in: bookings.map((b) => b.caregiverId) } }).distinct('_id'),
    UserRecipientRelation.find({ recipientId: { $in: bookings.map((b) => b.recipientId) } }),
  ])
  const linked = (ids: unknown[]) => new Set(ids.map(String))
  const userIds = linked(users), recipientIds = linked(recipients), caregiverIds = linked(caregivers)
  const problems = {
    orphanUsers: bookings.filter((b) => !userIds.has(String(b.requesterUserId))).length,
    orphanRecipients: bookings.filter((b) => !recipientIds.has(String(b.recipientId))).length,
    orphanCaregivers: bookings.filter((b) => !caregiverIds.has(String(b.caregiverId))).length,
    recipientsWithoutRelation: bookings.filter((b) => !relations.some((r) => String(r.recipientId) === String(b.recipientId) && String(r.userId) === String(b.requesterUserId))).length,
    pendingWithCompletion: bookings.filter((b) => b.status === 'PENDING' && b.completedAt).length,
    cancelledInProgress: bookings.filter((b) => ['CANCELLED', 'ABANDONED'].includes(b.status) && (b.serviceStartedAt || b.completedAt)).length,
    completedWithoutTime: bookings.filter((b) => b.status === 'COMPLETED' && !b.completedAt).length,
    invalidGps: bookings.filter((b) => b.latestLocation && (Math.abs(b.latestLocation.latitude) > 90 || Math.abs(b.latestLocation.longitude) > 180)).length,
  }
  assert(Object.values(problems).every((count) => count === 0), JSON.stringify(problems))
  console.log({ bookings: bookings.length, reviews: await Review.countDocuments({ bookingId: { $in: bookings.map((b) => b._id) } }), notifications: await Notification.countDocuments({ bookingId: { $in: bookings.map((b) => b._id) } }), problems })
  await mongoose.disconnect()
}

check().catch((error) => { console.error(error); process.exitCode = 1 })
