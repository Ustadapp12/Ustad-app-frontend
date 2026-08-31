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
}

/**
 * XP only — a guest's streak is never parked or banked at all (product
 * decision: a guest's streak always reads as 0/dash everywhere, and signing
 * up always starts a real streak at day one, never backfilled from whatever
 * a guest's session showed). XP still accumulates across levels the same way
 * it always did.
 */
export async function addPendingGuestProgress(xp: number): Promise<void> {
  const current = await getPendingGuestProgress();
  await AsyncStorage.setItem(KEYS.pendingXp, String(current.xp + Math.max(xp, 0)));
}

export async function getPendingGuestProgress(): Promise<PendingGuestProgress> {
  const xp = await AsyncStorage.getItem(KEYS.pendingXp);
  return { xp: Number(xp) || 0 };
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
