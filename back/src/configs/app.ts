import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import mongoose from 'mongoose'
import { errorHandler, notFound } from '../utils/http'
import { adminRoutes } from '../routes/admin-routes'
import { authRoutes } from '../routes/auth-routes'
import { bookingRoutes } from '../routes/booking-routes'
import { feedbackRoutes } from '../routes/feedback-routes'
import { nurseRoutes } from '../routes/nurse-routes'
import { patientRoutes } from '../routes/patient-routes'
import { serviceRoutes } from '../routes/service-routes'
import { notificationRoutes } from '../routes/notification-routes'
import { favoriteRoutes } from '../routes/favorite-routes'
import { ltcRoutes } from '../routes/ltc-routes'
import { uploadDirectory } from '../middlewares/upload'

/**
 * Express 應用程式的「組裝中心」。
 * 這裡只組合中介軟體與路由；實際商業邏輯放在 controllers。
 */
export const app = express()

// CORS 限制可呼叫 API 的前端來源；正式環境應用環境變數指定正式網域。
// 開發時 Quasar 若發現 9000 被占用，會自動改用 9001，因此允許以逗號設定多個來源。
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:9000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: corsOrigins,
    // 允許瀏覽器跨來源攜帶 HttpOnly Refresh Token Cookie。
    credentials: true,
  }),
)
// 將 JSON 請求轉成 request.body，1 MB 限制可避免超大 JSON 占用記憶體。
app.use(express.json({ limit: '1mb' }))
// 將 Cookie 解析到 request.cookies，Refresh Token 更新與登出會用到。
app.use(cookieParser())

// 將本機 uploads 資料夾公開為 /uploads/... 網址。
app.use('/uploads', express.static(uploadDirectory))

// 健康檢查不需登入，用於確認 API 活著且 MongoDB 已連線。
const healthHandler = (_request: express.Request, response: express.Response) => {
  response.json({
    ok: true,
    service: '照安心 API',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
}
app.get('/health', healthHandler)
app.get('/api/health', healthHandler)

// 直接在瀏覽器輸入 http://localhost:3000 可查看所有主要 API，不需要匯入 JSON 檔。
app.get('/', (_request, response) => {
  response.json({
    service: '照安心 API',
    message: '可直接使用下列網址；POST/PATCH/DELETE 請以 Postman 手動選擇 Method 與 Body。',
    accessToken: '15 分鐘',
    refreshToken: 'HttpOnly Cookie，7 天並於每次 refresh 輪替',
    routes: {
      health: 'GET /health',
      auth: '/auth',
      patients: '/patients',
      nurses: '/nurses',
      services: '/services',
      bookings: '/bookings',
      feedback: '/feedback',
      admin: '/admin',
    },
  })
})

// 路由前綴：例如 authRoutes 的 /login，完整網址是 /api/auth/login。
app.use('/api/auth', authRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/nurses', nurseRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/ltc', ltcRoutes)

// 參考專案風格的簡短網址；保留上方 /api 版本，避免既有前端與測試失效。
app.use('/auth', authRoutes)
app.use('/patients', patientRoutes)
app.use('/nurses', nurseRoutes)
app.use('/services', serviceRoutes)
app.use('/bookings', bookingRoutes)
app.use('/feedback', feedbackRoutes)
app.use('/admin', adminRoutes)
app.use('/notifications', notificationRoutes)
app.use('/favorites', favoriteRoutes)
app.use('/ltc', ltcRoutes)

// 必須放最後：沒有任何路由符合才回 404；執行時的例外則交給 errorHandler。
app.use(notFound)
app.use(errorHandler)
