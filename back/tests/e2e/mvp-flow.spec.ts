import 'dotenv/config'
import { expect, test } from '@playwright/test'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { testUri } from '../../playwright.config'
import { Booking, CaregiverProfile, ServiceType, User, UserRecipientRelation } from '../../src/models'
import { QualityAlert } from '../../src/models/quality-alert'
import { Notification } from '../../src/models/notification'
import { AuditLog } from '../../src/models/audit-log'

const suffix = Date.now().toString(36)
const password = 'E2e安心測試11'
let userToken = ''
let nurseToken = ''
let outsiderToken = ''
let outsiderNurseToken = ''
let adminToken = ''
let nurseUserId = ''
let caregiverId = ''
let recipientId = ''
let serviceTypeId = ''

function headers(token: string) { return { Authorization: `Bearer ${token}` } }

function nextWeekday(offset: number) {
  const date = new Date(Date.now() + offset * 86_400_000)
  while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1)
  return date
}

test.beforeAll(async ({ request }) => {
  if (!testUri || testUri === process.env.MONGODB_URI) throw new Error('無法建立獨立 E2E 資料庫網址')
  await mongoose.connect(testUri)
  const [user, nurse, outsider, outsiderNurse, admin] = await User.create([
    { account: `e2euser${suffix}`, passwordHash: await bcrypt.hash(password, 4), name: '安心測試家屬', role: 'USER' },
    { account: `e2enurse${suffix}`, passwordHash: await bcrypt.hash(password, 4), name: '安心測試居服員', role: 'NURSE' },
    { account: `e2eoutsider${suffix}`, passwordHash: await bcrypt.hash(password, 4), name: '只能查看的家屬', role: 'USER' },
    { account: `e2eoutsidernurse${suffix}`, passwordHash: await bcrypt.hash(password, 4), name: '無關居服員', role: 'NURSE' },
    { account: `e2eadmin${suffix}`, passwordHash: await bcrypt.hash(password, 4), name: '安心測試管理員', role: 'ADMIN' },
  ])
  nurseUserId = nurse.id
  const caregiver = await CaregiverProfile.create({
    userId: nurse._id,
    profilePhotoUrl: '/uploads/e2e-profile.png',
    certificateNumber: `E2E-${suffix}`,
    certificateFileUrl: '/uploads/e2e-certificate.png',
    verificationStatus: 'APPROVED',
    active: true,
  })
  caregiverId = caregiver.id
  await CaregiverProfile.create({
    userId: outsiderNurse._id,
    profilePhotoUrl: '/uploads/e2e-outsider.png',
    certificateNumber: `E2E-OUT-${suffix}`,
    certificateFileUrl: '/uploads/e2e-outsider-certificate.png',
    verificationStatus: 'APPROVED',
    active: true,
  })
  const serviceType = await ServiceType.findOneAndUpdate(
    { name: 'E2E 基本日常照顧' },
    { name: 'E2E 基本日常照顧', durationMinutes: 60, basePrice: 100, active: true },
    { upsert: true, new: true },
  )
  serviceTypeId = serviceType.id

  for (const [account, target] of [
    [user.get('account'), 'user'],
    [nurse.get('account'), 'nurse'],
    [outsider.get('account'), 'outsider'],
    [outsiderNurse.get('account'), 'outsiderNurse'],
    [admin.get('account'), 'admin'],
  ] as const) {
    const result = await request.post('/auth/login', { data: { account, password } })
    expect(result.ok(), `${result.status()} ${await result.text()}`).toBeTruthy()
    const token = (await result.json()).accessToken
    if (target === 'user') userToken = token
    else if (target === 'nurse') nurseToken = token
    else if (target === 'outsider') outsiderToken = token
    else if (target === 'outsiderNurse') outsiderNurseToken = token
    else adminToken = token
  }

  const recipient = await request.post('/patients', {
    headers: headers(userToken),
    data: { name: '安心測試受照護者', relationship: '家屬', weightKg: 70, mobilityStatus: '需要攙扶' },
  })
  expect(recipient.status()).toBe(201)
  recipientId = (await recipient.json())._id
  await UserRecipientRelation.create({ userId: outsider._id, recipientId, relationship: '親屬', canViewRecord: true, canCancelBooking: false, status: 'ACTIVE' })
})

test.afterAll(async () => {
  if (mongoose.connection.readyState && mongoose.connection.name === 'chioansim_e2e') {
    await mongoose.connection.dropDatabase()
  }
  await mongoose.disconnect()
})

