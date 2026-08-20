import { Schema, model } from 'mongoose'

// 站內通知先保存送達與已讀狀態；LINE／Email 之後沿用同一筆紀錄做重試。
const notificationSchema = new Schema(
  {
    recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['BOOKING', 'SAFETY', 'SYSTEM'], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    channel: { type: String, enum: ['IN_APP', 'LINE', 'EMAIL', 'BROWSER'], default: 'IN_APP' },
    status: { type: String, enum: ['SENT', 'FAILED', 'READ'], default: 'SENT' },
    attempts: { type: Number, default: 1 },
    lastError: String,
    sentAt: { type: Date, default: Date.now },
    readAt: Date,
  },
  { timestamps: true },
)

notificationSchema.index({ recipientUserId: 1, status: 1, createdAt: -1 })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Notification = model<any>('Notification', notificationSchema)
