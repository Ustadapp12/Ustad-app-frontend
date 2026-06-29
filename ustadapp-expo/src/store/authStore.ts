import { create } from 'zustand';
import { authApi, learningApi, usersApi } from '../api';
import { getTokens, setTokens, getStoredUser, setStoredUser } from '../utils/storage';
import { AnalyticsEvents, logAnalyticsEvent, setAnalyticsUserId, setUserProperties } from '../services/analytics';
import { setCrashUser } from '../services/crashReporter';
import { warmAudioUrlCache } from '../services/audioUrls';
import { prefetchAll, invalidateAll } from '../services/bootCache';
import { abandonActiveLessonSession, abandonPendingLessonSessionFromStorage } from '../services/lessonSession';
import { useLessonStore } from './lessonStore';
import type { LearningMe, User } from '../types/api';

interface AuthState {
  user: User | null;
  learning: LearningMe | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  refreshLearning: (opts?: { force?: boolean }) => Promise<void>;
  _devLogin?: (email: string) => void;
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
      const user: User = storedUser ?? ({ id: learning.user_id, email: 'learner', role: 'learner' } as User);
      void warmAudioUrlCache();
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
    void warmAudioUrlCache();
    setCrashUser(res.user.id, res.user.email);
    await setAnalyticsUserId(res.user.id);
    void logAnalyticsEvent(AnalyticsEvents.LOGIN, { method: 'email' });
    void authApi.me().then(me => {
      if (me.profile) {
        void setUserProperties({
          learner_mode: me.profile.learner_mode ?? undefined,
          script_preference: me.profile.script_preference ?? undefined,
          daily_goal_minutes: me.profile.daily_goal_minutes ?? undefined,
          streak_goal_days: me.profile.streak_goal_days ?? undefined,
        });
        // Enrich user with display name from profile
        const enriched = { ...res.user, name: me.profile.display_name ?? res.user.email.split('@')[0] };
        void setStoredUser(enriched);
        set({ user: enriched });
      }
    }).catch(() => null);
    lastLearningMeFetchAt = Date.now();
    set({ user: { ...res.user, name: res.user.email.split('@')[0] }, learning });
    void prefetchAll(learning.mvp_surah_numbers ?? []);
  },

  register: async (email, password, displayName) => {
    const res = await authApi.register({ email, password, display_name: displayName });
    await setTokens(res.tokens);
    await setStoredUser(res.user);
    const learning = await learningApi.me();
    void warmAudioUrlCache();
    setCrashUser(res.user.id, res.user.email);
    await setAnalyticsUserId(res.user.id);
    void logAnalyticsEvent(AnalyticsEvents.SIGN_UP, { method: 'email' });
    lastLearningMeFetchAt = Date.now();
    const enrichedUser = { ...res.user, name: displayName ?? res.user.email.split('@')[0] };
    await setStoredUser(enrichedUser);
    set({ user: enrichedUser, learning });
    void prefetchAll(learning.mvp_surah_numbers ?? []);
  },

  logout: async () => {
    await useLessonStore.getState().abandonSession({ silent: true }).catch(() => null);
    useLessonStore.getState().reset();
    await abandonActiveLessonSession().catch(() => null);
    await abandonPendingLessonSessionFromStorage();
    await setTokens(null);
    await setStoredUser(null);
    await setAnalyticsUserId(null);
    invalidateAll();
    lastLearningMeFetchAt = 0;
    set({ user: null, learning: null });
  },

  deleteAccount: async (password: string) => {
    await useLessonStore.getState().abandonSession({ silent: true }).catch(() => null);
    useLessonStore.getState().reset();
    await usersApi.deleteAccount(password);
    await setTokens(null);
    await setStoredUser(null);
    await setAnalyticsUserId(null);
    invalidateAll();
    lastLearningMeFetchAt = 0;
    set({ user: null, learning: null });
  },

  _devLogin: (email: string) => {
    const mockUser: User = { id: 'dev-user', email, name: email.split('@')[0], role: 'learner' } as any;
    const mockLearning: LearningMe = {
      user_id: 'dev-user', xp_total: 120, current_streak: 3,
      script_preference: 'uthmani', mvp_surah_numbers: [1, 112, 113, 114],
    } as any;
    set({ user: mockUser, learning: mockLearning, isHydrated: true });
  },

  refreshLearning: async ({ force = false } = {}) => {
    const tokens = await getTokens();
    if (!tokens) return;
    const now = Date.now();
    if (!force && now - lastLearningMeFetchAt < LEARNING_ME_INTERVAL_MS) return;
    try {
      const learning = await learningApi.me();
      lastLearningMeFetchAt = now;
      set({ learning });
    } catch { /* ignore when offline */ }
  },
}));

