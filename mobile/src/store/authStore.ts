import { create } from 'zustand';
import * as Sentry from '@sentry/react-native';
import { authApi, learningApi } from '../api';
import { getTokens, setTokens, getStoredUser, setStoredUser } from '../utils/storage';
import {
  AnalyticsEvents,
  logAnalyticsEvent,
  setAnalyticsUserId,
} from '../services/analytics';
import { warmAudioUrlCache } from '../services/audioUrls';
import { prefetchAll, invalidateAll } from '../services/bootCache';
import {
  abandonActiveLessonSession,
  abandonPendingLessonSessionFromStorage,
} from '../services/lessonSession';
import { useLessonStore } from './lessonStore';
import type { LearningMe, User } from '../types/api';

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
  refreshLearning: (opts?: { force?: boolean }) => Promise<void>;
}

const LEARNING_ME_INTERVAL_MS = 60_000;
let lastLearningMeFetchAt = 0;

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
      const [learning, storedUser] = await Promise.all([
        learningApi.me(),
        getStoredUser(),
      ]);
      const user: User =
        storedUser ??
        ({
          id: learning.user_id,
          email: 'learner',
          role: 'learner',
        } as User);
      await warmAudioUrlCache();
      await setAnalyticsUserId(user.id);
      lastLearningMeFetchAt = Date.now();
      set({ isHydrated: true, user, learning });
      void prefetchAll(learning.mvp_surah_numbers ?? []);
    } catch {
      await setTokens(null);
      await setStoredUser(null);
      set({ isHydrated: true, user: null, learning: null });
    }
  },

  login: async (email, password) => {
    const res = await authApi.login({ email, password });
    await setTokens(res.tokens);
    await setStoredUser(res.user);
    const learning = await learningApi.me();
    await warmAudioUrlCache();
    // Tag all future crash reports with this user
    Sentry.setUser({ id: res.user.id, email: res.user.email });
    await setAnalyticsUserId(res.user.id);
    void logAnalyticsEvent(AnalyticsEvents.LOGIN, { method: 'email' });
    lastLearningMeFetchAt = Date.now();
    set({ user: res.user, learning });
    void prefetchAll(learning.mvp_surah_numbers ?? []);
  },

  register: async (email, password, displayName) => {
    const res = await authApi.register({
      email,
      password,
      display_name: displayName,
    });
    await setTokens(res.tokens);
    await setStoredUser(res.user);
    const learning = await learningApi.me();
    await warmAudioUrlCache();
    Sentry.setUser({ id: res.user.id, email: res.user.email });
    await setAnalyticsUserId(res.user.id);
    void logAnalyticsEvent(AnalyticsEvents.SIGN_UP, { method: 'email' });
    lastLearningMeFetchAt = Date.now();
    set({ user: res.user, learning });
    void prefetchAll(learning.mvp_surah_numbers ?? []);
  },

  logout: async () => {
    await useLessonStore.getState().abandonSession({ silent: true }).catch(() => null);
    useLessonStore.getState().reset();
    await abandonActiveLessonSession().catch(() => null);
    await abandonPendingLessonSessionFromStorage();
    await setTokens(null);
    await setStoredUser(null);
    Sentry.setUser(null); // Clear user from crash reports on logout
    await setAnalyticsUserId(null);
    invalidateAll();
    lastLearningMeFetchAt = 0;
    set({ user: null, learning: null });
  },

  refreshLearning: async ({ force = false } = {}) => {
    const tokens = await getTokens();
    if (!tokens) {
      return;
    }
    const now = Date.now();
    if (!force && now - lastLearningMeFetchAt < LEARNING_ME_INTERVAL_MS) {
      return;
    }
    try {
      const learning = await learningApi.me();
      lastLearningMeFetchAt = now;
      set({ learning });
    } catch {
      /* ignore when offline */
    }
  },
}));
