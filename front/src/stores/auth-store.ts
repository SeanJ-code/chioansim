import { defineStore } from 'pinia';
import { api } from '@/boot/axios';
import { clearRecentCaregivers } from '@/composables/recent-caregivers';

export type UserRole = 'USER' | 'PATIENT' | 'NURSE' | 'ADMIN';

type AuthUser = {
  id: string;
  account: string;
  name: string;
  role: UserRole;
};

type AuthResponse = {
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

let restorePromise: Promise<boolean> | undefined;

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    initialized: false,
  }),
  actions: {
    clearSession() {
      this.user = null;
      this.initialized = true;
    },
    saveSession(result: AuthResponse) {
      this.user = result.user;
      this.initialized = true;
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
        try {
          const { data } = await api.get<AuthResponse>('/auth/me');
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
