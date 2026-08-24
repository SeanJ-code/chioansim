import { Router } from 'express'
import { isValidObjectId } from 'mongoose'
import { authenticate, authorize } from '../middlewares/auth'
import type { AuthRequest } from '../types/auth'
import { asyncHandler } from '../utils/http'
import { Booking, CaregiverProfile, Favorite, Review } from '../models'

export const favoriteRoutes = Router()
favoriteRoutes.use(authenticate, authorize('USER', 'PATIENT'))

favoriteRoutes.get(
  '/',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const favorites = await Favorite.find({ userId: request.auth!.userId })
      .populate({
        path: 'caregiverId',
        match: { verificationStatus: 'APPROVED', active: true },
        populate: { path: 'userId serviceTypeIds', select: 'name role' },
      })
      .sort({ createdAt: -1 })
      .lean()

    const result = await Promise.all(
      favorites.map(async (favorite) => {
        const caregiver = (favorite as unknown as { caregiverId?: Record<string, any> }).caregiverId
        if (!caregiver) return null
        const [previousJobs, reviews] = await Promise.all([
          Booking.find({ requesterUserId: request.auth!.userId, caregiverId: caregiver._id, status: 'COMPLETED', hidden: { $ne: true } })
            .select('scheduledStartAt serviceTypeIds')
            .populate('serviceTypeIds', 'name')
            .sort({ scheduledStartAt: -1 })
            .limit(3)
            .lean(),
          Review.find({ targetUserId: caregiver.userId?._id, visible: true, hidden: { $ne: true } })
            .select('rating comment createdAt')
            .sort({ createdAt: -1 })
            .limit(3)
            .lean(),
        ])
        return { ...caregiver, isFavorite: true, myPreviousJobs: previousJobs, reviews }
      }),
    )
    response.json(result.filter(Boolean))
  }),
)

favoriteRoutes.post(
  '/toggle',
  asyncHandler(async (rawRequest, response) => {
    const request = rawRequest as AuthRequest
    const caregiverId = String(request.body.caregiverId || '')
    if (!isValidObjectId(caregiverId)) {
      response.status(400).json({ message: '居服員編號格式不正確' })
      return
    }
    if (!(await CaregiverProfile.exists({ _id: caregiverId, verificationStatus: 'APPROVED', active: true }))) {
      response.status(404).json({ message: '找不到可收藏的居服員' })
      return
    }
    const filter = { userId: request.auth!.userId, caregiverId }
    const existing = await Favorite.findOne(filter)
    if (existing) {
      await existing.deleteOne()
      response.json({ isFavorite: false, message: '已取消收藏' })
      return
    }
    await Favorite.create(filter)
    response.json({ isFavorite: true, message: '已加入收藏' })
  }),
)
