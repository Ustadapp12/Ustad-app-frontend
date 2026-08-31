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
import { Platform } from 'react-native';
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

/**
 * Swallow a Crashlytics promise rejection.
 *
 * The native methods below return promises. A bare `void p` inside a
 * try/catch does NOT catch an async rejection — the try block exits the
 * moment the promise is created, so a rejected one escaped as an unhandled
 * rejection. That is especially bad here: initCrashReporting installs a
 * global error handler, so a failing crash reporter could feed its own
 * failures back into itself. Attaching a real no-op catch is the fix.
 */
function ignore(p: unknown): void {
  if (p && typeof (p as Promise<unknown>).catch === 'function') {
    void (p as Promise<unknown>).catch(() => {});
  }
}

/** Wire up global JS-error capture and enable collection outside dev. Call once at startup. */
export function initCrashReporting(): void {
  try {
    ignore(crashlytics().setCrashlyticsCollectionEnabled(!__DEV__));
  } catch { /* Crashlytics native module not available (e.g. Expo Go) */ }

  try {
    const defaultHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      captureError(error, { isFatal: !!isFatal });
      defaultHandler(error, isFatal);
    });
  } catch { /* ignore */ }

  // A rejected Promise with no .catch never reaches the ErrorUtils handler
  // above — RN only routes THROWN errors there, not rejections. Without
  // this, any failure inside an async function whose caller forgot to catch
  // it (an easy mistake — see how many call sites use `void someAsyncFn()`
  // throughout this app) simply vanishes: no Crashlytics record, nothing.
  //
  // This app runs Hermes (hermesEnabled=true), whose `global.Promise` is
  // Hermes's own native implementation — NOT the `promise` npm package's.
  // RN's InitializeCore.js (Libraries/Core/polyfillPromise.js) only calls
  // `global.HermesInternal.enablePromiseRejectionTracker(...)` when
  // `__DEV__` is true, specifically to drive the dev-mode "Possible
  // Unhandled Promise Rejection" warning — so today a release build has NO
  // rejection tracking at all. Calling the same Hermes hook here,
  // unconditionally, with RN's own default options
  // (promiseRejectionTrackingOptions — which already funnels into
  // ExceptionsManager.handleException, i.e. the same ErrorUtils path
  // wired to captureError above) extends that exact behavior into release
  // instead of reimplementing it. The `promise` package fallback mirrors
  // polyfillPromise.js's own non-Hermes branch, for a JSC build.
  try {
    if (typeof (global as any).HermesInternal?.hasPromise?.() === 'boolean'
      && (global as any).HermesInternal.hasPromise()) {
      (global as any).HermesInternal.enablePromiseRejectionTracker?.(
        require('react-native/Libraries/promiseRejectionTrackingOptions').default,
      );
    } else {
      require('promise/setimmediate/rejection-tracking').enable({
        allRejections: true,
        onUnhandled: (id: number, error: unknown) => {
          captureError(error, { where: 'unhandledPromiseRejection', rejectionId: id });
        },
        onHandled: () => { /* resolved late — nothing to report */ },
      });
    }
  } catch { /* ignore — tracker unavailable, e.g. in a test environment */ }

  // Static build/device context, attached once so it rides along with every
  // report from this session — including a native (NDK) crash, which shares
  // the same Crashlytics session log as these JS-side attributes/breadcrumbs.
  // Not previously set at all: a report had no OS version, no indication of
  // Hermes vs JSC, nothing to tell one device's crash from another's without
  // cross-referencing Play Console separately.
  try {
    ignore(crashlytics().setAttributes({
      os: Platform.OS,
      os_version: String(Platform.Version),
      js_engine: typeof (global as any).HermesInternal !== 'undefined' ? 'hermes' : 'jsc',
      fabric: typeof (global as any).nativeFabricUIManager !== 'undefined' ? 'true' : 'false',
    }));
  } catch { /* ignore */ }
}

/**
 * Update the lesson context attached to all subsequent Crashlytics reports.
 * Call when entering a lesson, on each exercise step, and when leaving.
 */
export function setCrashContext(partial: Partial<LessonContext>): void {
  _ctx = { ..._ctx, ...partial };
  try {
    ignore(crashlytics().setAttributes(toAttributes(_ctx as Record<string, unknown>)));
  } catch { /* Crashlytics may not be ready yet */ }
}

/** Clear lesson context — call when the user exits the lesson flow. */
export function clearCrashContext(): void {
  _ctx = {};
  try {
    ignore(crashlytics().setAttributes({ screen: '', exercise_type: '', surah_id: '' }));
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
    if (extras) ignore(crashlytics().setAttributes(toAttributes(extras)));
    ignore(crashlytics().recordError(error instanceof Error ? error : new Error(String(error))));
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
    ignore(crashlytics().setUserId(userId ?? ''));
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
    ignore(crashlytics().log(data ? `${message} ${JSON.stringify(data)}` : message));
  } catch { /* ignore */ }
}
