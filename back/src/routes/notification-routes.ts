import { Router } from 'express'
import { authenticate } from '../middlewares/auth'
import { Notification } from '../models/notification'
import type { AuthRequest } from '../types/auth'
import { asyncHandler } from '../utils/http'

export const notificationRoutes = Router()
notificationRoutes.use(authenticate)

notificationRoutes.get(
  '/',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    response.json(
      await Notification.find({ recipientUserId: request.auth?.userId })
        .sort({ createdAt: -1 })
        .limit(100),
    )
  }),
)

notificationRoutes.patch(
  '/booking/read',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    await Notification.updateMany(
      { recipientUserId: request.auth?.userId, type: 'BOOKING', status: { $ne: 'READ' } },
      { status: 'READ', readAt: new Date() },
    )
    response.status(204).send()
  }),
)

notificationRoutes.patch(
  '/:id/read',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const notification = await Notification.findOneAndUpdate(
      { _id: request.params.id, recipientUserId: request.auth?.userId },
      { status: 'READ', readAt: new Date() },
      { new: true },
    )
    if (!notification) {
      response.status(404).json({ message: '找不到通知' })
      return
    }
    response.json(notification)
  }),
)
