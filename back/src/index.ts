import 'dotenv/config'
import { createServer } from 'node:http'
import mongoose from 'mongoose'
import { app } from './configs/app'
import { validateEnvironment } from './configs/env'
import { ensureServiceCatalog } from './configs/service-catalog'
import { startRealtime } from './realtime'

/** 程式進入點：讀取 .env、連線 MongoDB，成功後才開始接收 HTTP 請求。 */
const port = Number(process.env.PORT || 3000)

async function start(): Promise<void> {
  // 啟動前一次檢查必要設定；缺少 JWT 密鑰時直接停止，不能退回已知預設值。
  validateEnvironment()
  const mongoUri = process.env.MONGODB_URI as string

  // 先等資料庫連線完成，再呼叫 listen，可避免啟動瞬間收到無法處理的請求。
  // Atlas 網路未授權時，快速回報啟動錯誤，避免開發模式看起來像無限卡住。
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10_000 })
  await ensureServiceCatalog()
  console.log('MongoDB connected')

  const server = createServer(app)
  startRealtime(server)
  server.listen(port, () => {
    console.log(`照安心 API running at http://localhost:${port}`)
  })
}

// 捕捉啟動階段錯誤；exit(1) 讓作業系統或部署平台知道啟動失敗。
start().catch((error: unknown) => {
  console.error('API 啟動失敗', error)
  process.exit(1)
})
