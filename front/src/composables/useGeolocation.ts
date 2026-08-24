import { ref } from 'vue';

export type SharedLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
  consent: true;
};

export type LocationPermission = PermissionState | 'unsupported';

export function useGeolocation() {
  const currentPosition = ref<SharedLocation | null>(null);
  const tracking = ref(false);
  const permission = ref<LocationPermission>('prompt');
  const error = ref('');
  let watchId: number | null = null;

  async function getPermissionStatus() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      permission.value = 'unsupported';
      return permission.value;
    }
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      permission.value = status.state;
      status.onchange = () => { permission.value = status.state; };
    } catch {
      permission.value = 'prompt';
    }
    return permission.value;
  }

  function stopTracking() {
    if (watchId !== null && typeof navigator !== 'undefined') navigator.geolocation.clearWatch(watchId);
    watchId = null;
    tracking.value = false;
  }

  function startTracking(onPosition?: (location: SharedLocation) => void) {
    return new Promise<SharedLocation>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.isSecureContext || !navigator.geolocation) {
        error.value = typeof window !== 'undefined' && !window.isSecureContext
          ? '定位只能在 HTTPS 或 localhost 使用。'
          : '這個瀏覽器不支援定位。';
        permission.value = 'unsupported';
        reject(new Error(error.value));
        return;
      }

      stopTracking();
      error.value = '';
      let waitingFirstPosition = true;
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: SharedLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
            capturedAt: new Date(position.timestamp).toISOString(),
            consent: true,
          };
          currentPosition.value = location;
          tracking.value = true;
          permission.value = 'granted';
          onPosition?.(location);
          if (waitingFirstPosition) resolve(location);
          waitingFirstPosition = false;
        },
        (reason) => {
          error.value = reason.code === reason.PERMISSION_DENIED
            ? '您尚未允許位置權限，請在瀏覽器設定中開啟。'
            : reason.code === reason.POSITION_UNAVAILABLE
              ? '目前無法取得位置，請確認裝置定位已開啟。'
              : '取得位置逾時，請移到訊號較好的地方再試。';
          if (reason.code === reason.PERMISSION_DENIED) permission.value = 'denied';
          stopTracking();
          if (waitingFirstPosition) reject(new Error(error.value));
          waitingFirstPosition = false;
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 60_000 },
      );
    });
  }

  return { currentPosition, tracking, permission, error, startTracking, stopTracking, getPermissionStatus };
}
