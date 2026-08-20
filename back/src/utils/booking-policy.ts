export function isCancellationRefundEligible(
  status: string,
  scheduledStartAt: Date,
  now = new Date(),
): boolean {
  return status === 'PENDING' || scheduledStartAt.getTime() - now.getTime() >= 72 * 60 * 60 * 1000
}

export function nextBookingCompletionStatus(status: string, actor: 'NURSE' | 'USER') {
  if (actor === 'NURSE' && ['ACCEPTED', 'ARRIVED', 'IN_SERVICE'].includes(status))
    return 'AWAITING_USER_CONFIRMATION' as const
  if (actor === 'USER' && status === 'AWAITING_USER_CONFIRMATION') return 'COMPLETED' as const
  return null
}

export const LOCATION_SHARING_STATUSES = ['DEPARTED', 'ARRIVED'] as const
