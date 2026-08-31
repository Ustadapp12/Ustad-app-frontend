import { create } from 'zustand';
import { authApi, learningApi, usersApi, syncDeviceTimezone } from '../api';
import { getTokens, setTokens, setStoredUser, getStoredUser, resetTourOffered } from '../utils/storage';
import { AnalyticsEvents, logAnalyticsEvent, setAnalyticsUserId, setUserProperties } from '../services/analytics';
import { setCrashUser, addBreadcrumb, captureError } from '../services/crashReporter';
import { setPendingEntryMethod } from '../services/usageSession';
import { warmAudioUrlCache } from '../services/audioUrls';
import { prefetchAll, invalidateAll } from '../services/bootCache';
import { abandonActiveLessonSession, abandonPendingLessonSessionFromStorage } from '../services/lessonSession';
import { useLessonStore } from './lessonStore';
import {
  clearPendingGuestProgress, displayNameFor, getPendingGuestProgress, resetGuestState,
} from '../utils/guest';
import { checkStreakLoss } from '../utils/streak';
import { signInWithGoogle, signOutFromGoogle } from '../services/googleAuth';
import type { AccountAction, LearningMe, User, UserProfile } from '../types/api';

interface AuthState {
  user: User | null;
  learning: LearningMe | null;
  // Gender/age (and the rest of UserProfile) — populated at hydrate/login,
  // and patched locally by the onboarding Age/Gender screens right after a
  // successful save so Profile's avatar updates immediately without an
  // extra round-trip.
  profile: UserProfile | null;
  isHydrated: boolean;
  // One-shot: set the instant refreshLearning() observes a frozen/active
  // streak silently expire to "none" (see utils/streak.ts's checkStreakLoss).
  // A listener mounted once in RootNavigator shows StreakLostModal off this,
  // then clears it back to null so it never fires twice for the same loss.
  streakJustLost: number | null;
  clearStreakJustLost: () => void;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  startGuestSession: () => Promise<void>;
  upgradeGuest: (email: string, password: string, displayName?: string) => Promise<void>;
  /** Resolves to what the server did, so the caller can explain a `restored`
   *  outcome to the user. Returns null if they cancelled the Google sheet. */
  loginWithGoogle: () => Promise<AccountAction | null>;
  logout: () => Promise<void>;
  /** Password is optional: Google-only accounts have none to confirm with, and
   *  the server accepts the authenticated session as proof in that case. */
  deleteAccount: (password?: string) => Promise<void>;
  refreshLearning: (opts?: { force?: boolean }) => Promise<void>;
  completeEmailVerification: () => Promise<void>;
  updateProfileFields: (patch: Partial<UserProfile>) => void;
  updateDisplayName: (name: string) => void;
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
    set({ user });
    await applyFreshLearning(learning);
    void prefetchAll(learning.mvp_surah_numbers ?? []);
  };

  // Every fresh learningApi.me() result (here and in refreshLearning below)
  // runs through this so a silent frozen/active -> "none" transition (the
  // freeze window expiring — the backend has no event for it, see
  // app/learning/service.py) gets caught and surfaced exactly once, on
  // whichever read is the first to observe it.
  const applyFreshLearning = async (learning: LearningMe) => {
    const lost = await checkStreakLoss(learning.streak_state ?? 'active', learning.current_streak);
    set({ learning, ...(lost !== null ? { streakJustLost: lost } : {}) });
  };

  // The real body of hydrate(). Split out so hydrate() itself is nothing but
  // the try/catch that guarantees isHydrated always ends up true — see the
  // comment on hydrate() below for why that matters.
  const hydrateInner = async (): Promise<void> => {
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

    const [me, learning, previouslyStored] = await Promise.all([
      authApi.me().catch(() => null),
      fetchLearningWithRetry(),
      getStoredUser(),
    ]);
    if (!me) {
      await setTokens(null);
      await setStoredUser(null);
      set({ isHydrated: true, user: null, learning: null });
      return;
    }
    // Prefer profile.display_name, but fall back to whatever name this same
    // account was last shown under locally before reaching for the
    // email-username derivation — register()/upgradeGuest() already set the
    // real typed name correctly the moment the account was created, so this
    // is only ever a real name or nothing, never a stale/wrong one. Without
    // this, a backend response that omits display_name (or hasn't caught up
    // yet) would silently regress "Ahmad Al-Rashid" to "ahmad.alrashid" on
    // every subsequent app launch.
    const user: User = {
      ...me.user,
      name: displayNameFor(me.user, me.profile?.display_name ?? previouslyStored?.name),
    };
    await setStoredUser(user);
    // Crashlytics' user id was set in login/register/guest/upgrade but never
    // here — and hydrate() is the path every returning user takes on every
    // cold start, so the overwhelming majority of real crash reports arrived
    // with no user attached and no way to tell how many people one issue hit.
    setCrashUser(user.id, user.email);
    set({ isHydrated: true, user, learning: null, profile: me.profile ?? null });
    void syncDeviceTimezone();
    if (user.email_verified && learning) {
      await finishAuthSetup(user, learning);
    }
  };

  return {
  user: null,
  learning: null,
  profile: null,
  isHydrated: false,
  streakJustLost: null,

  clearStreakJustLost: () => set({ streakJustLost: null }),

  hydrate: async () => {
    // Nothing in here may be allowed to reject. RootNavigator calls this as a
    // bare `void hydrate()`, and `isHydrated` is the only thing that moves the
    // app off Splash — so a throw anywhere in hydrateInner (a storage read, an
    // AsyncStorage write inside checkStreakLoss, a store subscriber) used to
    // strand the user on the Splash screen forever, with no error, no retry
    // and no crash report. The catch guarantees the flag always gets set.
    try {
      await hydrateInner();
    } catch (e) {
      captureError(e, { where: 'authStore.hydrate' });
      set({ isHydrated: true });
    }
  },

  login: async (email, password) => {
    const res = await authApi.login({ email, password });
    await setTokens(res.tokens);
    await setStoredUser(res.user);
    setPendingEntryMethod('login');
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
    setPendingEntryMethod('register');
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
    setPendingEntryMethod('guest');
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
  // progress carries over; the XP the guest was shown but never had banked
  // rides along in the request body. pending_streak is deliberately always 0
  // — a guest's streak is never real (see utils/guest.ts), so signing up
  // always starts a genuine streak at day one, never backfilled from
  // whatever the guest session happened to show.
  upgradeGuest: async (email, password, displayName) => {
    const pending = await getPendingGuestProgress();
    const res = await authApi.upgradeGuest({
      email,
      password,
      display_name: displayName,
      pending_xp: pending.xp,
      pending_streak: 0,
    });
    await setTokens(res.tokens);
    setPendingEntryMethod('guest_upgrade');
    setCrashUser(res.user.id, res.user.email);
    // Deliberately does NOT call resetTourOffered(): this claims the SAME
    // guest row (see the comment above upgradeGuest), so if the guest was
    // already shown/dismissed the tour offer, that decision carries over to
    // the "real" account. Resetting it here used to make the tour offer fire
    // again right after account creation, which is wrong — the tour history
    // isn't throwaway, it belongs to the same session/account that just
    // gained an email. register() and startGuestSession() still reset it,
    // since those start a genuinely fresh identity with no tour history yet.
    void logAnalyticsEvent(AnalyticsEvents.SIGN_UP, { method: 'guest_upgrade' });
    await clearPendingGuestProgress();
    const user: User = { ...res.user, name: displayNameFor(res.user, displayName) };
    await setStoredUser(user);
    // `learning` is deliberately left as-is: the carried-over XP/streak land
    // server-side during this call, and refreshLearning() below re-reads them
    // once the email is verified.
    set({ user });
    void syncDeviceTimezone();
  },

  // One entry point for "Continue with Google" on both Login and Sign Up,
  // because the client genuinely cannot tell which one is happening: the app
  // mints a guest row on first launch, so signing up and claiming that row look
  // identical from here, and a returning user who reinstalled looks like both.
  // The server decides and reports back via `account_action`.
  //
  // The guest bearer token is sent automatically (authApi.google passes
  // auth: true), and that is what lets the server fill the email into the very
  // same row instead of stranding its level progress.
  loginWithGoogle: async () => {
    const idToken = await signInWithGoogle();
    if (idToken === null) return null;  // user backed out of the Google sheet

    const pending = await getPendingGuestProgress();
    const res = await authApi.google({
      id_token: idToken,
      pending_xp: pending.xp,
      // Always 0 — see the matching comment on upgradeGuest above.
      pending_streak: 0,
    });

    await setTokens(res.tokens);
    setCrashUser(res.user.id, res.user.email);
    // Cleared on every outcome, not just a successful claim: on `restored` the
    // parked totals belong to a guest row that no longer exists, so keeping
    // them would credit them to the wrong account on some later upgrade.
    await clearPendingGuestProgress();

    const action = res.account_action ?? 'created';
    // Same rule as every other entry point: login() never resets the tour.
    // `restored` is a returning user signing back into a real account with
    // real history — resetting the tour here made it reappear, which is
    // wrong. `claimed` converts the SAME guest row this session may have
    // already been shown/dismissed the tour offer on — same reasoning as
    // upgradeGuest() above, so it must not reset either, or the offer fires
    // again right after signup. Only `created` (genuinely no prior guest row)
    // is this account's actual first run.
    if (action === 'created') await resetTourOffered();
    setPendingEntryMethod(action === 'restored' ? 'google_login' : 'google_signup');
    void logAnalyticsEvent(
      action === 'restored' ? AnalyticsEvents.LOGIN : AnalyticsEvents.SIGN_UP,
      { method: 'google' },
    );

    const user: User = { ...res.user, name: displayNameFor(res.user) };
    await setStoredUser(user);
    set({ user, learning: null });
    void syncDeviceTimezone();

    // Unlike register(), there is no verify-email detour: the server sets
    // email_verified because Google already asserted the address. The guard
    // stays anyway so a future backend change can't silently 403 the setup.
    if (res.user.email_verified) {
      const learning = await learningApi.me();
      await finishAuthSetup(user, learning);
    }
    return action;
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
    // Otherwise Google silently re-uses the last account on the next sign in,
    // and someone handing the phone over can't switch to their own.
    await signOutFromGoogle();
    invalidateAll();
    lastLearningMeFetchAt = 0;
    set({ user: null, learning: null, profile: null, streakJustLost: null });
  },

  deleteAccount: async (password?: string) => {
    await useLessonStore.getState().abandonSession({ silent: true }).catch(() => null);
    useLessonStore.getState().reset();
    await usersApi.deleteAccount(password);
    await signOutFromGoogle();
    await setTokens(null);
    await setStoredUser(null);
    await setAnalyticsUserId(null);
    invalidateAll();
    lastLearningMeFetchAt = 0;
    set({ user: null, learning: null, profile: null, streakJustLost: null });
  },

  updateProfileFields: (patch: Partial<UserProfile>) => {
    set(state => ({
      profile: {
        display_name: null, avatar_url: null, learner_mode: null, script_preference: null,
        daily_goal_minutes: null, streak_goal_days: null, motivation: null, gender: null, age: null,
        timezone: null, onboarding_completed: false,
        ...state.profile,
        ...patch,
      },
    }));
  },

  // EditProfileScreen — unlike updateProfileFields (profile.display_name
  // only), this also patches user.name since that's what ProfileScreen and
  // everywhere else in the app actually reads for the display name.
  updateDisplayName: (name: string) => {
    set(state => {
      const user = state.user ? { ...state.user, name } : state.user;
      if (user) void setStoredUser(user);
      const profileDefaults: UserProfile = {
        display_name: null, avatar_url: null, learner_mode: null, script_preference: null,
        daily_goal_minutes: null, streak_goal_days: null, motivation: null, gender: null, age: null,
        timezone: null, onboarding_completed: false,
      };
      return {
        user,
        profile: { ...profileDefaults, ...state.profile, display_name: name },
      };
    });
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
      await applyFreshLearning(learning);
    } catch (e) {
      addBreadcrumb('refreshLearning: learningApi.me() failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },
  };
});

