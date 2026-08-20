import type { Server as HttpServer } from 'node:http'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { getJwtSecret } from './configs/env'
import { User, type Role } from './models'

type RealtimeEvent = 'booking:changed' | 'alert:changed' | 'location:changed'
let io: Server | undefined

/** Socket 只傳「哪類資料已改變」，完整資料仍由原本有權限的 API 重新取得。 */
export function startRealtime(server: HttpServer): void {
  io = new Server(server, { cors: { origin: true, credentials: true } })
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
}

export function emitRealtime(event: RealtimeEvent): void {
  io?.emit(event, { changedAt: Date.now() })
}
