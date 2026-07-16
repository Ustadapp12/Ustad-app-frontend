import { create } from 'zustand';
import { authApi, learningApi, usersApi } from '../api';
import { getTokens, setTokens, setStoredUser } from '../utils/storage';
import { AnalyticsEvents, logAnalyticsEvent, setAnalyticsUserId, setUserProperties } from '../services/analytics';
import { setCrashUser } from '../services/crashReporter';
import { warmAudioUrlCache } from '../services/audioUrls';
import { prefetchAll, invalidateAll } from '../services/bootCache';
import { abandonActiveLessonSession, abandonPendingLessonSessionFromStorage } from '../services/lessonSession';
import { useLessonStore } from './lessonStore';
import type { LearningMe, User, UserProfile } from '../types/api';

interface AuthState {
  user: User | null;
  learning: LearningMe | null;
  // Gender/age (and the rest of UserProfile) — populated at hydrate/login,
  // and patched locally by the onboarding Age/Gender screens right after a
  // successful save so Profile's avatar updates immediately without an
  // extra round-trip.
  profile: UserProfile | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  refreshLearning: (opts?: { force?: boolean }) => Promise<void>;
  completeEmailVerification: () => Promise<void>;
  updateProfileFields: (patch: Partial<UserProfile>) => void;
  _devLogin?: (email: string) => void;
}

const LEARNING_ME_INTERVAL_MS = 60_000;
let lastLearningMeFetchAt = 0;

export const useAuthStore = create<AuthState>((set, get) => {
  // Runs the parts of post-auth setup that hit endpoints gated behind email
  // verification (learning/content data + audio warm-cache + prefetch).
  // Only ever called once `user.email_verified` is known true — see login(),
  // register(), hydrate(), and completeEmailVerification() below.
  const finishAuthSetup = async (user: User, learning: LearningMe) => {
    void warmAudioUrlCache();
    await setAnalyticsUserId(user.id);
    lastLearningMeFetchAt = Date.now();
    set({ user, learning });
    void prefetchAll(learning.mvp_surah_numbers ?? []);
  };

  return {
  user: null,
  learning: null,
  profile: null,
  isHydrated: false,

  hydrate: async () => {
    const tokens = await getTokens();
    if (!tokens) {
      set({ isHydrated: true, user: null, learning: null });
      return;
    }
    // authApi.me() is gate-exempt (safe for an unverified user) and gives a
    // fresh verified status rather than trusting a possibly-stale local
    // cache. Fired in parallel with learningApi.me() — for an already
    // verified user this is no slower than before (both requests always ran
    // concurrently); for an unverified user learningApi.me() will 403, which
    // is caught and discarded rather than aborting hydrate() entirely.
    const [me, learning] = await Promise.all([
      authApi.me().catch(() => null),
      learningApi.me().catch(() => null),
    ]);
    if (!me) {
      await setTokens(null);
      await setStoredUser(null);
      set({ isHydrated: true, user: null, learning: null });
      return;
    }
    const user: User = { ...me.user, name: me.profile?.display_name ?? me.user.email.split('@')[0] };
    await setStoredUser(user);
    set({ isHydrated: true, user, learning: null, profile: me.profile ?? null });
    if (user.email_verified && learning) {
      await finishAuthSetup(user, learning);
    }
  },

  login: async (email, password) => {
    const res = await authApi.login({ email, password });
    await setTokens(res.tokens);
    await setStoredUser(res.user);
    setCrashUser(res.user.id, res.user.email);
    await setAnalyticsUserId(res.user.id);
    void logAnalyticsEvent(AnalyticsEvents.LOGIN, { method: 'email' });
    const user: User = { ...res.user, name: res.user.email.split('@')[0] };
    set({ user, learning: null });

    // /auth/me is gate-exempt — this enrichment can always run regardless
    // of verification status.
    void authApi.me().then(me => {
      if (me.profile) {
        void setUserProperties({
          learner_mode: me.profile.learner_mode ?? undefined,
          script_preference: me.profile.script_preference ?? undefined,
          daily_goal_minutes: me.profile.daily_goal_minutes ?? undefined,
          streak_goal_days: me.profile.streak_goal_days ?? undefined,
        });
        const enriched = { ...user, name: me.profile.display_name ?? user.name };
        void setStoredUser(enriched);
        set({ user: enriched, profile: me.profile });
      }
    }).catch(() => null);

    // Everything past this point hits gated endpoints — skip until verified,
    // so an unverified login never throws mid-store-update.
    if (!res.user.email_verified) return;
    const learning = await learningApi.me();
    await finishAuthSetup(user, learning);
  },

  register: async (email, password, displayName) => {
    const res = await authApi.register({ email, password, display_name: displayName });
    await setTokens(res.tokens);
    await setStoredUser(res.user);
    setCrashUser(res.user.id, res.user.email);
    await setAnalyticsUserId(res.user.id);
    void logAnalyticsEvent(AnalyticsEvents.SIGN_UP, { method: 'email' });
    const enrichedUser: User = { ...res.user, name: displayName ?? res.user.email.split('@')[0] };
    await setStoredUser(enrichedUser);
    set({ user: enrichedUser, learning: null });

    // A brand-new registration is always unverified — this returns here on
    // every normal signup, and the caller routes to the verify-email screen.
    if (!res.user.email_verified) return;
    const learning = await learningApi.me();
    await finishAuthSetup(enrichedUser, learning);
  },

  // Called by VerifyEmailScreen right after a successful authApi.verifyEmail()
  // — flips the local flag and runs the same gated setup that login/register
  // would have run already had the user been verified from the start.
  completeEmailVerification: async () => {
    const current = get().user;
    if (!current) return;
    const user: User = { ...current, email_verified: true };
    await setStoredUser(user);
    set({ user });
    const learning = await learningApi.me();
    await finishAuthSetup(user, learning);
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
    set({ user: null, learning: null, profile: null });
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
    set({ user: null, learning: null, profile: null });
  },

  updateProfileFields: (patch: Partial<UserProfile>) => {
    set(state => ({
      profile: {
        display_name: null, avatar_url: null, learner_mode: null, script_preference: null,
        daily_goal_minutes: null, streak_goal_days: null, motivation: null, gender: null, age: null,
        ...state.profile,
        ...patch,
      },
    }));
  },

  _devLogin: (email: string) => {
    const mockUser: User = { id: 'dev-user', email, name: email.split('@')[0], role: 'learner', email_verified: true } as any;
    const mockLearning: LearningMe = {
      user_id: 'dev-user', xp_total: 120, current_streak: 3,
      script_preference: 'uthmani', mvp_surah_numbers: [1, 112, 113, 114],
    } as any;
    set({ user: mockUser, learning: mockLearning, isHydrated: true });
  },

  refreshLearning: async ({ force = false } = {}) => {
    if (!get().user?.email_verified) return; // gated endpoint — skip while unverified
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
  };
});

