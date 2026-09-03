import 'dotenv/config'
import assert from 'node:assert/strict'
import mongoose, { Types } from 'mongoose'
import { User } from '../models'
import { AuditLog } from '../models/audit-log'
import { Complaint } from '../models/complaint'
import { Notification } from '../models/notification'

const baseUrl = process.env.SAFE_REPORT_TEST_URL || 'http://127.0.0.1:3101/api'
const evidenceUrls = ['/uploads/safe-report-flow-check.webp']

async function request(path: string, cookie: string, method = 'GET', body?: object) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Cookie: cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await response.json() as any
  return { status: response.status, data }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string)
  const [admin, nurse] = await Promise.all([
    User.findOne({ role: 'ADMIN', status: 'ACTIVE' }),
    User.findOne({ role: 'NURSE', status: 'ACTIVE' }),
  ])
  assert(admin && nurse, '需要至少一位啟用中的 ADMIN 與 NURSE')
  const report = await Complaint.create({
    complainantUserId: nurse._id,
    category: 'OTHER_SAFETY',
    description: 'Safe Report 自動流程驗證',
    evidenceUrls,
    priority: 'CRITICAL',
    reportNumber: `SAFE-CHECK-${Date.now()}`,
    status: 'SUBMITTED',
    activities: [{ type: 'SUBMITTED', label: '測試通報已送出', actorRole: 'NURSE' }],
  })
  const reportId = report.id
  const cookie = process.env.SAFE_REPORT_TEST_COOKIE
  assert(cookie, '需要已登入 ADMIN 的 SAFE_REPORT_TEST_COOKIE')

  try {
    assert.equal((await request('/admin/safe-reports/[object%20Object]/status', cookie, 'PATCH', { status: 'ACKNOWLEDGED' })).status, 400)
    assert.equal((await request(`/admin/safe-reports/${new Types.ObjectId()}/status`, cookie, 'PATCH', { status: 'ACKNOWLEDGED' })).status, 404)

    for (const status of ['ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']) {
      const result = await request(`/admin/safe-reports/${reportId}/status`, cookie, 'PATCH', { status })
      assert.equal(result.status, 200, `${status}: ${JSON.stringify(result.data)}`)
      assert.equal(result.data.status, status)
      assert.deepEqual(result.data.evidenceUrls, evidenceUrls)
    }

    assert.equal((await request(`/admin/safe-reports/${reportId}/status`, cookie, 'PATCH', { status: 'CLOSED' })).status, 409)
    const reply = await request(`/feedback/complaints/${reportId}/replies`, cookie, 'POST', { message: '不可修改的流程驗證紀錄' })
    assert.equal(reply.status, 201)
    assert.equal(reply.data.replies.at(-1).message, '不可修改的流程驗證紀錄')

    const saved = await Complaint.findById(reportId).lean() as any
    assert.equal(saved?.status, 'CLOSED')
    assert.deepEqual(saved?.evidenceUrls, evidenceUrls)
    assert.equal(await Notification.countDocuments({ recipientUserId: nurse._id, message: new RegExp(report.reportNumber) }), 5)
    assert.equal(await AuditLog.countDocuments({ action: 'HANDLE_SAFE_REPORT', targetId: reportId }), 4)
    console.log('Safe Report HTTP flow check passed')
  } finally {
    await Promise.all([
      Complaint.deleteOne({ _id: reportId }),
      Notification.deleteMany({ recipientUserId: nurse._id, message: new RegExp(report.reportNumber) }),
      AuditLog.deleteMany({ action: 'HANDLE_SAFE_REPORT', targetId: reportId }),
    ])
    await mongoose.disconnect()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
