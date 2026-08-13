import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StreakState } from '../types/api';

// Single source for every place a streak flame renders — the map HUD pill,
// profile stats, and the streak page itself all need the same active/frozen
// swap, so it lives here once instead of three times.
export const STREAK_ACTIVE_COLOR = '#EA580C';
export const STREAK_FROZEN_COLOR = '#2E90E5';
export const STREAK_NONE_COLOR = '#9CA3AF';
export const STREAK_ACTIVE_EMOJI = '🔥';
// Real ice-cube artwork (product-provided 2026-08-11) — the frozen-streak
// representation everywhere it's shown, replacing the old 🧊 placeholder.
export const STREAK_FROZEN_ICON = require('../../assets/map/frozen.png');

export function isStreakFrozen(state: StreakState | undefined): boolean {
  return state === 'frozen';
}

// A broken/never-started streak ("none") used to render identically to an
// active one (same orange fire) — only the number gave it away. Muted grey
// makes "there's nothing going right now" legible at a glance on the map
// HUD pill and Profile stats, without inventing a new emoji nobody asked for.
export function streakColor(state: StreakState | undefined): string {
  if (state === 'frozen') return STREAK_FROZEN_COLOR;
  if (state === 'none') return STREAK_NONE_COLOR;
  return STREAK_ACTIVE_COLOR;
}

// "1 day left to save your streak" / "2 days left to save your streak".
export function freezeDaysLabel(daysRemaining: number): string {
  return `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left to save your streak`;
}

// Deliberately "levels," never "attempts"/"sessions" — repair requires 2
// DISTINCT lesson_group_ids, and replaying one level twice doesn't count, so
// the copy shouldn't imply otherwise.
export function repairProgressLabel(completed: number, required: number): string {
  return `${completed} of ${required} levels done today`;
}

// ── Streak-lost detection ───────────────────────────────────────────
// The backend has no event for the frozen/active -> "none" transition (the
// freeze window expiring) — it's computed live and returned silently on the
// next read, with no historical marker of what was lost (see
// app/learning/service.py's _streak_view). This makes that transition
// detectable client-side by comparing consecutive learningApi.me() reads,
// persisted across app restarts the same way utils/guest.ts's
// wasUpgradePrompted/setUpgradePrompted flag is.
const LAST_SEEN_KEY = '@ustadapp/streak/lastSeen';

interface LastSeenStreak { state: StreakState; streak: number }

async function getLastSeenStreak(): Promise<LastSeenStreak | null> {
  const raw = await AsyncStorage.getItem(LAST_SEEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LastSeenStreak;
  } catch {
    return null;
  }
}

/**
 * Call on every fresh learning read. Persists the new state for next time and
 * returns the prior streak count IF this read is the first one to observe a
 * genuine loss (previously active/frozen with a real streak, now "none") —
 * null otherwise. A one-shot signal, not a standing flag: the caller decides
 * what to do with it (see authStore.refreshLearning / StreakLostModal).
 */
export async function checkStreakLoss(state: StreakState, currentStreak: number): Promise<number | null> {
  const prev = await getLastSeenStreak();
  await AsyncStorage.setItem(LAST_SEEN_KEY, JSON.stringify({ state, streak: currentStreak } satisfies LastSeenStreak));
  if (!prev) return null;
  const wasAlive = (prev.state === 'active' || prev.state === 'frozen') && prev.streak > 0;
  return wasAlive && state === 'none' ? prev.streak : null;
}

// ── Streak-frozen popup (one shot per freeze occurrence) ────────────
// Unlike checkStreakLoss (a one-time comparison), a freeze can be observed
// on every single learning read for as long as it lasts (up to
// streak_freeze_max_missed_days). This flag — not a state comparison — is
// what keeps the popup from re-showing on every map visit during that
// window: set the instant it's shown, cleared the instant the state moves
// off "frozen" (repaired back to active, or the window expired to "none"),
// so the NEXT freeze still gets its own popup.
const FROZEN_POPUP_SHOWN_KEY = '@ustadapp/streak/frozenPopupShown';

export async function checkStreakFrozenPopup(state: StreakState): Promise<boolean> {
  if (state !== 'frozen') {
    await AsyncStorage.removeItem(FROZEN_POPUP_SHOWN_KEY);
    return false;
  }
  const alreadyShown = (await AsyncStorage.getItem(FROZEN_POPUP_SHOWN_KEY)) === 'true';
  if (alreadyShown) return false;
  await AsyncStorage.setItem(FROZEN_POPUP_SHOWN_KEY, 'true');
  return true;
}
