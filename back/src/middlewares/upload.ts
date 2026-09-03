import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import type { RequestHandler } from 'express'

/**
 * Multer 檔案上傳共用設定。
 * MVP 先存在本機 uploads；正式部署可再改成雲端物件儲存服務。
 */
export const uploadDirectory = path.resolve(process.env.UPLOAD_DIRECTORY || 'uploads')
// recursive: true 代表資料夾不存在就建立，已存在也不會報錯。
fs.mkdirSync(uploadDirectory, { recursive: true })

// 自訂檔名避免兩位使用者上傳同名檔案時互相覆蓋。
const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    callback(null, `${randomUUID()}${extension}`)
  },
})

export const upload = multer({
  storage,
  // 每個檔案最多 8 MB、單次最多 6 個檔案，避免大量上傳耗盡資源。
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
  fileFilter: (_request, file, callback) => {
    // 本人近照只能是圖片；政府證照與技能文件則可另外使用 PDF。
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp']
    const imageOnlyFields = ['profilePhoto', 'recipientPhotos']
    const allowed = imageOnlyFields.includes(file.fieldname)
      ? imageTypes.includes(file.mimetype)
      : [...imageTypes, 'application/pdf'].includes(file.mimetype)
    if (!allowed) {
      callback(
        new Error(
          imageOnlyFields.includes(file.fieldname)
            ? '人物照片只允許上傳 JPG、PNG 或 WebP 圖片。'
            : '只允許上傳 JPG、PNG、WebP 圖片或 PDF。',
        ),
      )
      return
    }
    callback(null, true)
  },
})

// 照護日誌只接受圖片，且依產品規格限制為 5 張、單張 5 MB。
export const journalUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_request, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new Error('只允許上傳 JPG、PNG 或 WebP 服務照片。'))
      return
    }
    callback(null, true)
  },
})

// Safe Report 附件獨立於工作日誌；建立通報時最多 3 張、單張 5 MB。
export const incidentUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (_request, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new Error('安全通報只允許上傳 JPG、PNG 或 WebP 圖片。'))
      return
    }
    callback(null, true)
  },
})

function hasImageSignature(buffer: Buffer): boolean {
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  const webp = buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP'
  return jpeg || png || webp
}

// MIME 可偽造，因此寫入後再檢查實際檔頭；不合格檔案會立即移除。
export const validateJournalImages: RequestHandler = async (request, _response, next) => {
  const files = (request.files as Express.Multer.File[] | undefined) || []
  try {
    for (const file of files) {
      const handle = await fs.promises.open(file.path, 'r')
      const buffer = Buffer.alloc(12)
      await handle.read(buffer, 0, 12, 0)
      await handle.close()
      if (!hasImageSignature(buffer)) throw new Error('圖片內容不是有效的 JPG、PNG 或 WebP 圖片。')
    }
    next()
  } catch (error) {
    await Promise.all(files.map((file) => fs.promises.unlink(file.path).catch(() => undefined)))
    next(Object.assign(error instanceof Error ? error : new Error('圖片驗證失敗'), { statusCode: 400 }))
  }
}

export const validateIncidentImages = validateJournalImages
