/**
 * Local (on-device) notifications — daily practice reminder, streak-about-to-break,
 * and freeze-days-running-out. No backend, no FCM token, no network.
 *
 * RULES (same discipline as services/analytics.ts / services/googleAuth.ts):
 *   - No direct @notifee/react-native imports anywhere else in the app.
 *   - Every notifee call is wrapped so a missing/failed native module degrades to a
 *     no-op, never a thrown error into the UI.
 *
 * Wired in (see notifications-scaffold/README.md for the original scope note this
 * grew from):
 *   - refreshLocalNotifications() runs on every fresh learning payload
 *     (authStore.applyFreshLearning — login/register/hydrate/refresh) and right after
 *     every completed lesson (lessonStore.completeSession).
 *   - requestLocalNotificationPermission() is asked exactly once, from
 *     lessonStore.completeSession, the first time a lesson is ever completed (gated
 *     by utils/storage.ts's wasLocalNotifPermissionAsked flag) — never at launch.
 *
 * NOT done yet, on purpose:
 *   - No reminder-hour picker exists in onboarding, so every call site above passes
 *     `reminderHour: null` — computeDailyPracticeReminder() always no-ops until a
 *     picker exists and something persists the value (plan: language_prefs, next to
 *     avatar_variant; note the backend explicitly allowlists which language_prefs
 *     sub-fields get serialized to the client, so this also needs a small backend
 *     schema addition, not just a client picker).
 *   - "Hearts are full again" is deliberately excluded — the persistent hearts
 *     economy it depends on has no UI anywhere in the app yet.
 *   - Not yet verified on a real device/build — android/ hasn't reached
 *     C:\BuildProjects\ustadapp-mobile\ yet, see changes-2026-09-04.md.
 */

// ── Notifee lazy-loader (same pattern as analytics.ts / googleAuth.ts) ────────
type NotifeeModule = typeof import('@notifee/react-native');
let _notifee: NotifeeModule | false | null = null;

function getNotifee(): NotifeeModule | null {
  if (_notifee === false) return null;
  if (_notifee) return _notifee;
  // Notifee requires full native compilation — not available in DEBUG mode (Metro dev).
  // This prevents "Notifee native module not found" errors during app startup.
  if (__DEV__) {
    _notifee = false;
    return null;
  }
  try {
    _notifee = require('@notifee/react-native') as NotifeeModule;
    return _notifee;
  } catch {
    _notifee = false;
    return null;
  }
}

const CHANNEL_ID = 'reminders';
let channelReady = false;

// Prefixed onto every notification title so it's clear which app sent it —
// iOS/Android already show the app icon/name alongside a notification, but
// that's easy to miss in a crowded notification shade, and the app name
// otherwise never appears in the message content itself (2026-09-05 user
// request: "actually say that they are from UstadApp").
const APP_NAME = 'UstadApp';
function withAppName(title: string): string {
  return `${APP_NAME}: ${title}`;
}

/** Idempotent — safe to call before every schedule. Android only; notifee no-ops
 *  this on iOS. */
async function ensureChannel(): Promise<void> {
  if (channelReady) return;
  const notifee = getNotifee();
  if (!notifee) return;
  const mod = notifee.default;
  await mod.createChannel({
    id: CHANNEL_ID,
    name: 'Reminders',
    importance: notifee.AndroidImportance.DEFAULT,
  });
  channelReady = true;
}

// ── Notification message templates ─────────────────────────────────────
function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const STREAK_MESSAGES = [
  { title: '12 day streak on the line 😳', body: 'don\'t be THAT person who breaks the streak' },
  { title: 'one more day and it\'s a new record 🔥', body: 'streak said "don\'t do this to me"' },
];

const INACTIVITY_MESSAGES = [
  { title: 'bestie it\'s been days 🥲', body: 'ur hifz journey called, it\'s worried' },
  { title: 'no cap, even 1 ayah counts today', body: 'lumo\'s not mad, just disappointed jk come back 🤍' },
];

