const taipeiDateKey = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
const taipeiCalendarTime = (date: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date)

export function leaveCalendarSegments(leave: { _id: string; startAt: string; endAt: string }) {
  const start = new Date(leave.startAt)
  const end = new Date(leave.endAt)
  const segments = []
  let date = taipeiDateKey(start)
  while (true) {
    const dayStart = new Date(`${date}T00:00:00+08:00`)
    if (dayStart >= end) break
    const nextDay = new Date(dayStart.getTime() + 86_400_000)
    const segmentStart = new Date(Math.max(start.getTime(), dayStart.getTime()))
    const segmentEnd = new Date(Math.min(end.getTime(), nextDay.getTime()))
    segments.push({ id: `leave-${leave._id}-${date}`, date, startTime: taipeiCalendarTime(segmentStart), durationMinutes: Math.max(30, (segmentEnd.getTime() - segmentStart.getTime()) / 60_000) })
    date = taipeiDateKey(nextDay)
  }
  return segments
}
