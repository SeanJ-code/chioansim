import type { HydratedDocument } from 'mongoose'
import {
  Booking,
  CaregiverProfile,
  CareRecipient,
  InjuryReport,
  ServiceRecord,
  ServiceRequest,
  UserRecipientRelation,
} from '../models'
import { Notification } from '../models/notification'
import { emitBookingRealtime } from '../realtime'
import { recordBookingAudit } from '../utils/audit'
import {
  canTransitionBooking,
  isCancellationRefundEligible,
  LOCATION_SHARING_STATUSES,
  type BookingActor,
  type BookingStatus,
} from '../utils/booking-policy'
import { findApprovedLeaveConflict, findAvailabilityConflict, findBookingConflict, findPendingLeaveConflict } from '../utils/availability-policy'

// Booking model 目前沿用既有 any schema；Service 只依賴 Mongoose document 的 get 與 _id。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BookingDocument = HydratedDocument<any>
type Update = Record<string, unknown>

function fail(statusCode: number, code: string, message: string): never {
  throw Object.assign(new Error(message), { statusCode, code })
}

function snapshot(booking: BookingDocument) {
  return {
    status: booking.get('status'),
    acceptedAt: booking.get('acceptedAt'),
    departedAt: booking.get('departedAt'),
    arrivedAt: booking.get('arrivedAt'),
    serviceStartedAt: booking.get('serviceStartedAt'),
    completionRequestedAt: booking.get('completionRequestedAt'),
    completedAt: booking.get('completedAt'),
    cancelledAt: booking.get('cancelledAt'),
    locationSharingStoppedAt: booking.get('locationSharingStoppedAt'),
    scheduledStartAt: booking.get('scheduledStartAt'),
    scheduledEndAt: booking.get('scheduledEndAt'),
  }
}

async function assignedCaregiver(booking: BookingDocument, actor: BookingActor): Promise<boolean> {
  if (actor.role !== 'NURSE') return false
  return Boolean(
    await CaregiverProfile.exists({ _id: booking.get('caregiverId'), userId: actor.userId }),
  )
}

async function canView(booking: BookingDocument, actor: BookingActor): Promise<boolean> {
  if (actor.role === 'ADMIN' || String(booking.get('requesterUserId')) === actor.userId) return true
  if (await assignedCaregiver(booking, actor)) return true
  const recipientId = booking.get('recipientId')
  if (!recipientId) return false
  if (await CareRecipient.exists({ _id: recipientId, accountUserId: actor.userId })) return true
  return Boolean(
    await UserRecipientRelation.exists({
      recipientId,
      userId: actor.userId,
      canViewRecord: true,
      status: 'ACTIVE',
      $or: [
        { authorizationExpiresAt: { $exists: false } },
        { authorizationExpiresAt: null },
        { authorizationExpiresAt: { $gt: new Date() } },
      ],
    }),
  )
}

async function canCancel(booking: BookingDocument, actor: BookingActor): Promise<boolean> {
  if (actor.role === 'ADMIN' || String(booking.get('requesterUserId')) === actor.userId) return true
  const recipientId = booking.get('recipientId')
  if (!recipientId) return false
  if (await CareRecipient.exists({ _id: recipientId, accountUserId: actor.userId })) return true
  return Boolean(
    await UserRecipientRelation.exists({
      recipientId,
      userId: actor.userId,
      canCancelBooking: true,
      status: 'ACTIVE',
      $or: [
        { authorizationExpiresAt: { $exists: false } },
        { authorizationExpiresAt: null },
        { authorizationExpiresAt: { $gt: new Date() } },
      ],
    }),
  )
}

async function bestEffort(label: string, task: () => Promise<unknown>): Promise<void> {
  try {
    await task()
  } catch (error) {
    console.error(`${label} 失敗：`, error)
  }
}

