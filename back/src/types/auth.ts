import type { Request } from 'express'
import type { Role } from '../models'

/**
 * Express 原生 Request 沒有登入資料；AuthRequest 增加 auth，
 * 讓通過 JWT 驗證後的 routes 能取得目前使用者 ID 與角色。
 */
export interface AuthRequest extends Request {
  auth?: { userId: string; role: Role }
}