test('註冊後核心閉環：預約、接單、GPS、完成、低星警訊', async ({ request }) => {
  for (let index = 1; index <= 3; index += 1) {
    const date = nextWeekday(index + 2)
    const dateText = date.toISOString().slice(0, 10)
    const created = await request.post('/bookings', {
      headers: headers(userToken),
      data: {
        availabilityId: `${caregiverId}|${dateText}|09:00|10:00`, recipientId,
        serviceTypeIds: [serviceTypeId], serviceAddress: { text: '花蓮縣測試路 1 號' },
      },
    })
    expect(created.status()).toBe(201)
    const bookingId = (await created.json())._id

    expect((await request.post(`/bookings/${bookingId}/accept`, { headers: headers(nurseToken) })).ok()).toBeTruthy()
    const refusedLocation = await request.post(`/bookings/${bookingId}/depart`, {
      headers: headers(nurseToken),
      data: { location: { latitude: 23.991, longitude: 121.611 } },
    })
    expect(refusedLocation.status()).toBe(400)
    expect((await request.post(`/bookings/${bookingId}/depart`, {
      headers: headers(nurseToken),
      data: { location: { latitude: 23.991, longitude: 121.611, consent: true } },
    })).ok()).toBeTruthy()
    expect((await request.post(`/bookings/${bookingId}/arrive`, {
      headers: headers(nurseToken),
      data: { location: { latitude: 23.992, longitude: 121.612, consent: true } },
    })).ok()).toBeTruthy()
    expect((await request.post(`/bookings/${bookingId}/start`, { headers: headers(nurseToken) })).ok()).toBeTruthy()
    expect((await request.post(`/bookings/${bookingId}/complete`, {
      headers: headers(nurseToken), data: { completedItems: ['基本日常照顧'] },
    })).ok()).toBeTruthy()
    expect((await request.post(`/bookings/${bookingId}/confirm-completion`, { headers: headers(userToken) })).ok()).toBeTruthy()

    const review = await request.post('/feedback/reviews', {
      headers: headers(userToken),
      multipart: { bookingId, targetUserId: nurseUserId, rating: '1', comment: `第 ${index} 次 E2E 低星測試` },
    })
    expect(review.status()).toBe(201)
    expect((await Booking.findById(bookingId))?.get('latestLocation')).toBeUndefined()
  }
  expect(await QualityAlert.exists({ caregiverId, type: 'THREE_ONE_STAR_REVIEWS' })).toBeTruthy()
  expect(await Notification.countDocuments({ type: 'BOOKING', status: 'SENT' })).toBe(18)
})

test('Workflow 權限、競爭更新與 Audit', async ({ request }) => {
  const dateText = nextWeekday(20).toISOString().slice(0, 10)
  const created = await request.post('/bookings', {
    headers: headers(userToken),
    data: { availabilityId: `${caregiverId}|${dateText}|13:00|14:00`, recipientId, serviceTypeIds: [serviceTypeId], serviceAddress: { text: '花蓮縣測試路 2 號' } },
  })
  expect(created.status()).toBe(201)
  const bookingId = (await created.json())._id

  expect((await request.post(`/bookings/${bookingId}/accept`, { headers: headers(outsiderNurseToken) })).status()).toBe(403)
  expect((await request.post(`/bookings/${bookingId}/cancel`, { headers: headers(outsiderToken), data: { reason: '無權取消測試' } })).status()).toBe(403)

  const results = await Promise.all([
    request.post(`/bookings/${bookingId}/accept`, { headers: headers(nurseToken) }),
    request.post(`/bookings/${bookingId}/accept`, { headers: headers(nurseToken) }),
  ])
  expect(results.map((result) => result.status()).sort()).toEqual([200, 409])

  const audit = await AuditLog.findOne({ entityType: 'BOOKING', entityId: bookingId, action: 'BOOKING_ACCEPTED' })
  expect(String(audit?.get('actorUserId'))).toBe(nurseUserId)
  expect(audit?.get('actorRole')).toBe('NURSE')
  expect(audit?.get('before.status')).toBe('PENDING')
  expect(audit?.get('after.status')).toBe('ACCEPTED')

  expect((await request.patch(`/bookings/${bookingId}`, { headers: headers(adminToken), data: { status: 'COMPLETED' } })).status()).toBe(422)
  expect((await Booking.findById(bookingId))?.get('status')).toBe('ACCEPTED')
})

test('已確認任務可改期並取消，使用者與居服員讀到同一狀態', async ({ request }) => {
  const dateText = nextWeekday(12).toISOString().slice(0, 10)
  const created = await request.post('/bookings', { headers: headers(userToken), data: { availabilityId: `${caregiverId}|${dateText}|09:00|10:00`, recipientId, serviceTypeIds: [serviceTypeId], serviceAddress: { text: '花蓮縣測試路 1 號' } } })
  expect(created.status()).toBe(201)
  const bookingId = (await created.json())._id
  await request.post(`/bookings/${bookingId}/accept`, { headers: headers(nurseToken) })
  const changed = await request.patch(`/bookings/${bookingId}/reschedule`, { headers: headers(userToken), data: { date: dateText, startTime: '11:00', endTime: '12:00' } })
  expect(changed.status()).toBe(200)
  expect((await changed.json()).status).toBe('PENDING')
  await request.post(`/bookings/${bookingId}/accept`, { headers: headers(nurseToken) })
  expect((await request.post(`/bookings/${bookingId}/cancel`, { headers: headers(userToken), data: { reason: '行程有變' } })).status()).toBe(200)
  for (const token of [userToken, nurseToken]) {
    const list = await (await request.get('/bookings', { headers: headers(token) })).json()
    expect(list.find((item: { _id: string }) => item._id === bookingId)?.status).toBe('CANCELLED')
  }
})
