import { defineStore } from 'pinia';
import { api } from '@/boot/axios';

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

function readStoredUser() {
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

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: sessionStorage.getItem('chioansim-access-token') || '',
    user: readStoredUser() as AuthUser | null,
  }),
  actions: {
    clearSession() {
      this.accessToken = '';
      this.user = null;
      sessionStorage.removeItem('chioansim-access-token');
      localStorage.removeItem('chioansim-user');
      delete api.defaults.headers.common.Authorization;
    },
    saveSession(result: AuthResponse) {
      this.accessToken = result.accessToken;
      this.user = result.user;
      sessionStorage.setItem('chioansim-access-token', result.accessToken);
      localStorage.setItem('chioansim-user', JSON.stringify(result.user));
      api.defaults.headers.common.Authorization = `Bearer ${result.accessToken}`;
    },
    async login(account: string, password: string) {
      const { data } = await api.post<AuthResponse>('/auth/login', { account, password });
      this.saveSession(data);
    },
    async register(payload: RegisterPayload | FormData) {
      const { data } = await api.post<AuthResponse>('/auth/register', payload);
      this.saveSession(data);
    },
    async registerNurse(payload: FormData) {
      const { data } = await api.post<AuthResponse & { message: string }>('/auth/register-nurse', payload);
      this.saveSession(data);
      return data;
    },
    async restoreSession() {
      if (this.user && isAccessTokenUsable(this.accessToken)) {
        api.defaults.headers.common.Authorization = `Bearer ${this.accessToken}`;
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
    },
    async logout() {
      try {
        await api.delete('/auth/logout');
      } finally {
        this.clearSession();
      }
    },
  },
});
