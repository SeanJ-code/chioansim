import 'dotenv/config'
import assert from 'node:assert/strict'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import {
  Availability, Booking, CaregiverProfile, CareRecipient, EmergencyAlert, Favorite,
  InjuryReport, Review, ServiceRecord, ServiceRequest, ServiceType, User,
  UserRecipientRelation,
} from '../models'
import { AuditLog } from '../models/audit-log'
import { CaregiverCredential } from '../models/caregiver-credential'
import { CaregiverLeaveRequest, CaregiverWorkJournal } from '../models/caregiver-work'
import { Complaint } from '../models/complaint'
import { Consent } from '../models/consent'
import { Notification } from '../models/notification'
import { QualityAlert } from '../models/quality-alert'
import { ensureServiceCatalog } from '../configs/service-catalog'

const day = 86_400_000
const now = new Date()
const at = (offset: number, hour = 9) => {
  const value = new Date(now.getTime() + offset * day)
  value.setHours(hour, 0, 0, 0)
  return value
}
const pad = (value: number, size = 2) => String(value).padStart(size, '0')
const id = (document: { _id: unknown }) => document._id

const userNames = ['林語晴','陳柏翰','王美玲','張志豪','李雅雯','黃俊傑','吳佩珊','劉家豪','蔡淑芬','楊承恩','許麗華','鄭宇翔','謝佳蓉','洪建宏','郭秀蘭','邱冠廷','曾怡君','廖文雄','賴欣怡','徐明哲','周惠美','葉子軒','蘇婉婷','莊博仁','呂秀琴','江宥辰','何雅芳','羅信宏','高郁涵','彭家銘']
const nurseNames = ['陳怡安','林志遠','王心如','張育誠','李佩樺','黃冠宇','吳佳蓉','劉建宏','蔡宜庭','楊宗翰','許淑惠','鄭凱文','謝雅婷','洪瑞祥','郭美芳','邱奕辰','曾慧君','廖俊豪','賴思妤','徐國維']
const recipientNames = ['林阿梅','陳添福','王秀琴','張進財','李春蘭','黃文雄','吳玉霞','劉清泉','蔡秋菊','楊金水','許月娥','鄭茂松','謝麗珠','洪德昌','郭碧雲','邱榮吉','曾秀英','廖福來','賴阿滿','徐瑞明']
const relationships = ['母女','母子','父女','父子','祖孫','夫妻','媳婦／婆婆','女婿／岳父','其他親屬','姊弟']
const statusPlan = [
  ...Array(143).fill('COMPLETED'), ...Array(22).fill('CANCELLED'),
  ...Array(15).fill('ABANDONED'), ...Array(18).fill('PENDING'),
  ...Array(17).fill('ACCEPTED'), ...Array(3).fill('IN_SERVICE'), 'DEPARTED', 'ARRIVED',
]
const ratingPlan = [...Array(77).fill(5), ...Array(35).fill(4), ...Array(14).fill(3), ...Array(7).fill(2), ...Array(4).fill(1)]

