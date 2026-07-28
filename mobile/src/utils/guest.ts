import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types/api';

/**
 * Guest mode.
 *
 * A guest is a real, server-side account whose `email` is null — not a local
 * stub. That's why there's no separate "isGuest" flag anywhere: the session
 * itself carries the answer, so the two can never drift apart. Signing up
 * later fills the email in on that same row, which is what lets level progress
 * survive the conversion untouched.
 *
 * What a guest does NOT get is durable XP or streaks. The backend computes and
 * returns both (so every celebration screen looks identical) but never writes
 * them. The client parks the totals here instead, and hands them to
 * /auth/guest/upgrade if — and only if — the user actually creates the account.
 * Decline, and they're cleared. That's deliberate: the streak is the carrot.
 */
export function isGuest(user: User | null | undefined): boolean {
  return !!user && user.email === null;
}

/** Name to show for a user, coping with a guest having no email to derive one from. */
export function displayNameFor(user: User, profileName?: string | null): string {
  return profileName ?? user.email?.split('@')[0] ?? 'Guest';
}

const KEYS = {
  pendingXp: '@ustadapp/guest/pendingXp',
  pendingStreak: '@ustadapp/guest/pendingStreak',
  upgradePrompted: '@ustadapp/guest/upgradePrompted',
} as const;

export interface PendingGuestProgress {
  xp: number;
  streak: number;
}

/** Accumulates — a guest may finish more than one level before signing up. */
export async function addPendingGuestProgress(xp: number, streak: number): Promise<void> {
  const current = await getPendingGuestProgress();
  await AsyncStorage.setItem(KEYS.pendingXp, String(current.xp + Math.max(xp, 0)));
  // A streak is a standing total, not something to sum.
  await AsyncStorage.setItem(KEYS.pendingStreak, String(Math.max(current.streak, streak)));
}

export async function getPendingGuestProgress(): Promise<PendingGuestProgress> {
  const [xp, streak] = await Promise.all([
    AsyncStorage.getItem(KEYS.pendingXp),
    AsyncStorage.getItem(KEYS.pendingStreak),
  ]);
  return { xp: Number(xp) || 0, streak: Number(streak) || 0 };
}

export async function clearPendingGuestProgress(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.pendingXp);
  await AsyncStorage.removeItem(KEYS.pendingStreak);
}

/**
 * Whether the "create an account to save your progress" prompt has already been
 * shown after a level. Only the first one is unprompted-for; nagging after
 * every single level would sour the thing it's trying to sell.
 */
export async function wasUpgradePrompted(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.upgradePrompted)) === 'true';
}

export async function setUpgradePrompted(): Promise<void> {
  await AsyncStorage.setItem(KEYS.upgradePrompted, 'true');
}

/** Called when a fresh guest session starts, so a reused device begins clean. */
export async function resetGuestState(): Promise<void> {
  await clearPendingGuestProgress();
  await AsyncStorage.removeItem(KEYS.upgradePrompted);
}