const MILESTONE_MESSAGES = [
  { title: 'JUZ 5 DONE LETS GOOO 🎉', body: 'u ate that surrah fr' },
  { title: 'certified hifz grinder 💪', body: 'lumo\'s so proud rn' },
];

const STREAK_LOST_MESSAGES = [
  { title: 'streak\'s gone but ur hifz isn\'t', body: 'reset & go' },
  { title: 'it happens. today\'s a fresh start', body: '' },
];

/** Call after the first completed lesson (not at launch — see module header). */
export async function requestLocalNotificationPermission(): Promise<boolean> {
  const notifee = getNotifee();
  if (!notifee) return false;
  try {
    const settings = await notifee.default.requestPermission();
    return settings.authorizationStatus >= 1; // AuthorizationStatus.AUTHORIZED or PROVISIONAL
  } catch {
    return false;
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

export type LocalNotificationKind =
  | 'daily_practice_reminder_10am'
  | 'daily_practice_reminder_5pm'
  | 'streak_about_to_break'
  | 'freeze_days_running_out'
  | 'inactivity_nudge'
  | 'milestone_completed'
  | 'streak_lost';

export interface LocalNotification {
  kind: LocalNotificationKind;
  fireAt: Date;
  title: string;
  body: string;
}

/** Mirrors the fields /complete actually returns (app/learning/schemas.py) —
 *  nothing invented. */
export interface StreakState {
  currentStreak: number;
  state: 'active' | 'frozen' | 'none';
  freezeDaysRemaining: number;
  /** Local calendar date (YYYY-MM-DD) of the last completed session. Not returned
   *  by the backend today — the client stamps this itself the moment a session
   *  completes, since it needs no server round-trip. */
  lastActiveLocalDate: string | null;
}

/** User-chosen reminder hour (0-23, local time). Belongs in language_prefs next to
 *  avatar_variant so it survives reinstall — see backend UserProfile.language_prefs. */
export interface ReminderPrefs {
  reminderHour: number | null;
}

export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Pure trigger-time computation — no native calls, fully unit-testable ─────

function computeDailyPracticeReminder(
  streak: Pick<StreakState, 'lastActiveLocalDate'>,
  now: Date,
  hour: 10 | 17, // 10 AM or 5 PM
): LocalNotification | null {
  if (streak.lastActiveLocalDate === toLocalDateString(now)) return null;

  const fireAt = new Date(now);
  fireAt.setHours(hour, 0, 0, 0);
  if (fireAt <= now) fireAt.setDate(fireAt.getDate() + 1);

  return {
    kind: hour === 10 ? 'daily_practice_reminder_10am' : 'daily_practice_reminder_5pm',
    fireAt,
    title: 'Your ayahs are waiting',
    body: 'Five minutes is enough.',
  };
}

const STREAK_WARNING_HOURS_BEFORE_MIDNIGHT = 3;

export function computeStreakAboutToBreak(streak: StreakState, now: Date): LocalNotification | null {
  if (streak.state !== 'active' || streak.currentStreak <= 0) return null;
  if (streak.lastActiveLocalDate === toLocalDateString(now)) return null;

  const warningTime = new Date(now);
  warningTime.setHours(24 - STREAK_WARNING_HOURS_BEFORE_MIDNIGHT, 0, 0, 0);
  // Already past the warning hour and still not practised — fire ASAP rather than
  // scheduling a time already in the past.
  const fireAt = warningTime > now ? warningTime : new Date(now.getTime() + 60_000);

  const msg = pickRandom(STREAK_MESSAGES);
  return {
    kind: 'streak_about_to_break',
    fireAt,
    title: msg.title,
    body: msg.body,
  };
}

const FREEZE_REMINDER_MORNING_HOUR = 9;

export function computeFreezeDaysRunningOut(streak: StreakState, now: Date): LocalNotification | null {
  if (streak.state !== 'frozen' || streak.freezeDaysRemaining <= 0) return null;

  const fireAt = new Date(now);
  fireAt.setHours(FREEZE_REMINDER_MORNING_HOUR, 0, 0, 0);
  if (fireAt <= now) fireAt.setDate(fireAt.getDate() + 1);

  return {
    kind: 'freeze_days_running_out',
    fireAt,
    title: 'Your streak is frozen',
    body: "One more missed day and it's gone.",
  };
}

// ── TEMP DEBUG: manual test trigger ─────────────────────────────────────────
// Fires every notification type a few seconds apart so it can be previewed on
// a real device without waiting for real trigger conditions (10am/5pm/near-
// midnight/etc). Wired to a button in ProfileScreen — remove both before
// publishing. Requires a production build: no-ops under __DEV__ same as
// everything else in this file (see getNotifee above).
const TEST_STAGGER_MS = 5000;

export async function sendTestNotifications(): Promise<{ ok: boolean; reason?: string; count?: number }> {
  const notifee = getNotifee();
  if (!notifee) return { ok: false, reason: 'Notifications need a production build — not available in this build.' };

  const granted = await requestLocalNotificationPermission();
  if (!granted) return { ok: false, reason: 'Notification permission was not granted. Check Settings > Notifications.' };

  await ensureChannel();

  const tests: Array<{ kind: string; title: string; body: string }> = [
    { kind: 'test_daily_10am', title: 'Your ayahs are waiting', body: 'Five minutes is enough.' },
    { kind: 'test_streak_about_to_break', ...pickRandom(STREAK_MESSAGES) },
    { kind: 'test_freeze_days_running_out', title: 'Your streak is frozen', body: "One more missed day and it's gone." },
    { kind: 'test_inactivity_nudge', ...pickRandom(INACTIVITY_MESSAGES) },
    { kind: 'test_milestone_completed', ...pickRandom(MILESTONE_MESSAGES) },
    { kind: 'test_streak_lost', ...pickRandom(STREAK_LOST_MESSAGES) },
  ];

  const now = Date.now();
  try {
    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      await notifee.default.createTriggerNotification(
        {
          id: t.kind,
          title: withAppName(t.title),
          body: t.body,
          android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } },
        },
        { type: notifee.TriggerType.TIMESTAMP, timestamp: now + (i + 1) * TEST_STAGGER_MS },
      );
    }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Scheduling failed.' };
  }

  return { ok: true, count: tests.length };
}

