import type { RequestHandler } from 'express'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import mongoose from 'mongoose'
import { getSessionSecret } from './env'

export function createSessionMiddleware(): RequestHandler {
  return session({
    name: process.env.SESSION_COOKIE_NAME || 'chioansim.sid',
    secret: getSessionSecret(),
    proxy: true,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
      ttl: 60 * 60 * 24 * 7,
    }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: (process.env.NODE_ENV ?? 'production') === 'production',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
}
