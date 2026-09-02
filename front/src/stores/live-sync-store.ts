import { ref } from 'vue';
import { defineStore } from 'pinia';
import { io, type Socket } from 'socket.io-client';

const SYNC_KEY = 'chioansim-data-changed';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const realtimeBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
let timer: ReturnType<typeof setInterval> | undefined;
let refresh: (() => Promise<void>) | undefined;
let socket: Socket | undefined;

export function setRealtimeAccessToken(token?: string) {
  if (!socket) return;
  if (!token) { socket.disconnect(); return; }
  socket.auth = { token };
  socket.disconnect().connect();
}

export const useLiveSyncStore = defineStore('live-sync', () => {
  const syncing = ref(false);
  const lastSyncedAt = ref<number | null>(null);
  const online = ref(typeof navigator === 'undefined' || navigator.onLine);

  async function refreshNow() {
    if (!refresh || syncing.value || !online.value) return;
    syncing.value = true;
    try { await refresh(); lastSyncedAt.value = Date.now(); }
    finally { syncing.value = false; }
  }
  function onStorage(event: StorageEvent) { if (event.key === SYNC_KEY) void refreshNow(); }
  function onOnline() { online.value = true; void refreshNow(); }
  function onOffline() { online.value = false; }
  function onVisibilityChange() { if (document.visibilityState === 'visible') void refreshNow(); }
  function stop() {
    if (timer) clearInterval(timer);
    timer = undefined; refresh = undefined;
    socket?.disconnect(); socket = undefined;
    if (typeof window === 'undefined') return;
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }
  function start(callback: () => Promise<void>, intervalMs = 60_000) {
    stop(); refresh = callback;
    if (typeof window === 'undefined') return;
    online.value = navigator.onLine;
    window.addEventListener('storage', onStorage);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const token = sessionStorage.getItem('chioansim-access-token');
    if (token) {
      socket = io(realtimeBaseUrl || undefined, { auth: { token }, reconnectionAttempts: 2 });
      for (const event of ['booking:changed', 'alert:changed', 'location:changed', 'leave:changed', 'safe-report:changed']) {
        socket.on(event, () => void refreshNow());
      }
    }
    // ponytail: 60 秒輪詢只作斷線保險；Socket 正常時資料由事件立即更新。
    timer = setInterval(() => void refreshNow(), intervalMs);
  }
  function notifyChanged() {
    lastSyncedAt.value = Date.now();
    if (typeof window !== 'undefined') localStorage.setItem(SYNC_KEY, `${Date.now()}`);
  }
  return { syncing, lastSyncedAt, online, start, stop, refreshNow, notifyChanged };
});