// ── Native scheduling ─────────────────────────────────────────────────────

async function scheduleLocal(notification: LocalNotification): Promise<void> {
  const notifee = getNotifee();
  if (!notifee) return;
  await ensureChannel();
  await notifee.default.createTriggerNotification(
    {
      id: notification.kind,
      title: withAppName(notification.title),
      body: notification.body,
      android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } },
    },
    { type: notifee.TriggerType.TIMESTAMP, timestamp: notification.fireAt.getTime() },
  );
}

async function cancelLocal(kind: LocalNotificationKind): Promise<void> {
  const notifee = getNotifee();
  if (!notifee) return;
  await notifee.default.cancelTriggerNotification(kind);
}

/**
 * Recompute all three local notifications against current state and (re)schedule
 * or cancel each accordingly. Intended to run on app launch and right after a
 * session completes — not wired to either call site yet, see module header.
 */
export async function refreshLocalNotifications(
  streak: StreakState,
  prefs: ReminderPrefs,
  now: Date = new Date(),
): Promise<void> {
  const computed: Array<[LocalNotificationKind, LocalNotification | null]> = [
    ['daily_practice_reminder_10am', computeDailyPracticeReminder(streak, now, 10)],
    ['daily_practice_reminder_5pm', computeDailyPracticeReminder(streak, now, 17)],
    ['streak_about_to_break', computeStreakAboutToBreak(streak, now)],
    ['freeze_days_running_out', computeFreezeDaysRunningOut(streak, now)],
  ];

  for (const [kind, notification] of computed) {
    try {
      if (notification) {
        await scheduleLocal(notification);
      } else {
        await cancelLocal(kind);
      }
    } catch {
      // Never let a scheduling failure surface to the UI — same discipline as
      // analytics.ts. Worst case a reminder silently doesn't fire this cycle.
    }
  }
}
