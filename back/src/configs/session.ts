import type { RequestHandler } from 'express'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import mongoose from 'mongoose'
import { getSessionSecret } from './env'

export function createSessionMiddleware(): RequestHandler {
  const isProduction = process.env.NODE_ENV === 'production'

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
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
}
