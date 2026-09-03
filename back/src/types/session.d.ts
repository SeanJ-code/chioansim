import 'express-session'
import type { Role } from '../models'

declare module 'express-session' {
  interface SessionData {
    userId?: string
    role?: Role
  }
}
