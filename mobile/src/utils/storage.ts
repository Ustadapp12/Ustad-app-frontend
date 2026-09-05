import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSecureTokens, setSecureTokens } from '../services/secureTokens';
import { useScriptStore } from '../store/scriptStore';
import type { OnboardingAnswers, ScriptPreference, Tokens, User } from '../types/api';

const KEYS = {
  tokensLegacy: '@ustadapp/tokens',
  user: '@ustadapp/user',
  onboarding: '@ustadapp/onboarding/v1',
  onboardingDone: '@ustadapp/onboarding/done',
  reciterId: '@ustadapp/reciter',
  script: '@ustadapp/script',
  seasonsUnlocked: '@ustadapp/map/seasonsUnlocked',
  lastEmailHint: '@ustadapp/auth/lastEmailHint',
  tourSeen: '@ustadapp/tour/seen',
  lastActiveLocalDate: '@ustadapp/notifications/lastActiveLocalDate',
  localNotifPermissionAsked: '@ustadapp/notifications/permissionAsked',
} as const;

/**
 * JSON.parse that yields null instead of throwing on a corrupt value.
 *
 * Every reader below is on a path the app cannot recover from by crashing:
 * getStoredUser/getOnboarding run inside hydrate() and the Splash routing
 * decision, so an unparseable value used to surface as a permanently stuck
 * Splash screen with no error and no crash report. A wiped preference is a
 * far better failure than a bricked launch, and AsyncStorage values do get
 * truncated in practice (process killed mid-write, disk full, OS migration).
 */
function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// In-memory cache + in-flight dedup: getTokens() is called once per parallel
// API request (e.g. the Map screen fires one per surah via Promise.allSettled).
// Without this, each call hits the OS Keystore independently, which isn't
// reliably safe under concurrent access and can silently return null for
// some of them, dropping those requests as unauthenticated.
let tokensCache: Tokens | null | undefined;
let tokensInFlight: Promise<Tokens | null> | null = null;

export async function getTokens(): Promise<Tokens | null> {
  if (tokensCache !== undefined) return tokensCache;
  if (!tokensInFlight) {
    tokensInFlight = (async () => {
      try {
        let tokens = await getSecureTokens();
        if (!tokens) {
          const legacy = await AsyncStorage.getItem(KEYS.tokensLegacy);
          if (legacy) {
            // A half-written or truncated legacy value must not take the whole
            // app down with it: this runs on the hydrate() critical path, and a
            // throw here leaves isHydrated false forever (permanent Splash).
            // Treat unparseable as "no legacy tokens" and drop it.
            tokens = safeJsonParse<Tokens>(legacy);
            if (tokens) {
              await setSecureTokens(tokens);
            }
            await AsyncStorage.removeItem(KEYS.tokensLegacy);
          }
        }
        tokensCache = tokens;
        return tokens;
      } catch {
        // Keystore/AsyncStorage unavailable. Report "signed out" rather than
        // rejecting — a rejection would be cached in tokensInFlight below and
        // re-thrown to every later caller for the rest of the process.
        return null;
      } finally {
        // MUST be in `finally`: leaving this to the success path meant any
        // throw above stranded a rejected promise in tokensInFlight, and every
        // subsequent getTokens() re-returned it — so one bad read permanently
        // un-authenticated every request until the app was force-closed.
        tokensInFlight = null;
      }
    })();
  }
  return tokensInFlight;
}

export async function setTokens(tokens: Tokens | null): Promise<void> {
  tokensCache = tokens;
  await setSecureTokens(tokens);
  if (!tokens) await AsyncStorage.removeItem(KEYS.tokensLegacy);
}

export async function getStoredUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(KEYS.user);
  return safeJsonParse<User>(raw);
}

export async function setStoredUser(user: User | null): Promise<void> {
  if (user) await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
  else await AsyncStorage.removeItem(KEYS.user);
}

export async function getOnboarding(): Promise<OnboardingAnswers> {
  const raw = await AsyncStorage.getItem(KEYS.onboarding);
  return safeJsonParse<OnboardingAnswers>(raw) ?? {};
}

export async function saveOnboarding(patch: Partial<OnboardingAnswers>): Promise<OnboardingAnswers> {
  const current = await getOnboarding();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(KEYS.onboarding, JSON.stringify(next));
  return next;
}

export async function isOnboardingDone(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.onboardingDone)) === 'true';
}

export async function setOnboardingDone(done: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.onboardingDone, done ? 'true' : 'false');
}

// Season 0 is never stored — it's always implicitly unlocked. Only explicit
// user-confirmed unlocks (Season 2, Season 3) live here.
export async function getUnlockedSeasons(): Promise<number[]> {
  const raw = await AsyncStorage.getItem(KEYS.seasonsUnlocked);
  const parsed = safeJsonParse<number[]>(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export async function unlockSeason(seasonIdx: number): Promise<number[]> {
  const current = await getUnlockedSeasons();
  if (current.includes(seasonIdx)) return current;
  const next = [...current, seasonIdx];
  await AsyncStorage.setItem(KEYS.seasonsUnlocked, JSON.stringify(next));
  return next;
}

// Whether the guided tour has been offered. Set on *either* answer — being
// asked a second time reads as the app having forgotten you said no.
export async function wasTourOffered(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.tourSeen)) === 'true';
}

