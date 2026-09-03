import 'dotenv/config'
import { createServer } from 'node:http'
import express from 'express'
import mongoose from 'mongoose'
import { app } from './configs/app'
import { validateEnvironment } from './configs/env'
import { createSessionMiddleware } from './configs/session'
import { ensureServiceCatalog } from './configs/service-catalog'
import { resolveSessionAuth } from './middlewares/auth'
import { startRealtime } from './realtime'

/** 程式進入點：讀取 .env、連線 MongoDB，成功後才開始接收 HTTP 請求。 */
const port = Number(process.env.PORT || 3000)

async function start(): Promise<void> {
  validateEnvironment()
  const mongoUri = process.env.MONGODB_URI as string

  // 先等資料庫連線完成，再呼叫 listen，可避免啟動瞬間收到無法處理的請求。
  // Atlas 網路未授權時，快速回報啟動錯誤，避免開發模式看起來像無限卡住。
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10_000 })
  await ensureServiceCatalog()
  console.log('MongoDB connected')

  const rootApp = express()
  const sessionMiddleware = createSessionMiddleware()
  rootApp.use(sessionMiddleware, resolveSessionAuth, app)
  const server = createServer(rootApp)
  startRealtime(server, sessionMiddleware)
  server.listen(port, () => {
    console.log(`照安心 API running at http://localhost:${port}`)
  })
}

// 捕捉啟動階段錯誤；exit(1) 讓作業系統或部署平台知道啟動失敗。
start().catch((error: unknown) => {
  console.error('API 啟動失敗', error)
  process.exit(1)
})
