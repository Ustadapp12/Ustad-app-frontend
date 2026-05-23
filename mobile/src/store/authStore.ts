import { create } from 'zustand';
import { authApi } from '../api';
import { setTokens, getTokens } from '../utils/storage';
import type { LearningMe, User } from '../types/api';
import { learningApi } from '../api';

interface AuthState {
  user: User | null;
  learning: LearningMe | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshLearning: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  learning: null,
  isHydrated: false,

  hydrate: async () => {
    const tokens = await getTokens();
    if (!tokens) {
      set({ isHydrated: true, user: null, learning: null });
      return;
    }
    try {
      const learning = await learningApi.me();
      set({
        isHydrated: true,
        user: {
          id: learning.user_id,
          email: 'learner',
          role: 'learner',
        },
        learning,
      });
    } catch {
      await setTokens(null);
      set({ isHydrated: true, user: null, learning: null });
    }
  },

  login: async (email, password) => {
    const res = await authApi.login({ email, password });
    await setTokens(res.tokens);
    const learning = await learningApi.me();
    set({ user: res.user, learning });
  },

  register: async (email, password, displayName) => {
    const res = await authApi.register({
      email,
      password,
      display_name: displayName,
    });
    await setTokens(res.tokens);
    const learning = await learningApi.me();
    set({ user: res.user, learning });
  },

  logout: async () => {
    await setTokens(null);
    set({ user: null, learning: null });
  },

  refreshLearning: async () => {
    if (!get().user) return;
    const learning = await learningApi.me();
    set({ learning });
  },
}));
