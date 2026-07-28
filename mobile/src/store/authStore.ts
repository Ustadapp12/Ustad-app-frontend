import { create } from 'zustand';
import { authApi, learningApi, usersApi, syncDeviceTimezone } from '../api';
import { getTokens, setTokens, setStoredUser, resetTourOffered } from '../utils/storage';
import { AnalyticsEvents, logAnalyticsEvent, setAnalyticsUserId, setUserProperties } from '../services/analytics';
import { setCrashUser, addBreadcrumb } from '../services/crashReporter';
import { warmAudioUrlCache } from '../services/audioUrls';
import { prefetchAll, invalidateAll } from '../services/bootCache';
import { abandonActiveLessonSession, abandonPendingLessonSessionFromStorage } from '../services/lessonSession';
import { useLessonStore } from './lessonStore';
import {
  clearPendingGuestProgress, displayNameFor, getPendingGuestProgress, resetGuestState,
} from '../utils/guest';
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
  startGuestSession: () => Promise<void>;
  upgradeGuest: (email: string, password: string, displayName: string) => Promise<void>;
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
    //
    // learningApi.me() gets a bounded retry here: a single transient failure
    // (network blip, cold-start race) used to leave `learning` null for the
    // rest of the session, which the HUD renders indistinguishably from a
    // real XP/streak reset.
    const fetchLearningWithRetry = async (): Promise<LearningMe | null> => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await learningApi.me();
        } catch (e) {
          if (attempt === 2) {
            addBreadcrumb('hydrate: learningApi.me() failed after retries', {
              attempts: attempt + 1,
              error: e instanceof Error ? e.message : String(e),
            });
            return null;
          }
          await new Promise(res => setTimeout(res, 500 * (attempt + 1)));
        }
      }
      return null;
    };

    const [me, learning] = await Promise.all([
      authApi.me().catch(() => null),
      fetchLearningWithRetry(),
    ]);
    if (!me) {
      await setTokens(null);
      await setStoredUser(null);
      set({ isHydrated: true, user: null, learning: null });
      return;
    }
    const user: User = { ...me.user, name: displayNameFor(me.user, me.profile?.display_name) };
    await setStoredUser(user);
    set({ isHydrated: true, user, learning: null, profile: me.profile ?? null });
    void syncDeviceTimezone();
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
    const user: User = { ...res.user, name: displayNameFor(res.user) };
    set({ user, learning: null });
    void syncDeviceTimezone();

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
    await resetTourOffered();
    void logAnalyticsEvent(AnalyticsEvents.SIGN_UP, { method: 'email' });
    const enrichedUser: User = { ...res.user, name: displayNameFor(res.user, displayName) };
    await setStoredUser(enrichedUser);
    set({ user: enrichedUser, learning: null });
    void syncDeviceTimezone();

    // A brand-new registration is always unverified — this returns here on
    // every normal signup, and the caller routes to the verify-email screen.
    if (!res.user.email_verified) return;
    const learning = await learningApi.me();
    await finishAuthSetup(enrichedUser, learning);
  },

  // First launch: mint a real (unclaimed) account so the map, levels and the
  // lesson engine all work before the user has committed an email. Unlike
  // register(), there's nothing to verify, so the gated setup runs immediately.
  startGuestSession: async () => {
    const res = await authApi.guest();
    await setTokens(res.tokens);
    await setStoredUser(res.user);
    setCrashUser(res.user.id, null);
    await resetGuestState();
    await resetTourOffered();
    const user: User = { ...res.user, name: displayNameFor(res.user) };
    await setStoredUser(user);
    set({ user, learning: null });
    void syncDeviceTimezone();
    const learning = await learningApi.me();
    await finishAuthSetup(user, learning);
  },

  // Claims the current guest account. Same user row on the server, so level
  // progress carries over; the XP/streak the guest was shown but never had
  // banked rides along in the request body.
  upgradeGuest: async (email, password, displayName) => {
    const pending = await getPendingGuestProgress();
    const res = await authApi.upgradeGuest({
      email,
      password,
      display_name: displayName,
      pending_xp: pending.xp,
      pending_streak: pending.streak,
    });
    await setTokens(res.tokens);
    setCrashUser(res.user.id, res.user.email);
    void logAnalyticsEvent(AnalyticsEvents.SIGN_UP, { method: 'guest_upgrade' });
    await clearPendingGuestProgress();
    const user: User = { ...res.user, name: displayName };
    await setStoredUser(user);
    // `learning` is deliberately left as-is: the carried-over XP/streak land
    // server-side during this call, and refreshLearning() below re-reads them
    // once the email is verified.
    set({ user });
    void syncDeviceTimezone();
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
        timezone: null,
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
    } catch (e) {
      addBreadcrumb('refreshLearning: learningApi.me() failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },
  };
});

