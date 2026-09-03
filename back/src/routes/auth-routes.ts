import { Router } from 'express'
import {
  login,
  logout,
  me,
  register,
  registerNurse,
  resetPassword,
  verifyPasswordRecovery,
} from '../controllers/auth-controller'
import { authenticate } from '../middlewares/auth'
import { upload } from '../middlewares/upload'
import { asyncHandler } from '../utils/http'

/**
 * 驗證路由只描述 HTTP Method、網址與必要中介軟體。
 * Payload 驗證與資料庫操作集中在 auth-controller，方便測試與課堂說明。
 */
export const authRoutes = Router()

authRoutes.post(
  '/register',
  upload.fields([{ name: 'recipientPhotos', maxCount: 3 }]),
  asyncHandler(register),
)
authRoutes.post('/login', asyncHandler(login))
authRoutes.post('/password-recovery/verify', asyncHandler(verifyPasswordRecovery))
authRoutes.post('/password-recovery/reset', asyncHandler(resetPassword))
authRoutes.delete('/logout', asyncHandler(logout))
authRoutes.post(
  '/register-nurse',
  upload.fields([
    { name: 'certificate', maxCount: 1 },
    { name: 'profilePhoto', maxCount: 1 },
  ]),
  asyncHandler(registerNurse),
)
authRoutes.get('/me', authenticate, asyncHandler(me))