async function transition(input: {
  bookingId: string
  nextStatus: BookingStatus
  actor: BookingActor
  action: string
  permission: (booking: BookingDocument) => Promise<boolean>
  update?: Update | ((booking: BookingDocument) => Update | Promise<Update>) | undefined
  requestId?: string | undefined
  after?: ((booking: BookingDocument) => Promise<unknown>) | undefined
  event?: 'booking:changed' | 'location:changed' | undefined
}): Promise<BookingDocument> {
  const current = (await Booking.findById(input.bookingId)) as BookingDocument | null
  if (!current) fail(404, 'NOT_FOUND', '找不到預約')
  if (!(await input.permission(current))) fail(403, 'FORBIDDEN', '沒有執行此預約操作的權限')
  const currentStatus = String(current.get('status'))
  const decision = canTransitionBooking(currentStatus, input.nextStatus, input.actor, current)
  if (!decision.allowed && currentStatus === input.nextStatus)
    fail(409, 'CONFLICT', '此預約操作已完成，請重新整理')
  if (!decision.allowed)
    fail(422, 'BUSINESS_RULE_VIOLATION', decision.message || '目前預約狀態不允許此操作')

  const before = snapshot(current)
  const requestedUpdate =
    typeof input.update === 'function' ? await input.update(current) : input.update || {}
  const operators = Object.fromEntries(
    Object.entries(requestedUpdate).filter(([key]) => key.startsWith('$')),
  )
  const fields = Object.fromEntries(
    Object.entries(requestedUpdate).filter(([key]) => !key.startsWith('$')),
  )
  const update = Object.keys(operators).length
    ? {
        ...operators,
        $set: {
          ...fields,
          ...((requestedUpdate.$set as Update | undefined) || {}),
          status: input.nextStatus,
        },
      }
    : { ...fields, status: input.nextStatus }
  const updated = (await Booking.findOneAndUpdate(
    {
      _id: current._id,
      status: currentStatus,
      updatedAt: current.get('updatedAt'),
      hidden: { $ne: true },
    },
    update,
    { new: true, runValidators: true },
  )) as BookingDocument | null
  if (!updated) fail(409, 'CONFLICT', '預約狀態已由其他操作更新，請重新整理')

  await bestEffort('Booking Audit', () =>
    recordBookingAudit(
      input.actor,
      input.action,
      updated._id,
      before,
      snapshot(updated),
      input.requestId,
    ),
  )
  if (input.after) await bestEffort(`${input.action} 後續處理`, () => input.after!(updated))
  await bestEffort('Booking Socket', () => emitBookingRealtime(String(updated._id), input.event))
  return updated
}

const nursePermission = (actor: BookingActor) => (booking: BookingDocument) =>
  assignedCaregiver(booking, actor)

export async function acceptBooking(bookingId: string, actor: BookingActor, requestId?: string) {
  return transition({
    bookingId,
    actor,
    requestId,
    nextStatus: 'ACCEPTED',
    action: 'BOOKING_ACCEPTED',
    permission: nursePermission(actor),
    update: async (booking) => {
      const [approved, pending] = await Promise.all([
        findApprovedLeaveConflict(booking.get('caregiverId'), booking.get('scheduledStartAt'), booking.get('scheduledEndAt')),
        findPendingLeaveConflict(booking.get('caregiverId'), booking.get('scheduledStartAt'), booking.get('scheduledEndAt')),
      ])
      if (approved) fail(409, 'APPROVED_LEAVE_CONFLICT', '此服務時間與已核准休假重疊，無法承接任務。')
      if (pending) fail(409, 'PENDING_LEAVE_CONFLICT', '此服務時間與待審請假重疊，請先撤回請假申請或等待審核結果。')
      return { acceptedAt: new Date() }
    },
    after: (booking) =>
      Notification.create({
        recipientUserId: booking.get('requesterUserId'),
        type: 'BOOKING',
        title: '居服員已確認任務',
        message: '您的安心照護預約已由居服員確認。',
        bookingId: booking._id,
      }),
  })
}

