import { taipeiCalendarTime, taipeiDateKey } from './datetime';

type CalendarBooking = {
  _id: string;
  scheduledStartAt: string;
  scheduledEndAt?: string;
  recipientId?: { name?: string };
  serviceTypeIds?: Array<{ name?: string }>;
};

export function toCalendarEvent(booking: CalendarBooking) {
  const start = new Date(booking.scheduledStartAt);
  const end = new Date(booking.scheduledEndAt || start.getTime() + 60 * 60_000);
  return {
    bookingId: booking._id,
    date: taipeiDateKey(start),
    startTime: taipeiCalendarTime(start),
    durationMinutes: Math.max(30, (end.getTime() - start.getTime()) / 60_000),
    title: `${booking.recipientId?.name || '受照護者'}・${booking.serviceTypeIds?.map((item) => item.name).filter(Boolean).join('、') || '照護服務'}`,
  };
}
