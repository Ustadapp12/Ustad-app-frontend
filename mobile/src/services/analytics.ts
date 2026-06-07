/**
 * Centralised analytics service — Firebase Analytics + Sentry context.
 *
 * RULES:
 *   - No direct Firebase or Sentry imports anywhere else in the app.
 *   - Every call is async and wrapped in try/catch — analytics must never
 *     slow down or crash the UI.
 *   - In __DEV__ mode, every event is printed to the console instead of
 *     being sent to Firebase (collection disabled in dev).
 */
import { Platform } from 'react-native';

// ── Event name registry (single source of truth) ─────────────────
export const AnalyticsEvents = {
  // Auth
  LOGIN: 'login',
  SIGN_UP: 'sign_up',
  // Navigation
  HOME_VIEW: 'home_view',
  SURAH_SELECTED: 'surah_selected',
  STAGE_SELECTED: 'stage_selected',
  STAGE_INTRO_VIEWED: 'stage_intro_viewed',
  // Lesson lifecycle
  LESSON_OPENED: 'lesson_opened',
  LESSON_START: 'lesson_start',
  LESSON_COMPLETE: 'lesson_complete',
  LESSON_ABANDON: 'lesson_abandon',
  // Per-exercise
  EXERCISE_STARTED: 'exercise_started',
  EXERCISE_COMPLETED: 'exercise_completed',
  EXERCISE_FAILED: 'exercise_failed',
  // Friction / difficulty signals
  USER_STRUGGLING: 'user_struggling',
  // Revision
  REVISION_STARTED: 'revision_started',
  REVISION_COMPLETED: 'revision_completed',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

type ParamValue = string | number | boolean | undefined;
type EventParams = Record<string, ParamValue>;

// ── Firebase Analytics lazy-loader ────────────────────────────────
type AnalyticsFactory = typeof import('@react-native-firebase/analytics').default;
let _analytics: AnalyticsFactory | false | null = null;

function getAnalytics(): AnalyticsFactory | null {
  if (_analytics === false) return null;
  if (_analytics) return _analytics;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _analytics = require('@react-native-firebase/analytics').default as AnalyticsFactory;
    return _analytics;
  } catch {
    _analytics = false;
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────

/** Strip undefined values and coerce booleans to 0/1 for Firebase. */
function sanitizeParams(params?: EventParams): Record<string, string | number> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    out[k] = typeof v === 'boolean' ? (v ? 1 : 0) : v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** In dev: print every event to the console. In prod: no-op. */
function devLog(eventName: string, params?: EventParams): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[Analytics] ${eventName}`, params ?? {});
  }
}

// ── Public API ────────────────────────────────────────────────────

/** Call once after auth initialises. Disables collection in __DEV__. */
export async function initAnalytics(): Promise<void> {
  const a = getAnalytics();
  if (!a) return;
  try {
    // Disable Firebase data collection in development so dev events don't
    // pollute the production dataset. Events are still printed via devLog.
    await a().setAnalyticsCollectionEnabled(!__DEV__);
    await a().logEvent('app_open', { platform: Platform.OS });
    devLog('app_open', { platform: Platform.OS });
  } catch { /* Firebase not configured on this build */ }
}

/** Set Firebase user ID — call after login / register / hydrate. */
export async function setAnalyticsUserId(userId: string | null): Promise<void> {
  devLog('setUserId', { userId: userId ?? 'null' });
  const a = getAnalytics();
  if (!a) return;
  try {
    await a().setUserId(userId);
  } catch { /* ignore */ }
}

/**
 * Set persistent user properties on the Firebase user profile.
 * These segment events in BigQuery / DebugView dashboards.
 */
export async function setUserProperties(props: {
  learner_mode?: string;
  script_preference?: string;
  daily_goal_minutes?: number;
  streak_goal_days?: number;
}): Promise<void> {
  devLog('setUserProperties', props as EventParams);
  const a = getAnalytics();
  if (!a) return;
  try {
    const serialized: Record<string, string> = {};
    for (const [k, v] of Object.entries(props)) {
      if (v !== undefined) serialized[k] = String(v);
    }
    if (Object.keys(serialized).length) {
      await a().setUserProperties(serialized);
    }
  } catch { /* ignore */ }
}

/** Fire a named analytics event with optional params. Non-blocking. */
export async function logAnalyticsEvent(
  name: string,
  params?: EventParams,
): Promise<void> {
  devLog(name, params);
  const a = getAnalytics();
  if (!a) return;
  try {
    await a().logEvent(name, sanitizeParams(params));
  } catch { /* ignore */ }
}

/** Fire a screen_view event. Called automatically by RootNavigator. */
export async function logScreenView(screenName: string): Promise<void> {
  devLog('screen_view', { screen_name: screenName });
  const a = getAnalytics();
  if (!a) return;
  try {
    await a().logScreenView({ screen_name: screenName, screen_class: screenName });
  } catch { /* ignore */ }
}

/**
 * Fire when a user shows signs of difficulty on a specific exercise.
 * Triggers when:
 *   - attempts >= 3 wrong answers on the same step, OR
 *   - time spent on one step > 120 seconds
 */
export async function logUserStruggling(params: {
  exercise_type: string;
  ayah_id: string;
  surah_id: number;
  reason: 'high_attempts' | 'slow_completion' | 'both';
  attempts?: number;
  time_spent_ms?: number;
}): Promise<void> {
  void logAnalyticsEvent(AnalyticsEvents.USER_STRUGGLING, {
    ...params,
    time_spent_s: params.time_spent_ms != null
      ? Math.round(params.time_spent_ms / 1000)
      : undefined,
  });
}