export async function departBooking(
  bookingId: string,
  actor: BookingActor,
  data: Update,
  requestId?: string,
) {
  return transition({
    bookingId,
    actor,
    requestId,
    nextStatus: 'DEPARTED',
    action: 'CAREGIVER_EN_ROUTE',
    permission: nursePermission(actor),
    event: 'location:changed',
    update: { departedAt: new Date(), ...data },
    after: async (booking) => {
      await CaregiverProfile.findByIdAndUpdate(booking.get('caregiverId'), {
        currentLocation: booking.get('latestLocation'),
      })
      await Notification.create({
        recipientUserId: booking.get('requesterUserId'),
        type: 'BOOKING',
        title: '居服員已出發',
        message: '居服員正在前往您的服務地點。',
        bookingId: booking._id,
      })
    },
  })
}

export async function arriveBooking(
  bookingId: string,
  actor: BookingActor,
  latestLocation?: unknown,
  requestId?: string,
) {
  return transition({
    bookingId,
    actor,
    requestId,
    nextStatus: 'ARRIVED',
    action: 'CAREGIVER_ARRIVED',
    permission: nursePermission(actor),
    event: 'location:changed',
    update: { arrivedAt: new Date(), ...(latestLocation ? { latestLocation } : {}) },
    after: (booking) =>
      Notification.create({
        recipientUserId: booking.get('requesterUserId'),
        type: 'BOOKING',
        title: '居服員已抵達',
        message: '居服員已抵達服務地點並完成打卡。',
        bookingId: booking._id,
      }),
  })
}

export async function flagInjuryDecision(
  bookingId: string,
  actor: BookingActor,
  requestId?: string,
) {
  return transition({
    bookingId,
    actor,
    requestId,
    nextStatus: 'WAITING_DECISION',
    action: 'BOOKING_INJURY_REVIEW_REQUIRED',
    permission: (booking) => canView(booking, actor),
  })
}

export async function resolveInjuryDecision(
  bookingId: string,
  reportId: string,
  decision: 'CONTINUE' | 'CANCEL',
  actor: BookingActor,
  requestId?: string,
) {
  const report = await InjuryReport.findOne({ _id: reportId, bookingId })
  if (!report) fail(404, 'NOT_FOUND', '找不到此外傷紀錄')
  const booking =
    decision === 'CANCEL'
      ? (await cancelBooking(bookingId, '外傷／負面場景判定取消', actor, requestId)).booking
      : await transition({
          bookingId,
          actor,
          requestId,
          nextStatus: 'ARRIVED',
          action: 'BOOKING_INJURY_CONTINUED',
          permission: async (current) =>
            actor.role === 'ADMIN' || String(current.get('requesterUserId')) === actor.userId,
        })
  report.set({ decision, decidedByUserId: actor.userId, decidedAt: new Date() })
  await report.save()
  return { report, booking }
}

export async function startService(bookingId: string, actor: BookingActor, requestId?: string) {
  return transition({
    bookingId,
    actor,
    requestId,
    nextStatus: 'IN_SERVICE',
    action: 'SERVICE_STARTED',
    permission: nursePermission(actor),
    update: { $set: { serviceStartedAt: new Date() }, $unset: { latestLocation: 1 } },
    after: async (booking) => {
      await CaregiverProfile.findByIdAndUpdate(booking.get('caregiverId'), {
        $unset: { currentLocation: 1 },
      })
      await Notification.create({
        recipientUserId: booking.get('requesterUserId'),
        type: 'BOOKING',
        title: '照護服務已開始',
        message: '居服員已開始執行本次照護服務。',
        bookingId: booking._id,
      })
    },
  })
}

export async function requestCompletion(
  bookingId: string,
  actor: BookingActor,
  requestId?: string,
) {
  return transition({
    bookingId,
    actor,
    requestId,
    nextStatus: 'AWAITING_USER_CONFIRMATION',
    action: 'SERVICE_COMPLETION_REQUESTED',
    permission: nursePermission(actor),
    update: { completionRequestedAt: new Date(), $unset: { latestLocation: 1 } },
    after: async (booking) => {
      await CaregiverProfile.findByIdAndUpdate(booking.get('caregiverId'), {
        $unset: { currentLocation: 1 },
      })
      await Notification.create({
        recipientUserId: booking.get('requesterUserId'),
        type: 'BOOKING',
        title: '請確認本次照護服務',
        message: '居服員已提出完成，請核對後確認本次服務。',
        bookingId: booking._id,
      })
    },
  })
}

