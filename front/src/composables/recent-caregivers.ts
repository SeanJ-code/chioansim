export interface RecentCaregiverRecord {
  caregiverId: string;
  viewedAt: number;
}

const storageKey = (userId: string) => `chioansim-recent-caregivers:${userId}`;

export function updateRecentCaregivers(records: RecentCaregiverRecord[], caregiverId: string, viewedAt = Date.now()) {
  return [{ caregiverId, viewedAt }, ...records.filter((item) => item.caregiverId !== caregiverId)].slice(0, 20);
}

export function loadRecentCaregivers(userId?: string) {
  if (!userId) return [];
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(userId)) || '[]') as RecentCaregiverRecord[];
    return Array.isArray(value) ? value.filter((item) => typeof item?.caregiverId === 'string' && Number.isFinite(item.viewedAt)).slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function addRecentCaregiver(userId: string, caregiverId: string) {
  const records = updateRecentCaregivers(loadRecentCaregivers(userId), caregiverId);
  sessionStorage.setItem(storageKey(userId), JSON.stringify(records));
  return records;
}

export function clearRecentCaregivers(userId?: string) {
  if (userId) sessionStorage.removeItem(storageKey(userId));
}
