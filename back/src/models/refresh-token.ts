import { Schema, model } from 'mongoose'

/**
 * Refresh Token 資料表只保存雜湊後的值；即使資料庫外洩，也不能直接拿來登入。
 * expires 是 MongoDB TTL 索引，30 天後會自動清除過期資料。
 */
const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
  },
  { versionKey: false },
)

export const RefreshToken = model<any>('RefreshToken', refreshTokenSchema)
