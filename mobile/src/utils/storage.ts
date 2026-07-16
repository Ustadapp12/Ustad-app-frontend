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
} as const;

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
      let tokens = await getSecureTokens();
      if (!tokens) {
        const legacy = await AsyncStorage.getItem(KEYS.tokensLegacy);
        if (legacy) {
          tokens = JSON.parse(legacy) as Tokens;
          await setSecureTokens(tokens);
          await AsyncStorage.removeItem(KEYS.tokensLegacy);
        }
      }
      tokensCache = tokens;
      tokensInFlight = null;
      return tokens;
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
  return raw ? (JSON.parse(raw) as User) : null;
}

export async function setStoredUser(user: User | null): Promise<void> {
  if (user) await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
  else await AsyncStorage.removeItem(KEYS.user);
}

export async function getOnboarding(): Promise<OnboardingAnswers> {
  const raw = await AsyncStorage.getItem(KEYS.onboarding);
  return raw ? (JSON.parse(raw) as OnboardingAnswers) : {};
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
  return raw ? (JSON.parse(raw) as number[]) : [];
}

export async function unlockSeason(seasonIdx: number): Promise<number[]> {
  const current = await getUnlockedSeasons();
  if (current.includes(seasonIdx)) return current;
  const next = [...current, seasonIdx];
  await AsyncStorage.setItem(KEYS.seasonsUnlocked, JSON.stringify(next));
  return next;
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
 */
export async function getNextOnboardingScreen(): Promise<'OnboardAge' | 'OnboardPath' | null> {
  const onboarding = await getOnboarding();
  const isDone = await isOnboardingDone();

  if (isDone) return null; // Onboarding complete

  if (onboarding.currentStep === 'path' || onboarding.currentStep === 'assessment') {
    return 'OnboardPath'; // Checkpoint B — always restart at the placement question
  }

  return 'OnboardAge'; // Checkpoint A incomplete (or never started) — restart from the top
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

