const TAIPEI_OFFSET_MINUTES = 8 * 60
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME = /^(\d{2}):(\d{2})$/

/** 將沒有時區的 UI 日期時間明確解讀為 Asia/Taipei，再轉成可存入 MongoDB 的 UTC Date。 */
export function taipeiDateTimeToUtc(dateText: string, timeText: string): Date {
  const date = DATE.exec(dateText)
  const time = TIME.exec(timeText)
  if (!date || !time) throw Object.assign(new Error('請提供正確的服務日期與時間'), { statusCode: 400 })
  const [year, month, day, hour, minute] = [date[1], date[2], date[3], time[1], time[2]].map(Number)
  if (hour! > 23 || minute! > 59) throw Object.assign(new Error('請提供正確的服務日期與時間'), { statusCode: 400 })
  const utc = new Date(Date.UTC(year!, month! - 1, day!, hour!, minute!) - TAIPEI_OFFSET_MINUTES * 60_000)
  const taipei = new Date(utc.getTime() + TAIPEI_OFFSET_MINUTES * 60_000)
  if (taipei.getUTCFullYear() !== year || taipei.getUTCMonth() !== month! - 1 || taipei.getUTCDate() !== day) {
    throw Object.assign(new Error('請提供正確的服務日期與時間'), { statusCode: 400 })
  }
  return utc
}

export const taipeiDayStartUtc = (dateText: string): Date => taipeiDateTimeToUtc(dateText, '00:00')
export const taipeiDateKey = (date: Date): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date)

export const taipeiWeekday = (dateText: string): number =>
  new Date(taipeiDayStartUtc(dateText).getTime() + TAIPEI_OFFSET_MINUTES * 60_000).getUTCDay()
