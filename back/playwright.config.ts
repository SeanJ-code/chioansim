import 'dotenv/config'
import { defineConfig } from '@playwright/test'

const sourceUri = process.env.MONGODB_URI || ''
const testUri = sourceUri.replace(/\/[^/?]+(\?|$)/, '/chioansim_e2e$1')

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:3100/api' },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3100/health',
    reuseExistingServer: false,
    env: { ...process.env, PORT: '3100', MONGODB_URI: testUri },
  },
})

export { testUri }
