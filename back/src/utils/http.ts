import type { NextFunction, Request, RequestHandler, Response } from 'express'
import mongoose from 'mongoose'
import { MulterError } from 'multer'
import { ValidationError } from 'yup'

/**
 * 包裝 async route：只要處理函式 throw，就自動把錯誤交給 errorHandler。
 * 因此每一支 API 不必重複撰寫 try/catch。
 */
export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (request, response, next) => {
    void handler(request, response, next).catch(next)
  }
}

// 所有路由都沒有符合時，回傳 HTTP 404。
export function notFound(_request: Request, response: Response): void {
  response.status(404).json({ message: '找不到此 API 路由' })
}

// 全站統一錯誤出口，確保單一請求出錯不會讓整個伺服器崩潰。
export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  // Yup 負責 API 邊界的 Payload 驗證，統一回傳第一個可理解的中文錯誤。
  if (error instanceof ValidationError) {
    response.status(400).json({ message: error.errors[0] || '輸入資料格式錯誤' })
    return
  }

  // express.json() 無法解析 Body 時會拋出 SyntaxError；常見原因是漏掉逗號或引號。
  if (error instanceof SyntaxError) {
    response.status(400).json({
      message: 'JSON 格式錯誤，請檢查每個欄位之間是否有逗號，文字是否使用雙引號。',
    })
    return
  }

  // Mongoose Schema 驗證失敗，例如缺少必填欄位、數字超出範圍。
  if (error instanceof mongoose.Error.ValidationError) {
    const fields = Object.keys(error.errors)
    response.status(400).json({
      message: `資料欄位驗證失敗${fields.length ? `：${fields.join('、')}` : ''}`,
    })
    return
  }

  // 網址中的 :id 不是合法 MongoDB ObjectId。
  if (error instanceof mongoose.Error.CastError) {
    response.status(400).json({ message: `資料 ID 格式錯誤：${error.value}` })
    return
  }

  // MongoDB unique 索引衝突，例如註冊已存在的 account。
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    response.status(409).json({ message: '資料已存在，請更換不可重複的欄位內容。' })
    return
  }

  if (error instanceof MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? '上傳檔案超過大小限制。'
        : error.code === 'LIMIT_FILE_COUNT'
          ? '上傳檔案數量超過限制。'
          : '檔案上傳失敗，請檢查檔案數量與格式。'
    response.status(400).json({ message })
    return
  }

  if (
    error instanceof Error &&
    (error.message.startsWith('只允許上傳') || error.message.startsWith('人物照片只允許'))
  ) {
    response.status(400).json({ message: error.message })
    return
  }

  // 路由可拋出帶 statusCode 的可預期業務錯誤，例如拒絕未同意的 GPS 分享。
  if (
    error instanceof Error &&
    'statusCode' in error &&
    Number.isInteger(error.statusCode) &&
    Number(error.statusCode) >= 400 &&
    Number(error.statusCode) < 500
  ) {
    response.status(Number(error.statusCode)).json({
      message: error.message,
      ...('code' in error && typeof error.code === 'string' ? { code: error.code } : {}),
    })
    return
  }

  // 未預期錯誤不直接回傳英文內部訊息，避免洩漏伺服器實作細節。
  console.error('未處理的 API 錯誤：', error)
  response.status(500).json({ message: '伺服器處理失敗，請稍後再試或聯絡管理員。' })
}
