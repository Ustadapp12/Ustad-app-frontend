import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OnboardingAnswers, Tokens } from '../types/api';

const KEYS = {
  tokens: '@ustadapp/tokens',
  onboarding: '@ustadapp/onboarding/v1',
  onboardingDone: '@ustadapp/onboarding/done',
  reciterId: '@ustadapp/reciter',
} as const;

export async function getTokens(): Promise<Tokens | null> {
  const raw = await AsyncStorage.getItem(KEYS.tokens);
  return raw ? (JSON.parse(raw) as Tokens) : null;
}

export async function setTokens(tokens: Tokens | null): Promise<void> {
  if (tokens) {
    await AsyncStorage.setItem(KEYS.tokens, JSON.stringify(tokens));
  } else {
    await AsyncStorage.removeItem(KEYS.tokens);
  }
}

export async function getOnboarding(): Promise<OnboardingAnswers> {
  const raw = await AsyncStorage.getItem(KEYS.onboarding);
  return raw ? (JSON.parse(raw) as OnboardingAnswers) : {};
}

export async function saveOnboarding(
  patch: Partial<OnboardingAnswers>,
): Promise<OnboardingAnswers> {
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
