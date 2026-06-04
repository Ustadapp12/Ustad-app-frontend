/**
 * Firebase Analytics wrapper — no-ops when the native module is unavailable
 * (e.g. missing google-services.json / GoogleService-Info.plist).
 */
import { Platform } from 'react-native';

export const AnalyticsEvents = {
  LOGIN: 'login',
  SIGN_UP: 'sign_up',
  LESSON_START: 'lesson_start',
  LESSON_COMPLETE: 'lesson_complete',
  LESSON_ABANDON: 'lesson_abandon',
} as const;

type EventParams = Record<string, string | number | boolean | undefined>;

type AnalyticsFactory = typeof import('@react-native-firebase/analytics').default;

let analyticsModule: AnalyticsFactory | false | null = null;

function getAnalytics(): AnalyticsFactory | null {
  if (analyticsModule === false) return null;
  if (analyticsModule) return analyticsModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    analyticsModule = require('@react-native-firebase/analytics').default;
    return analyticsModule;
  } catch {
    analyticsModule = false;
    return null;
  }
}

function sanitizeParams(
  params?: EventParams,
): Record<string, string | number> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    out[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export async function initAnalytics(): Promise<void> {
  const analytics = getAnalytics();
  if (!analytics) return;
  try {
    await analytics().setAnalyticsCollectionEnabled(true);
    await analytics().logEvent('app_open', {
      platform: Platform.OS,
    });
  } catch {
    // Firebase not configured on this build
  }
}

export async function setAnalyticsUserId(userId: string | null): Promise<void> {
  const analytics = getAnalytics();
  if (!analytics) return;
  try {
    await analytics().setUserId(userId);
  } catch {
    // ignore
  }
}

export async function logAnalyticsEvent(
  name: string,
  params?: EventParams,
): Promise<void> {
  const analytics = getAnalytics();
  if (!analytics) return;
  try {
    await analytics().logEvent(name, sanitizeParams(params));
  } catch {
    // ignore
  }
}

export async function logScreenView(screenName: string): Promise<void> {
  const analytics = getAnalytics();
  if (!analytics) return;
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch {
    // ignore
  }
}
