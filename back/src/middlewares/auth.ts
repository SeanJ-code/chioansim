import type { NextFunction, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { Role } from '../models'
import { User } from '../models'
import type { AuthRequest } from '../types/auth'
import { getJwtSecret } from '../configs/env'

/**
 * 身分驗證（Authentication）：確認「你是誰」。
 * 前端登入後會在 Authorization 標頭傳入 Bearer JWT，此中介軟體驗證簽章與期限。
 */
export async function authenticate(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  // replace 只移除開頭的 Bearer，不分大小寫，留下真正的 JWT 字串。
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) {
    response.status(401).json({ message: '缺少 Bearer token' })
    return
  }

  try {
    // verify 同時檢查 Token 是否被竄改、是否過期，成功才取得當初放入的 payload。
    const payload = jwt.verify(token, getJwtSecret()) as {
      userId: string
      role: Role
    }
    // 每次請求再查帳號狀態，因此 ADMIN 停權後，舊 Token 也會立刻失效。
    const activeUser = await User.exists({ _id: payload.userId, status: 'ACTIVE' })
    if (!activeUser) {
      response.status(403).json({ message: '帳號不存在、尚未核准或已停權' })
      return
    }
    // 把登入資料掛回 request，後面的 authorize 與 route 就能使用。
    request.auth = payload
    next()
  } catch {
    response.status(401).json({ message: 'Token 無效或已過期' })
  }
}

/**
 * 授權（Authorization）：已知道你是誰之後，再確認「你能做什麼」。
 * 例如 authorize('ADMIN') 只允許管理員；authorize('USER', 'PATIENT') 則允許兩種角色。
 */
export function authorize(...allowedRoles: Role[]) {
  return (request: AuthRequest, response: Response, next: NextFunction): void => {
    if (!request.auth || !allowedRoles.includes(request.auth.role)) {
      response.status(403).json({ message: '沒有執行此操作的權限' })
      return
    }
    next()
  }
}

// 可獨立使用的帳號狀態檢查；目前 authenticate 已包含相同防護，保留作為教學與彈性用途。
export async function requireActiveAccount(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const user = await User.findById(request.auth?.userId).select('status')
  if (!user || user.get('status') !== 'ACTIVE') {
    response.status(403).json({ message: '帳號不存在或已停權' })
    return
  }
  next()
}

// 登入成功後簽發 JWT；只放必要的 userId、role，不可放密碼或敏感病歷。
export function signToken(userId: string, role: Role): string {
  return jwt.sign({ userId, role }, getJwtSecret(), {
    // Access Token 保留 1 小時；到期後用 HttpOnly Cookie 中的 RT 更新。
    expiresIn: '1h',
  })
}
