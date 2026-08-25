import 'dotenv/config'
import { expect, test } from '@playwright/test'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { testUri } from '../../playwright.config'
import { Booking, CaregiverProfile, ServiceType, User } from '../../src/models'
import { QualityAlert } from '../../src/models/quality-alert'
import { Notification } from '../../src/models/notification'

const suffix = Date.now().toString(36)
const password = 'E2e安心測試11'
let userToken = ''
let nurseToken = ''
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
  const [user, nurse] = await User.create([
    { account: `e2euser${suffix}`, passwordHash: await bcrypt.hash(password, 4), name: '安心測試家屬', role: 'USER' },
    { account: `e2enurse${suffix}`, passwordHash: await bcrypt.hash(password, 4), name: '安心測試居服員', role: 'NURSE' },
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
  const serviceType = await ServiceType.findOneAndUpdate(
    { name: 'E2E 基本日常照顧' },
    { name: 'E2E 基本日常照顧', durationMinutes: 60, basePrice: 100, active: true },
    { upsert: true, new: true },
  )
  serviceTypeId = serviceType.id

  for (const [account, target] of [[user.get('account'), 'user'], [nurse.get('account'), 'nurse']] as const) {
    const result = await request.post('/auth/login', { data: { account, password } })
    expect(result.ok(), `${result.status()} ${await result.text()}`).toBeTruthy()
    const token = (await result.json()).accessToken
    if (target === 'user') userToken = token; else nurseToken = token
  }

  const recipient = await request.post('/patients', {
    headers: headers(userToken),
    data: { name: '安心測試受照護者', relationship: '家屬', weightKg: 70, mobilityStatus: '需要攙扶' },
  })
  expect(recipient.status()).toBe(201)
  recipientId = (await recipient.json())._id
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

    const review = await request.post('/feedback/reviews', {
      headers: headers(userToken),
      multipart: { bookingId, targetUserId: nurseUserId, rating: '1', comment: `第 ${index} 次 E2E 低星測試` },
    })
    expect(review.status()).toBe(201)
    expect((await Booking.findById(bookingId))?.get('latestLocation')).toBeUndefined()
  }
  expect(await QualityAlert.exists({ caregiverId, type: 'THREE_ONE_STAR_REVIEWS' })).toBeTruthy()
  expect(await Notification.countDocuments({ type: 'BOOKING', status: 'SENT' })).toBe(6)
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