export async function confirmCompletion(
  bookingId: string,
  actor: BookingActor,
  requestId?: string,
) {
  const completedAt = new Date()
  const booking = await transition({
    bookingId,
    actor,
    requestId,
    nextStatus: 'COMPLETED',
    action: 'USER_CONFIRMED_SERVICE',
    permission: (current) => canView(current, actor),
    update: { attendanceStatus: 'COMPLETED', completedAt, $unset: { latestLocation: 1 } },
    after: async (updated) => {
      await ServiceRequest.findByIdAndUpdate(updated.get('serviceRequestId'), {
        status: 'COMPLETED',
      })
      const caregiver = await CaregiverProfile.findById(updated.get('caregiverId'))
      if (caregiver?.get('userId'))
        await Notification.create({
          recipientUserId: caregiver.get('userId'),
          type: 'BOOKING',
          title: '使用者已確認完成',
          message: '本次照護服務已由雙方確認並正式結案。',
          bookingId: updated._id,
        })
      await ServiceRecord.findOneAndUpdate(
        { bookingId: updated._id },
        {
          bookingId: updated._id,
          recipientId: updated.get('recipientId'),
          caregiverId: updated.get('caregiverId'),
          completedItems: updated.get('serviceTypeIds') || [],
          notes: '使用者已確認本次服務完成。',
          startedAt: updated.get('serviceStartedAt'),
          completedAt,
        },
        { upsert: true, new: true },
      )
    },
  })
  return { booking, record: await ServiceRecord.findOne({ bookingId: booking._id }) }
}

export async function cancelBooking(
  bookingId: string,
  reason: string,
  actor: BookingActor,
  requestId?: string,
) {
  let refundEligible = false
  const booking = await transition({
    bookingId,
    actor,
    requestId,
    nextStatus: 'CANCELLED',
    action: 'BOOKING_CANCELLED',
    permission: (item) => canCancel(item, actor),
    update: (current) => {
      refundEligible = isCancellationRefundEligible(
        String(current.get('status')),
        new Date(current.get('scheduledStartAt')),
      )
      return {
        cancelledAt: new Date(),
        cancellationReason: reason,
        cancellationRefundEligible: refundEligible,
        $unset: { latestLocation: 1 },
      }
    },
    after: async (updated) => {
      await CaregiverProfile.findByIdAndUpdate(updated.get('caregiverId'), {
        $unset: { currentLocation: 1 },
      })
      await ServiceRequest.findByIdAndUpdate(updated.get('serviceRequestId'), {
        status: 'CANCELLED',
      })
      const caregiver = await CaregiverProfile.findById(updated.get('caregiverId'))
      const recipients = [updated.get('requesterUserId'), caregiver?.get('userId')]
        .filter(Boolean)
        .filter((id) => String(id) !== actor.userId)
      if (recipients.length)
        await Notification.insertMany(
          recipients.map((recipientUserId) => ({
            recipientUserId,
            type: 'BOOKING',
            title: '照護預約已取消',
            message: `取消原因：${reason}`,
            bookingId: updated._id,
          })),
        )
    },
  })
  return { booking, refundEligible }
}

export async function abandonBooking(
  bookingId: string,
  reason: string | undefined,
  actor: BookingActor,
  requestId?: string,
) {
  return transition({
    bookingId,
    actor,
    requestId,
    nextStatus: 'ABANDONED',
    action: 'BOOKING_ABANDONED',
    permission: nursePermission(actor),
    update: { cancelledAt: new Date(), cancellationReason: reason, $unset: { latestLocation: 1 } },
    after: (booking) =>
      CaregiverProfile.findByIdAndUpdate(booking.get('caregiverId'), {
        $inc: { abandonmentCount: 1 },
        $unset: { currentLocation: 1 },
      }),
  })
}

