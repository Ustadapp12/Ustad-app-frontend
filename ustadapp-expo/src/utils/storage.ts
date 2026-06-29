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
} as const;

export async function getTokens(): Promise<Tokens | null> {
  let tokens = await getSecureTokens();
  if (!tokens) {
    const legacy = await AsyncStorage.getItem(KEYS.tokensLegacy);
    if (legacy) {
      tokens = JSON.parse(legacy) as Tokens;
      await setSecureTokens(tokens);
      await AsyncStorage.removeItem(KEYS.tokensLegacy);
    }
  }
  return tokens;
}

export async function setTokens(tokens: Tokens | null): Promise<void> {
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

export async function getReciterId(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.reciterId)) ?? 'husary';
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

