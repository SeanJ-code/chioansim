export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET 必須設定為至少 32 個字元的隨機字串')
  }
  return secret
}

export function validateEnvironment(): void {
  if (!process.env.MONGODB_URI?.trim()) {
    throw new Error('MONGODB_URI 未設定，請建立 .env')
  }
  getSessionSecret()
}
