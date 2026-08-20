import { ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/boot/axios';
import { useGeolocation, type SharedLocation } from '@/composables/useGeolocation';

export const useLocationStore = defineStore('location', () => {
  const geolocation = useGeolocation();
  const bookingId = ref<string | null>(null);
  const lastUpdatedAt = ref<string | null>(null);
  let readyToUpload = false;
  let lastUploadAt = 0;

  async function upload(location: SharedLocation) {
    lastUpdatedAt.value = location.capturedAt;
    if (!readyToUpload || !bookingId.value || Date.now() - lastUploadAt < 10_000) return;
    lastUploadAt = Date.now();
    await api.patch(`/bookings/${bookingId.value}/location`, location);
  }

  function stopLocal() {
    geolocation.stopTracking();
    readyToUpload = false;
    bookingId.value = null;
    lastUploadAt = 0;
  }

  async function stopSharing() {
    const id = bookingId.value;
    stopLocal();
    if (id) await api.post(`/bookings/${id}/location/stop`).catch(() => undefined);
  }

  async function startSharing(id: string, resume = false) {
    if (bookingId.value && bookingId.value !== id) await stopSharing();
    bookingId.value = id;
    readyToUpload = false;
    try {
      const first = await geolocation.startTracking((location) => {
        void upload(location).catch(() => undefined);
      });
      if (resume) await api.patch(`/bookings/${id}/location`, first);
      else await api.post(`/bookings/${id}/depart`, { location: first });
      lastUpdatedAt.value = first.capturedAt;
      lastUploadAt = Date.now();
      readyToUpload = true;
    } catch (cause) {
      stopLocal();
      throw cause;
    }
  }

  async function arrive(id: string) {
    const location = geolocation.currentPosition.value;
    if (!location) throw new Error('尚未取得目前位置，請稍後再試。');
    await api.post(`/bookings/${id}/arrive`, { location });
  }

  async function startService(id: string) {
    await api.post(`/bookings/${id}/start`);
    await stopSharing();
  }

  return {
    currentLocation: geolocation.currentPosition,
    isSharing: geolocation.tracking,
    permission: geolocation.permission,
    error: geolocation.error,
    bookingId,
    lastUpdatedAt,
    startSharing,
    stopSharing,
    stopLocal,
    arrive,
    startService,
    getPermissionStatus: geolocation.getPermissionStatus,
  };
});
