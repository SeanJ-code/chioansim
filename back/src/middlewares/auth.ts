import type { NextFunction, Response } from 'express'
import type { Role } from '../models'
import { User } from '../models'
import type { AuthRequest } from '../types/auth'

export async function resolveSessionAuth(
  request: AuthRequest,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  const userId = request.session?.userId
  if (!userId) {
    next()
    return
  }

  const user = await User.findOne({ _id: userId, status: 'ACTIVE' }).select('role')
  if (!user) {
    delete request.session.userId
    delete request.session.role
    next()
    return
  }

  const role = user.get('role') as Role
  request.session.role = role
  request.auth = { userId, role }
  next()
}

export function authenticate(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
): void {
  if (request.auth) {
    next()
    return
  }
  response.status(401).json({ message: '尚未登入或 Session 已失效' })
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
