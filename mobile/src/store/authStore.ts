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
      set({ isHydrated: true, user, learning });
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
    set({ user: res.user, learning });
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
    set({ user: res.user, learning });
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
    set({ user: null, learning: null });
  },

  refreshLearning: async () => {
    const tokens = await getTokens();
    if (!tokens) {
      return;
    }
    try {
      const learning = await learningApi.me();
      set({ learning });
    } catch {
      /* ignore when offline */
    }
  },
}));
