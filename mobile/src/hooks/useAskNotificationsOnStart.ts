import { useEffect } from 'react';
import { askNotificationPermissionOnce } from '../services/localNotifications';

/** Long enough for the map to draw first, so the system dialog never pops up
 * over a blank screen. */
const ASK_DELAY_MS = 1500;

/**
 * Asks for notification permission once per install, shortly after the app
 * opens (user, 2026-10-22: "ask for notif when started"). Mounted by
 * MainTabs, which only appears once the user is past the splash. A second
 * launch does nothing: the "asked" flag lives in utils/storage.ts.
 */
export function useAskNotificationsOnStart(): void {
  useEffect(() => {
    const id = setTimeout(() => { void askNotificationPermissionOnce(); }, ASK_DELAY_MS);
    return () => clearTimeout(id);
  }, []);
}
