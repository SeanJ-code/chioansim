import { Router } from 'express'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { gunzip } from 'node:zlib'
import { promisify } from 'node:util'
import { asyncHandler } from '../utils/http'

const DATA_URL = process.env.LTC_DATA_URL || 'https://ltcpap.mohw.gov.tw/publish/abc.csv'
const CACHE_MS = 24 * 60 * 60 * 1000
const SNAPSHOT_PATH = path.resolve(__dirname, '../../data/ltc-abc.csv.gz')
const unzip = promisify(gunzip)

export type LtcCenter = {
  id: string
  name: string
  level: string
  address: string
  phone: string
  service: string
  lat: number
  lng: number
}

let cache: { loadedAt: number; centers: LtcCenter[] } | null = null
let loading: Promise<LtcCenter[]> | null = null

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [],
    field = '',
    quoted = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '"' && quoted && text[index + 1] === '"') {
      field += '"'
      index++
    } else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index++
      row.push(field)
      field = ''
      if (row.some(Boolean)) rows.push(row)
      row = []
    } else field += char
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRadians(lat2 - lat1),
    dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function toCenters(text: string): LtcCenter[] {
  const [headers = [], ...rows] = parseCsv(text.replace(/^\uFEFF/, ''))
  const column = (name: string) => headers.indexOf(name)
  return rows.flatMap((row) => {
    const lat = Number(row[column('緯度')]),
      lng = Number(row[column('經度')])
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []
    return [
      {
        id: row[column('機構代碼')] || `${lng},${lat}`,
        name: row[column('機構名稱')] || '長照服務據點',
        level: row[column('O_ABC')] || '長照',
        address: row[column('地址全址')] || '未提供地址',
        phone: row[column('機構電話')] || '',
        service: row[column('特約服務項目')] || '',
        lat,
        lng,
      },
    ]
  })
}

async function downloadCenters(): Promise<LtcCenter[]> {
  const startedAt = Date.now()
  try {
    const response = await fetch(DATA_URL, {
      signal: AbortSignal.timeout(60_000),
      headers: { Accept: 'text/csv,*/*', 'User-Agent': 'Chioansim-LTC-Service/1.0' },
    })
    if (!response.ok) throw new Error(`LTC data responded ${response.status}`)
    const centers = toCenters(await response.text())
    if (!centers.length) throw new Error('LTC data was empty after parsing')
    cache = { loadedAt: Date.now(), centers }
    console.info(`[LTC] loaded ${centers.length} centers in ${Date.now() - startedAt}ms`)
    return centers
  } catch (error) {
    console.error(`[LTC] download failed after ${Date.now() - startedAt}ms`, error)
    if (cache) return cache.centers
    throw error
  }
}

async function getCenters(): Promise<LtcCenter[]> {
  if (cache && Date.now() - cache.loadedAt < CACHE_MS) return cache.centers
  if (!cache) {
    const centers = toCenters((await unzip(await readFile(SNAPSHOT_PATH))).toString('utf8'))
    if (!centers.length) throw new Error('Bundled LTC snapshot was empty')
    cache = { loadedAt: Date.now(), centers }
    // Render 目前無法連到官方主機；先回傳快照，背景嘗試更新即可。
    loading ||= downloadCenters().finally(() => { loading = null })
    void loading.catch(() => undefined)
    return centers
  }
  loading ||= downloadCenters().finally(() => { loading = null })
  return loading
}

export const ltcRoutes = Router()

ltcRoutes.get(
  '/nearby',
  asyncHandler(async (request, response) => {
    const lat = Number(request.query.lat),
      lng = Number(request.query.lng)
    const radius = Math.min(20_000, Math.max(1_000, Number(request.query.radius) || 5_000))
    const limit = Math.min(10, Math.max(1, Number(request.query.limit) || 5))
    if (
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90 ||
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      response.status(400).json({ message: '定位資訊不正確，請重新取得位置。' })
      return
    }
    const nearby = (await getCenters())
      .map((center) => ({
        ...center,
        distanceMeters: Math.round(distanceMeters(lat, lng, center.lat, center.lng)),
      }))
      .filter((center) => center.distanceMeters <= radius)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)

    response.json({
      count: nearby.length,
      location: nearby[0]?.address.match(/^(.{2,3}[縣市])(.{1,4}[區鄉鎮市])/)?.slice(1) || [],
      results: nearby.slice(0, limit),
      sourceUpdatedAt: new Date(cache?.loadedAt || Date.now()).toISOString(),
    })
  }),
)
