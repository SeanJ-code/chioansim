import { defineStore } from 'pinia';
import { api } from '@/boot/axios';
import { clearRecentCaregivers } from '@/composables/recent-caregivers';
import { setRealtimeAccessToken } from '@/stores/live-sync-store';

export type UserRole = 'USER' | 'PATIENT' | 'NURSE' | 'ADMIN';

type AuthUser = {
  id: string;
  account: string;
  name: string;
  role: UserRole;
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

type RegisterPayload = {
  account: string;
  password: string;
  name: string;
  phone?: string;
  email?: string;
  role: 'USER' | 'PATIENT';
  patientProfile?: Record<string, unknown>;
};

function readStoredUser(): AuthUser | null {
  const storedUser = localStorage.getItem('chioansim-user');
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    localStorage.removeItem('chioansim-user');
    return null;
  }
}

function isAccessTokenUsable(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() + 30_000;
  } catch {
    return false;
  }
}

let restorePromise: Promise<boolean> | undefined;

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: '',
    user: null as AuthUser | null,
    initialized: false,
  }),
  actions: {
    clearSession() {
      this.accessToken = '';
      this.user = null;
      this.initialized = true;
      sessionStorage.removeItem('chioansim-access-token');
      localStorage.removeItem('chioansim-user');
      delete api.defaults.headers.common.Authorization;
      setRealtimeAccessToken();
    },
    saveSession(result: AuthResponse) {
      this.accessToken = result.accessToken;
      this.user = result.user;
      this.initialized = true;
      sessionStorage.setItem('chioansim-access-token', result.accessToken);
      localStorage.setItem('chioansim-user', JSON.stringify(result.user));
      api.defaults.headers.common.Authorization = `Bearer ${result.accessToken}`;
      setRealtimeAccessToken(result.accessToken);
    },
    async login(account: string, password: string) {
      const { data } = await api.post<AuthResponse>('/auth/login', { account, password });
      clearRecentCaregivers(data.user.id);
      this.saveSession(data);
    },
    async register(payload: RegisterPayload | FormData) {
      const { data } = await api.post<AuthResponse>('/auth/register', payload);
      clearRecentCaregivers(data.user.id);
      this.saveSession(data);
    },
    async registerNurse(payload: FormData) {
      const { data } = await api.post<AuthResponse & { message: string }>('/auth/register-nurse', payload);
      clearRecentCaregivers(data.user.id);
      this.saveSession(data);
      return data;
    },
    async restoreSession() {
      if (import.meta.env.QUASAR_SERVER) return false;
      if (this.initialized) return Boolean(this.user);
      if (restorePromise) return restorePromise;

      restorePromise = (async () => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const storedToken = sessionStorage.getItem('chioansim-access-token') || '';
        const storedUser = readStoredUser();
        if (storedUser && isAccessTokenUsable(storedToken)) {
          this.saveSession({ accessToken: storedToken, user: storedUser });
          return true;
        }

        try {
          const { data } = await api.post<AuthResponse>('/auth/refresh');
          this.saveSession(data);
          return true;
        } catch {
          this.clearSession();
          return false;
        }
      })().finally(() => { restorePromise = undefined; });

      return restorePromise;
    },
    async logout() {
      clearRecentCaregivers(this.user?.id);
      try {
        await api.delete('/auth/logout');
      } finally {
        this.clearSession();
      }
    },
  },
});
