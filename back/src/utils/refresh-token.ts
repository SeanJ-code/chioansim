import crypto from 'node:crypto'
import type { CookieOptions, Response } from 'express'
import { RefreshToken } from '../models/refresh-token'

export const refreshCookieName = 'refresh'

/** Cookie 無法被前端 JavaScript 讀取，可降低 XSS 竊取 RT 的風險。 */
export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 1000 * 60 * 60 * 24 * 7,
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/** 建立 RT、只把雜湊存進 MongoDB，原始值放入瀏覽器/Postman Cookie。 */
export async function issueRefreshToken(response: Response, userId: string): Promise<void> {
  const token = crypto.randomBytes(64).toString('hex')
  await RefreshToken.create({ userId, tokenHash: hashRefreshToken(token) })
  response.cookie(refreshCookieName, token, refreshCookieOptions)
}

