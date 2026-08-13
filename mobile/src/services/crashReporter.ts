/**
 * Crash reporting service — Firebase Crashlytics wrapper.
 *
 * Migrated from Sentry (see git history) so crashes live in the same
 * Firebase console/login as Analytics, with no separate Sentry/Slack
 * account dependency.
 *
 * RULES:
 *   - Only this file imports from @react-native-firebase/crashlytics.
 *   - All methods are synchronous (fire-and-forget) and never throw.
 */
import crashlytics from '@react-native-firebase/crashlytics';

interface LessonContext {
  screen?: string;
  exercise_type?: string;
  ayah_id?: string;
  surah_id?: number;
  session_id?: string;
  step_index?: number;
}

let _ctx: LessonContext = {};

function toAttributes(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = String(v);
  }
  return out;
}

/** Wire up global JS-error capture and enable collection outside dev. Call once at startup. */
export function initCrashReporting(): void {
  try {
    void crashlytics().setCrashlyticsCollectionEnabled(!__DEV__);
  } catch { /* Crashlytics native module not available (e.g. Expo Go) */ }

  try {
    const defaultHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      captureError(error, { isFatal: !!isFatal });
      defaultHandler(error, isFatal);
    });
  } catch { /* ignore */ }
}

/**
 * Update the lesson context attached to all subsequent Crashlytics reports.
 * Call when entering a lesson, on each exercise step, and when leaving.
 */
export function setCrashContext(partial: Partial<LessonContext>): void {
  _ctx = { ..._ctx, ...partial };
  try {
    void crashlytics().setAttributes(toAttributes(_ctx as Record<string, unknown>));
  } catch { /* Crashlytics may not be ready yet */ }
}

/** Clear lesson context — call when the user exits the lesson flow. */
export function clearCrashContext(): void {
  _ctx = {};
  try {
    void crashlytics().setAttributes({ screen: '', exercise_type: '', surah_id: '' });
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
    if (extras) void crashlytics().setAttributes(toAttributes(extras));
    void crashlytics().recordError(error instanceof Error ? error : new Error(String(error)));
  } catch { /* ignore */ }
}

/**
 * Set the Crashlytics user — mirrors what authStore does after login/register.
 * Call this from crashReporter only; authStore still owns the call site.
 * Crashlytics has no dedicated email field — only the id is stored, to
 * avoid putting PII directly into crash reports.
 */
export function setCrashUser(userId: string | null, _email?: string | null): void {
  try {
    void crashlytics().setUserId(userId ?? '');
  } catch { /* ignore */ }
}

/**
 * Add a non-error breadcrumb for key app events.
 * Breadcrumbs appear in Crashlytics alongside the next recorded crash.
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
): void {
  try {
    void crashlytics().log(data ? `${message} ${JSON.stringify(data)}` : message);
  } catch { /* ignore */ }
}