export async function setTourOffered(): Promise<void> {
  await AsyncStorage.setItem(KEYS.tourSeen, 'true');
}

// The tour is an app-wide first-run thing, not a guest-only one — every new
// account should be offered it once. The flag above lives in device storage
// though, so without this a second account created on the same device (e.g.
// logout, then sign up fresh) would inherit the first account's "already
// seen" state. Called wherever a brand-new account is minted.
export async function resetTourOffered(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.tourSeen);
}

export async function getReciterId(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.reciterId)) ?? 'husary';
}

/**
 * Get the next onboarding screen to show when resuming incomplete onboarding.
 *
 * Onboarding is split into two atomic checkpoints — leaving mid-checkpoint
 * always resumes at that checkpoint's first screen, never mid-way:
 *   A. "About you"   — Age, Gender, Goal, Script
 *   B. "Placement"   — Path ("do you already know some?") + the hifz
 *                       assessment exercises
 * Reaching `currentStep: 'path'` means checkpoint A is fully done (the
 * screens only ever advance in one direction), so from that point on —
 * whether the user only just answered Path, or is mid-exercise — resume
 * goes back to OnboardPath. Exercise progress is in-memory only and is
 * never meant to survive a restart.
 * A user who picks "beginner" is marked done immediately (OnboardPathScreen)
 * and never reaches this function again.
 *
 * `serverOnboardingCompleted` is the account-level signal from
 * profile.onboarding_completed (see types/api.ts UserProfile), fetched fresh
 * on every hydrate(). It is authoritative once known: the local `done` flag
 * below is device-scoped AsyncStorage, so it comes back false on every
 * reinstall/new device even for an account that finished onboarding long
 * ago — that used to send already-onboarded users back through the entire
 * flow. Pass it whenever it's known (i.e. the profile has loaded); leave it
 * `undefined` only when there's no account data to check yet (offline, fetch
 * failed), which falls back to the local flag as a best-effort cache. Either
 * way the local flag is kept in sync with the server's answer below, so a
 * later launch where the network is slow/unavailable still routes correctly.
 */
export async function getNextOnboardingScreen(
  serverOnboardingCompleted?: boolean,
): Promise<'OnboardUsername' | 'OnboardPath' | null> {
  const onboarding = await getOnboarding();
  const isDone = serverOnboardingCompleted ?? await isOnboardingDone();

  if (isDone) {
    if (serverOnboardingCompleted === true) await setOnboardingDone(true);
    return null; // Onboarding complete
  }
  if (serverOnboardingCompleted === false) await setOnboardingDone(false);

  if (onboarding.currentStep === 'path' || onboarding.currentStep === 'assessment') {
    return 'OnboardPath'; // Checkpoint B — always restart at the placement question
  }

  // Checkpoint A incomplete (or never started) — restart from the very top,
  // which is the username question. This used to return 'OnboardAge', which
  // meant a resumed onboarding skipped the name step entirely and the account
  // kept its placeholder display_name ("Learner", or "Guest" on a claimed
  // guest row) forever.
  return 'OnboardUsername';
}

export async function setReciterId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.reciterId, id);
}

let scriptPreferenceCache: ScriptPreference = 'uthmani';

export function getScriptPreferenceSync(): ScriptPreference {
  return scriptPreferenceCache;
}

export async function hydrateScriptPreference(): Promise<ScriptPreference> {
  const raw = await AsyncStorage.getItem(KEYS.script);
  scriptPreferenceCache = (raw as ScriptPreference) ?? 'uthmani';
  useScriptStore.getState().setScript(scriptPreferenceCache);
  return scriptPreferenceCache;
}

export async function getScriptPreference(): Promise<ScriptPreference> {
  return hydrateScriptPreference();
}

export async function setScriptPreference(script: ScriptPreference): Promise<void> {
  scriptPreferenceCache = script;
  useScriptStore.getState().setScript(script);
  await AsyncStorage.setItem(KEYS.script, script);
  await saveOnboarding({ script });
}

// Last email the user typed on the Login screen — used only to build the
// masked "ah***@gmail.com" hint on the Forgot Password screen so the user
// knows which address they're expected to type, never shown in full.
export async function getLastEmailHint(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.lastEmailHint);
}

export async function setLastEmailHint(email: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.lastEmailHint, email);
}

// Local calendar date (YYYY-MM-DD) of the last completed session — the device-side
// source of truth for "did I already practise today" that services/localNotifications.ts
// needs but the backend doesn't return. Stamped by lessonStore.completeSession(); read on
// every app launch (authStore.applyFreshLearning) since a launch has no "just completed"
// signal of its own.
export async function getLastActiveLocalDate(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.lastActiveLocalDate);
}

export async function setLastActiveLocalDate(date: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.lastActiveLocalDate, date);
}

// Whether the local-notification permission prompt has already been shown once.
// Asked after the first completed lesson, never at launch, and never twice — a denial
// is permanent, so re-asking only spends goodwill for no chance of a different answer.
export async function wasLocalNotifPermissionAsked(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.localNotifPermissionAsked)) === 'true';
}

export async function setLocalNotifPermissionAsked(): Promise<void> {
  await AsyncStorage.setItem(KEYS.localNotifPermissionAsked, 'true');
}

