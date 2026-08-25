import 'dotenv/config'
import assert from 'node:assert/strict'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import {
  Booking, CaregiverProfile, CareRecipient, Review, ServiceRecord, ServiceRequest,
  ServiceType, User, UserRecipientRelation,
} from '../models'
import { Notification } from '../models/notification'
import { Complaint } from '../models/complaint'
import { CaregiverCredential, } from '../models/caregiver-credential'
import { CaregiverWorkJournal } from '../models/caregiver-work'

const password = 'AdminTest!2026'
const statuses = ['PENDING', 'ACCEPTED', 'DEPARTED', 'ARRIVED', 'IN_SERVICE', 'AWAITING_USER_CONFIRMATION', 'COMPLETED', 'CANCELLED', 'ABANDONED'] as const
const names = ['陳安心', '林暖暖', '王家和', '張守護', '李好照', '黃安康', '吳心怡', '劉相伴', '蔡平安', '楊樂齡']

const days = (offset: number) => new Date(Date.now() + offset * 86_400_000)
const location = (offset = 0) => ({ latitude: 25.033 + offset / 1000, longitude: 121.5654 + offset / 1000, address: '台北市測試服務區', accuracyMeters: 12, sharingExpiresAt: days(2) })

export async function seedAdminTestData(uri: string, namespace: 'test' | 'demo' = 'test') {
  assert(uri, 'MongoDB URI 未設定')
  if (namespace === 'test') assert(uri !== process.env.MONGODB_URI, '測試 Seed 禁止寫入主要資料庫')
  else assert(uri === process.env.MONGODB_URI && process.env.DEMO_SEED === '1', 'Demo Seed 必須明確寫入目前設定的主要資料庫')
  const isDemo = namespace === 'demo'
  const accountPrefix = isDemo ? 'demo' : 'test'
  const dashedPrefix = isDemo ? 'demo' : 'test'
  const titlePrefix = isDemo ? 'Demo' : '測試'
  const codePrefix = isDemo ? 'DEMO' : 'TEST'
  await mongoose.connect(uri)
  const passwordHash = await bcrypt.hash(password, 4)
  const upsertUser = (account: string, data: object) => User.findOneAndUpdate(
    { account }, { account, passwordHash, ...data }, { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  const admin = await upsertUser(`${accountPrefix}admin01`, { name: `${titlePrefix}管理員`, role: 'ADMIN', status: 'ACTIVE', email: `${dashedPrefix}-admin-01@example.test` })
  const users = await Promise.all(Array.from({ length: 30 }, (_, i) => upsertUser(`${accountPrefix}user${String(i + 1).padStart(2, '0')}`, {
    name: i === 29 ? '測試用非常非常長姓名邊界案例家庭主要聯絡人' : `${names[i % names.length]}${i + 1}`,
    role: 'USER', status: i === 1 ? 'PENDING' : i === 2 ? 'SUSPENDED' : 'ACTIVE',
    phone: i % 6 ? `0900${String(i + 1).padStart(6, '0')}` : undefined,
    email: `${dashedPrefix}-user-${i + 1}@example.test`,
  })))
  const nurses = await Promise.all(Array.from({ length: 10 }, (_, i) => upsertUser(`${accountPrefix}caregiver${String(i + 1).padStart(2, '0')}`, {
    name: `${titlePrefix}居服員${i + 1}`, role: 'NURSE', status: i === 9 ? 'PENDING' : 'ACTIVE',
    phone: `0911${String(i + 1).padStart(6, '0')}`, email: `${dashedPrefix}-caregiver-${i + 1}@example.test`,
  })))
  const caregivers = await Promise.all(nurses.map((user, i) => CaregiverProfile.findOneAndUpdate(
    { userId: user._id }, {
      userId: user._id, profilePhotoUrl: `https://api.dicebear.com/9.x/notionists/svg?seed=${dashedPrefix}-caregiver-${i + 1}`,
      introduction: `測試居服員 ${i + 1}，提供虛構測試服務。`, yearsExperience: i + 1,
      serviceAreas: ['台北市', i % 2 ? '新北市' : ''], certificateNumber: `${codePrefix}-CERT-${String(i + 1).padStart(2, '0')}`,
      certificateFileUrl: `/seed-assets/caregivers/nurse-${String(i + 1).padStart(2, '0')}-certificate.pdf`,
      certificateExpiresAt: days(i === 8 ? 15 : 365 + i), verificationStatus: i === 9 ? 'PENDING' : 'APPROVED', active: i !== 9,
      currentLocation: i < 3 ? location(i) : undefined,
    }, { upsert: true, new: true, setDefaultsOnInsert: true },
  )))

  const service = await ServiceType.findOneAndUpdate({ code: `${codePrefix}-DAILY` }, {
    code: `${codePrefix}-DAILY`, name: `${titlePrefix}生活照護`, description: 'Admin 展示資料專用', durationMinutes: 120, basePrice: 900, active: true,
  }, { upsert: true, new: true })

  const recipients = await Promise.all(Array.from({ length: 20 }, (_, i) => CareRecipient.findOneAndUpdate(
    { name: `${dashedPrefix}-recipient-${String(i + 1).padStart(2, '0')}` }, {
      createdByUserId: users[i % users.length]._id, name: `${dashedPrefix}-recipient-${String(i + 1).padStart(2, '0')}`,
      birthDate: new Date(1940 + i, i % 12, 1), gender: i % 2 ? '女' : '男', careLevel: `${i % 4 + 1} 級`,
      mobilityStatus: i % 3 ? '需要攙扶' : '可自行行走', assistiveDevices: i % 3 ? ['手杖'] : [],
      medicalNotes: '完全虛構的測試健康備註', attentionNotes: i === 19 ? '很長備註測試：'.repeat(80) : '服務前請先電話聯絡家屬。',
      carePhotoUrls: i % 5 ? [`https://api.dicebear.com/9.x/notionists/svg?seed=${dashedPrefix}-recipient-${i + 1}`] : [],
      address: { text: `台北市測試區安心路 ${i + 1} 號`, latitude: 25.03 + i / 1000, longitude: 121.56 + i / 1000 },
      emergencyContact: { name: users[i % users.length].name, phone: users[i % users.length].phone, relationship: '家屬' }, status: i === 18 ? 'INACTIVE' : 'ACTIVE',
    }, { upsert: true, new: true, setDefaultsOnInsert: true },
  )))
  await Promise.all(recipients.map((recipient, i) => UserRecipientRelation.findOneAndUpdate(
    { userId: users[i % users.length]._id, recipientId: recipient._id },
    { relationship: i % 2 ? '子女' : '家屬', isPrimaryContact: true, canBookService: true, canViewRecord: true, canCancelBooking: true },
    { upsert: true, new: true },
  )))
  await UserRecipientRelation.findOneAndUpdate(
    { userId: users[0]._id, recipientId: recipients[1]._id },
    { relationship: '家屬', isPrimaryContact: false, canBookService: true, canViewRecord: true }, { upsert: true },
  )

  const bookings = []
  for (let i = 0; i < 45; i += 1) {
    const status = statuses[i % statuses.length]!
    const start = days(i - 20); start.setHours(9 + i % 7, 0, 0, 0)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    await UserRecipientRelation.findOneAndUpdate(
      { userId: users[i % users.length]._id, recipientId: recipients[i % recipients.length]._id },
      { relationship: '測試授權家屬', canBookService: true, canViewRecord: true, canCancelBooking: true, status: 'ACTIVE' },
      { upsert: true },
    )
    const bookingNumber = `${dashedPrefix}-booking-${String(i + 1).padStart(3, '0')}`
    const request = await ServiceRequest.findOneAndUpdate({ specialRequirements: bookingNumber }, {
      requesterUserId: users[i % users.length]._id, recipientId: recipients[i % recipients.length]._id,
      serviceTypeIds: [service._id], preferredDate: start, preferredStartTime: `${String(start.getHours()).padStart(2, '0')}:00`, estimatedDuration: 120,
      serviceAddress: recipients[i % recipients.length].address, specialRequirements: bookingNumber,
      status: status === 'CANCELLED' ? 'CANCELLED' : status === 'COMPLETED' ? 'COMPLETED' : 'MATCHED',
    }, { upsert: true, new: true })
    const progressed = ['ACCEPTED', 'DEPARTED', 'ARRIVED', 'IN_SERVICE', 'AWAITING_USER_CONFIRMATION', 'COMPLETED'].includes(status)
    const booking = await Booking.findOneAndUpdate({ bookingNumber }, {
      bookingNumber, serviceRequestId: request._id,
      requesterUserId: users[i % users.length]._id, recipientId: recipients[i % recipients.length]._id,
      caregiverId: caregivers[i % 9]._id, serviceTypeIds: [service._id], scheduledStartAt: start, scheduledEndAt: end,
      serviceAddress: recipients[i % recipients.length].address, status,
      acceptedAt: progressed ? new Date(start.getTime() - 3_600_000) : undefined,
      departedAt: ['DEPARTED', 'ARRIVED', 'IN_SERVICE', 'AWAITING_USER_CONFIRMATION', 'COMPLETED'].includes(status) ? new Date(start.getTime() - 1_800_000) : undefined,
      arrivedAt: ['ARRIVED', 'IN_SERVICE', 'AWAITING_USER_CONFIRMATION', 'COMPLETED'].includes(status) ? start : undefined,
      serviceStartedAt: ['IN_SERVICE', 'AWAITING_USER_CONFIRMATION', 'COMPLETED'].includes(status) ? new Date(start.getTime() + 300_000) : undefined,
      completionRequestedAt: ['AWAITING_USER_CONFIRMATION', 'COMPLETED'].includes(status) ? new Date(end.getTime() - 300_000) : undefined,
      completedAt: status === 'COMPLETED' ? end : undefined, cancelledAt: ['CANCELLED', 'ABANDONED'].includes(status) ? start : undefined,
      cancellationReason: status === 'CANCELLED' ? ['使用者行程變更', '居服員臨時無法執行', 'Admin 協調取消'][i % 3]! : status === 'ABANDONED' ? '居服員臨時取消' : undefined,
      attendanceStatus: status === 'COMPLETED' ? 'COMPLETED' : i % 11 === 0 ? 'LATE' : status === 'ARRIVED' || status === 'IN_SERVICE' ? 'CHECKED_IN' : 'NOT_CHECKED_IN',
      latestLocation: ['DEPARTED', 'ARRIVED', 'IN_SERVICE'].includes(status) && i % 4 ? location(i % 5) : undefined,
    }, { upsert: true, new: true, setDefaultsOnInsert: true })
    bookings.push(booking)
  }

  const completed = bookings.filter((item) => item.status === 'COMPLETED')
  await Promise.all(completed.map((booking, i) => ServiceRecord.findOneAndUpdate({ bookingId: booking._id }, {
    bookingId: booking._id, recipientId: booking.recipientId, caregiverId: booking.caregiverId,
    completedItems: ['生活照護', '陪伴'], notes: i % 2 ? '今日協助生活照護，狀況正常。' : '服務開始時間較原預約晚 15 分鐘。',
    checkInLocation: location(i), checkOutLocation: location(i + 1), startedAt: booking.serviceStartedAt, completedAt: booking.completedAt,
  }, { upsert: true })))
  const ratings = [5, 4, 3, 2, 1]
  const reviews = await Promise.all(completed.map((booking, i) => Review.findOneAndUpdate(
    { bookingId: booking._id, reviewerUserId: booking.requesterUserId, targetRole: 'NURSE' },
    { bookingId: booking._id, reviewerUserId: booking.requesterUserId, targetUserId: nurses[i % 9]._id, targetRole: 'NURSE', rating: ratings[i % ratings.length],
      comment: ['服務細心且準時。', '整體服務符合期待。', '溝通可以更清楚。', '抵達時間稍晚。', '服務品質需要改善。'][i % 5] },
    { upsert: true, new: true },
  )))
  await Promise.all(caregivers.map(async (caregiver) => {
    const relevant = reviews.filter((review) => String(review.targetUserId) === String(caregiver.userId))
    await CaregiverProfile.findByIdAndUpdate(caregiver._id, { ratingCount: relevant.length, ratingAverage: relevant.length ? relevant.reduce((sum, r) => sum + r.rating, 0) / relevant.length : 0 })
  }))
  await Promise.all(caregivers.map((caregiver, i) => CaregiverCredential.findOneAndUpdate({ caregiverId: caregiver._id, number: `${codePrefix}-SKILL-${i + 1}` }, {
    caregiverId: caregiver._id, kind: 'SKILL', name: `${titlePrefix}照護技能`, number: `${codePrefix}-SKILL-${i + 1}`, fileUrl: '/seed-assets/caregivers/test.pdf', verificationStatus: i === 9 ? 'PENDING' : 'APPROVED', expiresAt: days(i === 8 ? 15 : 400),
  }, { upsert: true })))
  await Promise.all(bookings.slice(0, 12).map((booking, i) => Notification.findOneAndUpdate({ bookingId: booking._id, title: `${titlePrefix}通知 ${i + 1}` }, {
    recipientUserId: booking.requesterUserId, type: 'BOOKING', title: `${titlePrefix}通知 ${i + 1}`, message: i % 3 ? '預約狀態已有更新。' : '請確認本次服務安排。', bookingId: booking._id, status: i % 4 ? 'SENT' : 'READ', readAt: i % 4 ? undefined : new Date(),
  }, { upsert: true })))
  await Promise.all(bookings.slice(0, 5).map((booking, i) => Complaint.findOneAndUpdate({ bookingId: booking._id, description: `${dashedPrefix}-complaint-${i + 1}` }, {
    complainantUserId: booking.requesterUserId, targetUserId: nurses[i]._id, bookingId: booking._id, category: i % 2 ? '遲到' : '溝通', description: `${dashedPrefix}-complaint-${i + 1}`, priority: i === 0 ? 'HIGH' : 'NORMAL', status: i < 3 ? 'SUBMITTED' : 'RESOLVED', assignedAdminId: i < 3 ? undefined : admin._id,
  }, { upsert: true })))
  await Promise.all(bookings.slice(0, 8).map((booking, i) => CaregiverWorkJournal.findOneAndUpdate({ bookingId: booking._id, title: `測試工作日誌 ${i + 1}` }, {
    caregiverId: booking.caregiverId, bookingId: booking._id, title: `測試工作日誌 ${i + 1}`, content: i % 2 ? '家屬要求下次服務提前聯絡。' : '今日協助生活照護，狀況正常。', occurredAt: booking.scheduledStartAt, followUpRequired: i % 3 === 0,
  }, { upsert: true })))

  const counts = {
    users: await User.countDocuments({ account: new RegExp(`^${accountPrefix}user`) }), recipients: await CareRecipient.countDocuments({ name: new RegExp(`^${dashedPrefix}-recipient-`) }),
    caregivers: await User.countDocuments({ account: new RegExp(`^${accountPrefix}caregiver`) }), bookings: await Booking.countDocuments({ bookingNumber: new RegExp(`^${dashedPrefix}-booking-`) }),
    reviews: await Review.countDocuments({ bookingId: { $in: bookings.map((b) => b._id) } }), notifications: await Notification.countDocuments({ title: new RegExp(`^${titlePrefix}通知 `) }),
  }
  assert.deepEqual(counts, { users: 30, recipients: 20, caregivers: 10, bookings: 45, reviews: 5, notifications: 12 })
  return { admin: { account: admin.account, password }, counts }
}

if (require.main === module) {
  const demo = process.env.DEMO_SEED === '1'
  seedAdminTestData(demo ? process.env.MONGODB_URI || '' : process.env.ADMIN_TEST_MONGODB_URI || '', demo ? 'demo' : 'test')
    .then((result) => { console.log(result); return mongoose.disconnect() })
    .catch((error) => { console.error(error); process.exitCode = 1 })
}
