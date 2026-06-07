/**
 * Crash reporting service — Sentry context wrapper.
 *
 * Sentry is already initialised in index.js (Sentry.wrap(App)).
 * This service enriches crash reports with lesson/exercise context
 * so every crash is tagged with what the user was doing.
 *
 * Design decision: Firebase Crashlytics is NOT added separately.
 * Sentry handles both JS and native symbolication for React Native.
 * If you ever need Crashlytics, swap the Sentry calls here — no other
 * file needs to change.
 *
 * RULES:
 *   - Only this file imports from @sentry/react-native.
 *   - All methods are synchronous and never throw.
 */
import * as Sentry from '@sentry/react-native';

interface LessonContext {
  screen?: string;
  exercise_type?: string;
  ayah_id?: string;
  surah_id?: number;
  session_id?: string;
  step_index?: number;
}

let _ctx: LessonContext = {};

/**
 * Update the lesson context attached to all subsequent Sentry events.
 * Call when entering a lesson, on each exercise step, and when leaving.
 */
export function setCrashContext(partial: Partial<LessonContext>): void {
  _ctx = { ..._ctx, ...partial };
  try {
    Sentry.setContext('lesson', _ctx as Record<string, unknown>);
    if (partial.screen) Sentry.setTag('screen', partial.screen);
    if (partial.exercise_type) Sentry.setTag('exercise_type', partial.exercise_type);
    if (partial.surah_id != null) Sentry.setTag('surah_id', String(partial.surah_id));
  } catch { /* Sentry may not be ready yet */ }
}

/** Clear lesson context — call when the user exits the lesson flow. */
export function clearCrashContext(): void {
  _ctx = {};
  try {
    Sentry.setContext('lesson', null);
    Sentry.setTag('screen', '');
    Sentry.setTag('exercise_type', '');
    Sentry.setTag('surah_id', '');
  } catch { /* ignore */ }
}

/**
 * Capture a caught JS error with the current lesson context.
 * Use for errors that are non-fatal but worth tracking.
 */
export function captureError(
  error: unknown,
  extras?: Record<string, unknown>,
): void {
  try {
    Sentry.withScope(scope => {
      scope.setContext('lesson_context', _ctx as Record<string, unknown>);
      if (extras) scope.setExtras(extras);
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(String(error), 'warning');
      }
    });
  } catch { /* ignore */ }
}

/**
 * Set the Sentry user — mirrors what authStore does after login/register.
 * Call this from crashReporter only; authStore still owns the Sentry.setUser call.
 */
export function setCrashUser(userId: string | null, email?: string): void {
  try {
    Sentry.setUser(userId ? { id: userId, email } : null);
  } catch { /* ignore */ }
}

/**
 * Add a non-error breadcrumb for key app events.
 * Breadcrumbs appear in Sentry alongside the crash for context.
 */
export function addBreadcrumb(
  message: string,
  category = 'app',
  data?: Record<string, unknown>,
): void {
  try {
    Sentry.addBreadcrumb({ message, category, data, level: 'info' });
  } catch { /* ignore */ }
}
