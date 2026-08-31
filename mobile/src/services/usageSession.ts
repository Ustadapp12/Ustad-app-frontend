/**
 * App-usage session envelope — one row per foreground-to-background session,
 * written to Postgres via usageApi (see app/usage/router.py on the backend).
 * Distinct from a lesson session (store/lessonStore.ts): this tracks time
 * spent in the app overall, not inside a specific lesson. Wired from
 * App.tsx's existing AppState listener — a session starts once a user is
 * known and ends only after the same 60s "really backgrounded" grace period
 * that already governs lesson-abandon, so a quick app-switcher glance or a
 * permission dialog doesn't fragment one sitting into several rows.
 */
import { Platform } from 'react-native';
import { usageApi } from '../api';
import { getLastScreens } from './screenHistory';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: APP_VERSION } = require('../../package.json') as { version: string };

let activeSessionId: string | null = null;
let starting: Promise<void> | null = null;

export type EntryMethod = 'login' | 'register' | 'guest' | 'guest_upgrade' | 'google_login' | 'google_signup' | 'resume';

// Sessions are started by a generic useAuthStore.subscribe() listener in
// App.tsx (any user becoming truthy), not by each auth method directly — so
// there's no way to tell which of the 5 auth flows caused it from inside
// startUsageSession() itself. authStore stashes the real method here right
// before it fires; a plain background→active resume never calls the setter,
// so it correctly falls through to 'resume'.
let pendingEntryMethod: EntryMethod = 'resume';

export function setPendingEntryMethod(method: EntryMethod): void {
  pendingEntryMethod = method;
}

export async function startUsageSession(): Promise<void> {
  if (activeSessionId) return;
  if (starting) { await starting; return; }
  const entryMethod = pendingEntryMethod;
  pendingEntryMethod = 'resume';
  starting = (async () => {
    try {
      const { session_id } = await usageApi.startSession({
        platform: Platform.OS,
        app_version: APP_VERSION,
        os_version: String(Platform.Version),
        entry_method: entryMethod,
      });
      activeSessionId = session_id;
    } catch {
      // Best-effort — a failed session start shouldn't block app usage.
    }
  })();
  await starting;
  starting = null;
}

export async function endUsageSession(): Promise<void> {
  const id = activeSessionId;
  if (!id) return;
  activeSessionId = null;
  try {
    await usageApi.endSession(id, getLastScreens());
  } catch {
    // Best-effort — losing one session's duration isn't worth surfacing.
  }
}
