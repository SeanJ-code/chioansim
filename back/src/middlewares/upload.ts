import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import multer from 'multer'

/**
 * Multer 檔案上傳共用設定。
 * MVP 先存在本機 uploads；正式部署可再改成雲端物件儲存服務。
 */
const uploadDirectory = path.resolve(process.cwd(), 'uploads')
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