async function main() {
  const uri = process.env.MONGODB_URI?.trim()
  assert(uri, 'MONGODB_URI 未設定')
  assert((uri.match(/\/([^/?]+)(?:\?|$)/) || [])[1] === 'chioansim', '只允許寫入 chioansim')
  await mongoose.connect(uri)

  await Promise.all([
    Review.deleteMany({}), Complaint.deleteMany({}), QualityAlert.deleteMany({}),
    Notification.deleteMany({}), AuditLog.deleteMany({}), CaregiverWorkJournal.deleteMany({}),
    ServiceRecord.deleteMany({}), InjuryReport.deleteMany({}), EmergencyAlert.deleteMany({}),
    Booking.deleteMany({}), ServiceRequest.deleteMany({}), CaregiverLeaveRequest.deleteMany({}),
    Availability.deleteMany({}), CaregiverCredential.deleteMany({}), Favorite.deleteMany({}),
    Consent.deleteMany({}), UserRecipientRelation.deleteMany({}), CareRecipient.deleteMany({}),
    CaregiverProfile.deleteMany({}), mongoose.connection.collection('refreshtokens').deleteMany({}),
  ])
  await User.deleteMany({})
  await ensureServiceCatalog()
  const services = await ServiceType.find({ active: true, hidden: { $ne: true } }).sort({ code: 1 })
  assert(services.length, '正式 ServiceType 為空')
  const passwordHash = await bcrypt.hash('123456789', 12)

  const users = await User.insertMany(userNames.map((name, i) => ({
    account: `user${i + 1}`, passwordHash, name, role: 'USER', status: 'ACTIVE',
    phone: `09${pad(10 + (i % 9))}${pad(310000 + i, 6)}`,
    email: `user${i + 1}@chioansim.demo`, createdAt: at(-90 + i * 2),
  })))
  const nurseUsers = await User.insertMany(nurseNames.map((name, i) => ({
    account: `nurse${pad(i + 1)}`, passwordHash, name, role: 'NURSE', status: 'ACTIVE',
    phone: `09${pad(20 + (i % 8))}${pad(420000 + i, 6)}`,
    email: `nurse${pad(i + 1)}@chioansim.demo`, createdAt: at(-180 + i * 4),
  })))
  const [admin] = await User.create([{ account: 'aaaa', passwordHash, name: '照安心管理員', role: 'ADMIN', status: 'ACTIVE', email: 'admin@chioansim.demo' }])

  const caregivers = await CaregiverProfile.insertMany(nurseUsers.map((user, i) => ({
    userId: user._id, profilePhotoUrl: `/uploads/demo/nurses/nurse${pad(i + 1)}.jpg`,
    introduction: `${nurseNames[i]}，具 ${i + 1} 年居家照護經驗，重視尊嚴、溝通與生活節奏。`,
    yearsExperience: i + 1, serviceAreas: i % 3 === 0 ? ['台北市','新北市'] : i % 3 === 1 ? ['新北市'] : ['台北市'],
    serviceTypeIds: services.filter((_, n) => n % 4 === i % 4).slice(0, 6).map(id),
    certificateNumber: `DEMO-CARE-${pad(i + 1, 3)}`, certificateFileUrl: `/uploads/demo/certificates/nurse${pad(i + 1)}-demo.pdf`,
    certificateExpiresAt: at(i === 14 ? -30 : i === 13 ? 20 : 365 + i * 15),
    verificationStatus: i === 14 ? 'EXPIRED' : 'APPROVED', transportation: ['機車','大眾運輸','汽車'][i % 3], active: i !== 14,
  })))

  const credentials = ['照顧服務員訓練','CPR / AED','失智照護','身心障礙支持','長照進階訓練']
  await CaregiverCredential.insertMany(caregivers.flatMap((caregiver, i) => credentials.slice(0, 2 + (i % 4)).map((name, n) => ({
    caregiverId: caregiver._id, kind: n ? 'SKILL' : 'CERTIFICATE', name,
    number: `DEMO-${pad(i + 1, 3)}-${pad(n + 1, 2)}`, issuingAuthority: '照安心虛擬展示資料（非真實發證單位）',
    issuedAt: at(-800 + i * 10), expiresAt: at(i === 14 ? -30 : i === 13 ? 20 : 365 + i * 10),
    fileUrl: `/uploads/demo/certificates/nurse${pad(i + 1)}-${n + 1}-demo.pdf`,
    verificationStatus: i === 14 ? 'EXPIRED' : 'APPROVED', verifiedByAdminId: admin._id, verifiedAt: at(-60),
  }))))

  const recipients = await CareRecipient.insertMany(recipientNames.map((name, i) => ({
    createdByUserId: users[i]._id, name, birthDate: new Date(1936 + (i % 26), (i * 3) % 12, 3 + (i % 20)),
    gender: i % 2 ? '女' : '男', careLevel: `${2 + (i % 6)} 級`, mobilityStatus: ['可自行行走','需手杖輔助','需助行器','外出使用輪椅'][i % 4],
    heightCm: 148 + (i % 18), weightKg: 48 + (i * 3) % 27,
    transferSupport: ['可自行移位','需一人攙扶','床椅移位需協助'][i % 3], bathingSupport: ['備品與安全看視','需局部協助','需全程協助'][i % 3],
    assistiveDevices: [[],['手杖'],['助行器'],['輪椅','浴室扶手']][i % 4],
    homeEnvironmentNotes: ['有電梯，玄關無高差','老公寓二樓，樓梯較窄','浴室有防滑墊與扶手'][i % 3],
    allergyNotes: i % 5 === 0 ? '對花生過敏，餐食請避開。' : i % 5 === 1 ? '無已知過敏。' : '部分藥物曾不適，給藥前聯絡家屬。',
    medicalNotes: ['高血壓規律追蹤','糖尿病飲食控制','膝關節退化，避免久站','輕度失智，請放慢說明'][i % 4],
    attentionNotes: ['陪診時攜帶健保卡','午後容易疲倦，安排休息','喜歡台語交談','外出需注意路面高低差'][i % 4],
    carePhotoUrls: [`/uploads/demo/recipients/recipient${pad(i + 1)}.jpg`],
    address: { text: `${['台北市信義區','台北市大安區','新北市板橋區','新北市中和區'][i % 4]}安心路 ${20 + i} 號`, latitude: 25.02 + i / 1000, longitude: 121.52 + i / 1000 },
    emergencyContact: { name: users[i].name, phone: users[i].phone, relationship: relationships[i % relationships.length] }, status: 'ACTIVE',
  })))
  await UserRecipientRelation.insertMany(recipients.map((recipient, i) => ({ userId: users[i]._id, recipientId: recipient._id, relationship: relationships[i % relationships.length], isPrimaryContact: true, canBookService: true, canViewRecord: true, canCancelBooking: true, canViewLocation: true, canViewMedicalNotes: i % 2 === 0, canHandleInjuryDecision: true, canReceiveEmergencyNotice: true })))
  await Consent.insertMany(users.map((user, i) => ({ userId: user._id, recipientId: i < 20 ? recipients[i]._id : undefined, documentType: '照護服務與個資使用同意書', documentVersion: 'DEMO-2026.1', agreedAt: at(-70 + i), status: 'ACTIVE' })))
  await Favorite.insertMany([0,4,8,18,29].flatMap((u) => [0,3].map((c) => ({ userId: users[u]._id, caregiverId: caregivers[c]._id }))))

  const bookings: Array<InstanceType<typeof Booking>> = []
  for (let i = 0; i < statusPlan.length; i++) {
    const status = statusPlan[i]
    const requester = users[i % users.length]
    const recipient = recipients[i % recipients.length]
    let caregiverIndex = i % caregivers.length
    if (i < 3) caregiverIndex = 5
    if (i >= 200) caregiverIndex = i % 2 ? 19 : caregiverIndex
    const caregiver = caregivers[caregiverIndex]
    const serviceSet = [services[i % services.length], ...(i % 5 === 0 ? [services[(i + 3) % services.length]] : [])]
    const offset = status === 'COMPLETED' && i % users.length === 16 ? -(1 + i % 6) : ['COMPLETED','CANCELLED','ABANDONED'].includes(status) ? -89 + (i % 88) : status === 'IN_SERVICE' || status === 'DEPARTED' || status === 'ARRIVED' ? 0 : 1 + (i % 14)
    const start = at(offset, 8 + (i % 9))
    const end = new Date(start.getTime() + serviceSet.reduce((sum, service) => sum + service.get('durationMinutes'), 0) * 60_000)
    const request = await ServiceRequest.create({ requesterUserId: requester._id, recipientId: recipient._id, serviceTypeIds: serviceSet.map(id), preferredDate: start, preferredStartTime: `${pad(start.getHours())}:00`, estimatedDuration: Math.round((end.getTime() - start.getTime()) / 60_000), serviceAddress: recipient.address, specialRequirements: ['陪伴時多聊天','備餐少油少鹽','外出請放慢步調','服務前先電話聯絡'][i % 4], status: status === 'COMPLETED' ? 'COMPLETED' : status === 'CANCELLED' ? 'CANCELLED' : 'MATCHED', createdAt: new Date(start.getTime() - 2 * day) })
    const progressed = ['ACCEPTED','DEPARTED','ARRIVED','IN_SERVICE','COMPLETED'].includes(status)
    const booking = await Booking.create({
      bookingNumber: `DEMO-${pad(i + 1, 4)}`, serviceRequestId: request._id, requesterUserId: requester._id, recipientId: recipient._id, caregiverId: caregiver._id, serviceTypeIds: serviceSet.map(id), scheduledStartAt: start, scheduledEndAt: end, serviceAddress: recipient.address,
      totalAmount: serviceSet.reduce((sum, service) => sum + service.get('basePrice'), 0), status,
      acceptedAt: progressed ? new Date(start.getTime() - day) : undefined, departedAt: ['DEPARTED','ARRIVED','IN_SERVICE','COMPLETED'].includes(status) ? new Date(start.getTime() - 30 * 60_000) : undefined,
      arrivedAt: ['ARRIVED','IN_SERVICE','COMPLETED'].includes(status) ? start : undefined, serviceStartedAt: ['IN_SERVICE','COMPLETED'].includes(status) ? new Date(start.getTime() + 5 * 60_000) : undefined,
      completionRequestedAt: status === 'COMPLETED' ? new Date(end.getTime() - 5 * 60_000) : undefined, completedAt: status === 'COMPLETED' ? end : undefined,
      cancelledAt: ['CANCELLED','ABANDONED'].includes(status) ? new Date(start.getTime() - day) : undefined, cancellationReason: status === 'CANCELLED' ? ['家屬行程調整','臨時就醫','改期後重新預約'][i % 3] : status === 'ABANDONED' ? '居服員臨時無法執行' : undefined,
      attendanceStatus: status === 'COMPLETED' ? 'COMPLETED' : ['ARRIVED','IN_SERVICE'].includes(status) ? 'CHECKED_IN' : 'NOT_CHECKED_IN', createdAt: new Date(start.getTime() - 2 * day),
    })
    bookings.push(booking)
  }

  const completed = bookings.filter((booking) => booking.status === 'COMPLETED')
  await ServiceRecord.insertMany(completed.map((booking, i) => ({ bookingId: booking._id, recipientId: booking.recipientId, caregiverId: booking.caregiverId, completedItems: ['安全確認','生活照護','服務回報'], notes: ['服務順利完成，精神狀況穩定。','完成備餐與陪伴，已向家屬回報。','外出散步後返家，無異常。'][i % 3], startedAt: booking.serviceStartedAt, completedAt: booking.completedAt })))
  await CaregiverWorkJournal.insertMany(completed.filter((_, i) => i % 3 === 0).map((booking, i) => ({ caregiverId: booking.caregiverId, bookingId: booking._id, title: ['日常照護紀錄','陪診回報','餐食與活動觀察'][i % 3], content: ['今日狀況穩定，依計畫完成服務。','陪同回診並將醫囑轉告主要聯絡人。','食慾正常，活動後已安排休息。'][i % 3], mood: ['STEADY','FULFILLED','TIRED'][i % 3], occurredAt: booking.completedAt, followUpRequired: i % 7 === 0, photoUrls: [], hidden: false })))

  await Review.insertMany(ratingPlan.map((rating, i) => {
    const booking = completed[i + 3]
    const caregiver = caregivers.find((item) => String(item._id) === String(booking.caregiverId))!
    return { bookingId: booking._id, reviewerUserId: booking.requesterUserId, targetUserId: caregiver.userId, targetRole: 'NURSE', rating, comment: ['細心且準時，家人很安心。','溝通清楚，照護紀錄完整。','整體服務符合期待。','抵達稍晚但有提前說明。','服務溝通與細節仍需改善。'][5 - rating] || '服務良好。', careTags: ['準時','有耐心'], journalContent: '虛擬展示照護紀錄，服務完成後家屬已確認。', journalCreatedAt: booking.completedAt, visible: true, hidden: false, createdAt: booking.completedAt }
  }))
  await Promise.all(caregivers.map(async (caregiver) => {
    const [summary] = await Review.aggregate([{ $match: { targetUserId: caregiver.userId, targetRole: 'NURSE', visible: true, hidden: { $ne: true } } }, { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }])
    await caregiver.updateOne({ ratingAverage: summary?.average || 0, ratingCount: summary?.count || 0, abandonmentCount: await Booking.countDocuments({ caregiverId: caregiver._id, status: 'ABANDONED' }) })
  }))

  const complaintCategories = ['服務態度','遲到','服務內容','溝通問題','照護方式','其他','安全問題：跌倒','安全問題：移位異常','安全問題：輕微擦傷','安全問題：環境安全','安全問題：突發不適','安全問題：服務異常']
  await Complaint.insertMany(complaintCategories.map((category, i) => ({ complainantUserId: users[(13 + i) % users.length]._id, targetUserId: nurseUsers[(11 + i) % nurseUsers.length]._id, bookingId: completed[(20 + i) % completed.length]._id, reportNumber: `DEMO-RPT-${pad(i + 1, 4)}`, category, description: category.includes('安全') ? '虛擬安全通報：已先確保長者安全並通知家屬，無嚴重傷害。' : `虛擬客訴：${category}情境，供專題流程展示。`, evidenceUrls: category.includes('安全') && i % 2 ? ['/uploads/demo/incidents/minor-care-example.jpg'] : [], status: ['SUBMITTED','ACKNOWLEDGED','IN_PROGRESS','UNDER_REVIEW','RESOLVED'][i % 5], priority: ['LOW','MEDIUM','HIGH','CRITICAL'][i % 4], assignedAdminId: admin._id, activities: [{ type: 'CREATED', label: '案件建立', actorRole: 'USER', createdAt: at(-10 + i) }], replies: [] })))
  await InjuryReport.insertMany([0,1,2,3].map((i) => ({ bookingId: completed[30 + i]._id, recipientId: completed[30 + i].recipientId, reportedByUserId: nurseUsers[8 + i]._id, stage: i ? 'DURING_SERVICE' : 'BEFORE_SERVICE', hasInjury: true, hasNegativeScene: i === 3, description: ['輕微擦傷，已清潔觀察。','移位時發現舊瘀青，已通知家屬。','浴室地面濕滑，已完成環境處理。','長者突感不適，已停止活動並聯絡家屬。'][i], photoUrls: ['/uploads/demo/incidents/minor-care-example.jpg'], decision: 'CONTINUE', decidedByUserId: completed[30 + i].requesterUserId, decidedAt: at(-5 + i) })))

  const leaves: Array<[number, number, number, 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED']> = [[6,2,3,'APPROVED'],[7,5,7,'APPROVED'],[7,10,10.5,'PENDING'],[13,12,13,'PENDING'],[14,3,4,'REJECTED'],[5,8,9,'CANCELLED'],[18,14,15,'PENDING']]
  await CaregiverLeaveRequest.insertMany(leaves.map(([nurse, startDay, endDay, status], i) => ({ caregiverId: caregivers[nurse]._id, startAt: at(startDay, i % 2 ? 13 : 9), endAt: at(endDay, i % 2 ? 17 : 18), leaveType: ['PERSONAL','SICK','FAMILY','OTHER'][i % 4], reason: ['家庭事務','身體不適休養','陪同家人就醫','私人行程'][i % 4], status, adminNote: status === 'APPROVED' ? '展示資料：已核准' : undefined, reviewedByAdminId: status === 'PENDING' ? undefined : admin._id, reviewedAt: status === 'PENDING' ? undefined : at(-1), hidden: false })))
  await Availability.insertMany(leaves.filter((item) => item[3] === 'APPROVED').map(([nurse, startDay, endDay]) => ({ caregiverId: caregivers[nurse]._id, date: at(startDay), startTime: '09:00', endTime: endDay === startDay ? '18:00' : '23:59', status: 'LEAVE' })))

  const notificationTitles = ['預約已建立','居服員已確認任務','預約時間已調整','預約已取消','居服員已出發','居服員已抵達','照護服務已完成','收到新的服務評價','客訴案件已建立','安全通報已送出','請假申請已送出','品質警訊待處理']
  await Notification.insertMany(Array.from({ length: 360 }, (_, i) => { const title = notificationTitles[i % 12]!; return { recipientUserId: i % 9 === 0 ? admin._id : i % 4 === 0 ? nurseUsers[i % nurseUsers.length]!._id : users[i % users.length]!._id, type: title.includes('安全') ? 'SAFETY' : title.includes('預約') || title.includes('居服') || title.includes('服務') ? 'BOOKING' : 'SYSTEM', title, message: `虛擬展示通知 ${i + 1}：${title}。`, bookingId: i % 3 ? bookings[i % bookings.length]!._id : undefined, status: i % 3 === 0 ? 'READ' : 'SENT', sentAt: at(-30 + (i % 45)), readAt: i % 3 === 0 ? at(-29 + (i % 45)) : undefined, createdAt: at(-30 + (i % 45)) } }))
  await AuditLog.insertMany(bookings.flatMap((booking, i) => ['BOOKING_CREATED', ...(booking.acceptedAt ? ['BOOKING_ACCEPTED'] : []), ...(booking.departedAt ? ['CAREGIVER_EN_ROUTE'] : []), ...(booking.arrivedAt ? ['CAREGIVER_ARRIVED'] : []), ...(booking.serviceStartedAt ? ['SERVICE_STARTED'] : []), ...(booking.completedAt ? ['USER_CONFIRMED_SERVICE'] : []), ...(['CANCELLED','ABANDONED'].includes(booking.status) ? ['BOOKING_CANCELLED'] : [])].map((action) => ({ actorUserId: booking.requesterUserId, actorRole: action.includes('CAREGIVER') || action === 'SERVICE_STARTED' ? 'NURSE' : 'USER', action, targetCollection: 'bookings', targetId: String(booking._id), entityType: 'Booking', entityId: booking._id, after: { status: booking.status }, createdAt: booking.createdAt }))))

  console.log(JSON.stringify({ database: mongoose.connection.name, users: users.length, recipients: recipients.length, nurses: nurseUsers.length, admins: 1, bookings: bookings.length, completed: completed.length, reviewsPendingApi: 3, reviewSeeded: ratingPlan.length }, null, 2))
  await mongoose.disconnect()
}

main().catch(async (error) => { console.error(error); await mongoose.disconnect(); process.exitCode = 1 })
