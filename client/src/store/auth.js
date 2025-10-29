import { defineStore } from 'pinia';
import {
  login as loginApi,
  logout as logoutApi,
  fetchCurrentUser,
  register as registerApi,
} from '@/api/auth';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    status: 'idle',
    initialized: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
  },
  actions: {
    async loadUser(force = false) {
      if (this.initialized && !force) {
        return this.user;
      }
      try {
        this.status = 'loading';
        const response = await fetchCurrentUser();
        this.user = response?.data ?? response ?? null;
      } catch (error) {
        this.user = null;
        throw error;
      } finally {
        this.status = 'idle';
        this.initialized = true;
      }
      return this.user;
    },
    async login(credentials) {
      try {
        this.status = 'loading';
        const response = await loginApi(credentials);
        this.user = response?.data ?? response ?? null;
        this.initialized = true;
        return this.user;
      } catch (error) {
        this.user = null;
        throw error;
      } finally {
        this.status = 'idle';
      }
    },
    async register(payload) {
      try {
        this.status = 'loading';
        const response = await registerApi(payload);
        return response?.data ?? response ?? null;
      } finally {
        this.status = 'idle';
      }
    },
    async logout() {
      try {
        await logoutApi();
      } finally {
        this.user = null;
        this.initialized = true;
      }
    },
  },
});
