import type { Server as HttpServer } from 'node:http'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { getJwtSecret } from './configs/env'
import { Booking, CaregiverProfile, CareRecipient, User, UserRecipientRelation, type Role } from './models'

type RealtimeEvent = 'booking:changed' | 'alert:changed' | 'location:changed' | 'leave:changed' | 'safe-report:changed'
let io: Server | undefined

export const userRoom = (userId: unknown): string => `user:${String(userId)}`
export const userRooms = (userIds: unknown[]): string[] => [...new Set(userIds.filter(Boolean).map(userRoom))]

/** Socket 只傳「哪類資料已改變」，完整資料仍由原本有權限的 API 重新取得。 */
export function startRealtime(server: HttpServer): void {
  const origins = (process.env.CORS_ORIGIN || 'http://localhost:9000').split(',').map((item) => item.trim()).filter(Boolean)
  io = new Server(server, { cors: { origin: origins, credentials: true } })
  io.use(async (socket, next) => {
    try {
      const payload = jwt.verify(String(socket.handshake.auth.token || ''), getJwtSecret()) as {
        userId: string
        role: Role
      }
      if (!(await User.exists({ _id: payload.userId, status: 'ACTIVE' }))) throw new Error()
      socket.data.auth = payload
      next()
    } catch {
      next(new Error('未授權的即時連線'))
    }
  })
  io.on('connection', (socket) => socket.join(userRoom(socket.data.auth.userId)))
}

export function emitRealtimeToUsers(event: RealtimeEvent, userIds: unknown[]): void {
  for (const room of userRooms(userIds)) {
    io?.to(room).emit(event, { changedAt: Date.now() })
  }
}

/** 收件者全部由資料庫關係推導，client 不能自行指定 userId 或 booking room。 */
export async function emitBookingRealtime(bookingId: string, event: RealtimeEvent = 'booking:changed'): Promise<void> {
  const booking = await Booking.findById(bookingId).select('requesterUserId caregiverId recipientId')
  if (!booking) return
  const [caregiver, recipient, relations] = await Promise.all([
    CaregiverProfile.findById(booking.get('caregiverId')).select('userId'),
    CareRecipient.findById(booking.get('recipientId')).select('accountUserId'),
    booking.get('recipientId')
      ? UserRecipientRelation.find({ recipientId: booking.get('recipientId'), canViewRecord: true, status: 'ACTIVE' }).select('userId')
      : [],
  ])
  emitRealtimeToUsers(event, [
    booking.get('requesterUserId'),
    caregiver?.get('userId'),
    recipient?.get('accountUserId'),
    ...relations.map((relation) => relation.get('userId')),
  ])
}

export async function emitLeaveRealtime(caregiverId: unknown): Promise<void> {
  const [caregiver, admins] = await Promise.all([
    CaregiverProfile.findById(caregiverId).select('userId'),
    User.find({ role: 'ADMIN', status: 'ACTIVE' }).select('_id'),
  ])
  emitRealtimeToUsers('leave:changed', [caregiver?.get('userId'), ...admins.map((admin) => admin._id)])
}