export async function rescheduleBooking(
  bookingId: string,
  actor: BookingActor,
  schedule: { scheduledStartAt: Date; scheduledEndAt: Date; startTime: string; dayStart: Date },
  requestId?: string,
) {
  return transition({
    bookingId,
    actor,
    requestId,
    nextStatus: 'PENDING',
    action: 'BOOKING_RESCHEDULED',
    permission: (booking) => canView(booking, actor),
    update: async (current) => {
      const caregiverId = current.get('caregiverId')
      const [pendingLeave, approvedLeave, blocked, overlaps] = await Promise.all([
        findPendingLeaveConflict(caregiverId, schedule.scheduledStartAt, schedule.scheduledEndAt),
        findApprovedLeaveConflict(caregiverId, schedule.scheduledStartAt, schedule.scheduledEndAt),
        findAvailabilityConflict(caregiverId, schedule.scheduledStartAt, schedule.scheduledEndAt),
        findBookingConflict(caregiverId, schedule.scheduledStartAt, schedule.scheduledEndAt, current._id),
      ])
      if (pendingLeave) fail(409, 'PENDING_LEAVE_CONFLICT', '居服員在此時段已有待審請假')
      if (approvedLeave) fail(409, 'APPROVED_LEAVE_CONFLICT', '居服員在此時段已有核准休假')
      if (blocked) fail(409, 'UNAVAILABLE_CONFLICT', '居服員在此時段暫停服務')
      if (overlaps.length) fail(409, 'BOOKING_CONFLICT', '居服員在此時段已有其他任務')
      return {
        scheduledStartAt: schedule.scheduledStartAt,
        scheduledEndAt: schedule.scheduledEndAt,
        $unset: { acceptedAt: 1 },
      }
    },
    after: async (booking) => {
      await ServiceRequest.findByIdAndUpdate(booking.get('serviceRequestId'), {
        preferredDate: schedule.scheduledStartAt,
        preferredStartTime: schedule.startTime,
        estimatedDuration:
          (schedule.scheduledEndAt.getTime() - schedule.scheduledStartAt.getTime()) / 60000,
        status: 'MATCHED',
      })
      const caregiver = await CaregiverProfile.findById(booking.get('caregiverId'))
      if (caregiver?.get('userId'))
        await Notification.create({
          recipientUserId: caregiver.get('userId'),
          type: 'BOOKING',
          title: '照護預約時間已變更',
          message: '使用者已變更服務時間，請重新確認任務。',
          bookingId: booking._id,
        })
    },
  })
}

export async function stopLocationSharing(
  bookingId: string,
  actor: BookingActor,
  requestId?: string,
) {
  const booking = (await Booking.findById(bookingId)) as BookingDocument | null
  if (!booking) fail(404, 'NOT_FOUND', '找不到工作任務')
  if (!(await assignedCaregiver(booking, actor)))
    fail(403, 'FORBIDDEN', '這筆任務不屬於目前登入的居服員')
  if (!(LOCATION_SHARING_STATUSES as readonly string[]).includes(String(booking.get('status'))))
    fail(422, 'BUSINESS_RULE_VIOLATION', '目前任務狀態不允許停止位置分享')
  const before = snapshot(booking)
  const updated = (await Booking.findOneAndUpdate(
    { _id: booking._id, caregiverId: booking.get('caregiverId'), status: booking.get('status') },
    { $unset: { latestLocation: 1 }, locationSharingStoppedAt: new Date() },
    { new: true },
  )) as BookingDocument | null
  if (!updated) fail(409, 'CONFLICT', '任務狀態已變更，請重新整理')
  await CaregiverProfile.findByIdAndUpdate(updated.get('caregiverId'), {
    $unset: { currentLocation: 1 },
  })
  await bestEffort('Booking Audit', () =>
    recordBookingAudit(actor, 'GPS_STOPPED', updated._id, before, snapshot(updated), requestId),
  )
  await bestEffort('Booking Socket', () =>
    emitBookingRealtime(String(updated._id), 'location:changed'),
  )
  return updated
}

export const publishBookingChange = (
  bookingId: string,
  event: 'booking:changed' | 'location:changed' = 'booking:changed',
) => emitBookingRealtime(bookingId, event)
