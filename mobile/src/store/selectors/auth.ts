import type { AuthState } from '../authStore';
import { isGuest } from '../../utils/guest';

// One exact value per selector, so a screen redraws only when the value it
// shows changes. `useAuthStore()` with no selector subscribes to the WHOLE
// store, and `s => s.learning` still redraws every 60s poll (a new object
// each time), so read the narrowest field there is (2026-10-22, user rule:
// "only call and use what we need, not any extra info at all").
//
// Usage: const xp = useAuthStore(selectXpTotal);

// ── user ──────────────────────────────────────────────────────────────
export const selectUser = (s: AuthState) => s.user;
export const selectIsGuest = (s: AuthState) => isGuest(s.user);
export const selectUserId = (s: AuthState) => s.user?.id;
export const selectUserEmail = (s: AuthState) => s.user?.email;
export const selectUserName = (s: AuthState) => s.user?.name;
export const selectHasPassword = (s: AuthState) => s.user?.has_password;
export const selectIsHydrated = (s: AuthState) => s.isHydrated;

// ── learning (polled every 60s, so never select the whole object) ─────
export const selectXpTotal = (s: AuthState) => s.learning?.xp_total;
export const selectCurrentStreak = (s: AuthState) => s.learning?.current_streak;
export const selectStreakState = (s: AuthState) => s.learning?.streak_state;
export const selectFreezeDaysRemaining = (s: AuthState) => s.learning?.freeze_days_remaining;
export const selectRepairLevelsCompleted = (s: AuthState) => s.learning?.repair_levels_completed;
export const selectRepairLevelsRequired = (s: AuthState) => s.learning?.repair_levels_required;

// ── profile ───────────────────────────────────────────────────────────
export const selectAvatarVariant = (s: AuthState) => s.profile?.avatar_variant;
export const selectGender = (s: AuthState) => s.profile?.gender;
export const selectAge = (s: AuthState) => s.profile?.age;
export const selectOnboardingCompleted = (s: AuthState) => s.profile?.onboarding_completed;

// ── actions (stable references, never cause a redraw) ─────────────────
export const selectLogout = (s: AuthState) => s.logout;
export const selectDeleteAccount = (s: AuthState) => s.deleteAccount;
export const selectUpdateProfileFields = (s: AuthState) => s.updateProfileFields;
export const selectUpdateDisplayName = (s: AuthState) => s.updateDisplayName;
export const selectStartGuestSession = (s: AuthState) => s.startGuestSession;
