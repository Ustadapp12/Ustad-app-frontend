import { create } from 'zustand';

/**
 * Connectivity state, kept deliberately separate from authStore.
 *
 * This replaces authStore's old single `isOffline` boolean, which had five
 * write sites across three uncoordinated call paths (SplashScreen's 5s
 * healthCheck, hydrate() on 30s, refreshLearning() on 30s behind a 60s gate)
 * and no ordering between them. A Vercel cold start slower than 5s made the
 * health check report "offline" while hydrate() reached the same backend fine
 * a moment later; whichever promise settled last won, so a cold start
 * reliably left the banner stuck on a working app.
 *
 * The fix is two flags with exactly one owner each, instead of one flag with
 * five:
 *
 *   isDeviceOffline     written ONLY by services/connectivity.ts, from the OS
 *                       via netinfo. No HTTP request, so nothing to race and
 *                       nothing our own backend's latency can influence.
 *
 *   isServerUnreachable written ONLY by api/client.ts, and only for
 *                       ApiError.status === 0, which that module reserves for
 *                       "no HTTP response arrived at all" (DNS, TLS,
 *                       connection refused, our own timeout). A real server
 *                       error carries its real status and sets neither flag.
 *
 * The third case the old boolean swallowed — the server answered, but with a
 * 500/503/404, or a 200 whose body wasn't valid JSON — is not a connectivity
 * problem and no longer raises a connectivity banner. Those surface through
 * the normal per-call error paths they always did.
 */
interface ConnectivityState {
  /** No network at all: airplane mode, no signal, no route. From the OS. */
  isDeviceOffline: boolean;
  /** Device has a network, but our backend didn't answer. */
  isServerUnreachable: boolean;
  /** Called by services/connectivity.ts only. */
  setDeviceOffline: (offline: boolean) => void;
  /** Called by api/client.ts only. */
  setServerUnreachable: (unreachable: boolean) => void;
}

export const useConnectivityStore = create<ConnectivityState>(set => ({
  // Both default to false (optimistic). netinfo's first event lands within a
  // tick of startConnectivityWatch(), and a genuinely offline launch is
  // corrected the moment it does. Defaulting to "offline" instead would flash
  // the banner on every healthy cold start, which is the bug this replaces.
  isDeviceOffline: false,
  isServerUnreachable: false,

  setDeviceOffline: offline =>
    set(s => (s.isDeviceOffline === offline ? s : { isDeviceOffline: offline })),

  setServerUnreachable: unreachable =>
    set(s => (s.isServerUnreachable === unreachable ? s : { isServerUnreachable: unreachable })),
}));

/**
 * Non-reactive readers, for the api/service layer where there's no component
 * to subscribe. Screens should use the hook with a selector instead.
 */
export const connectivity = {
  isDeviceOffline: () => useConnectivityStore.getState().isDeviceOffline,
  isServerUnreachable: () => useConnectivityStore.getState().isServerUnreachable,
  setServerUnreachable: (unreachable: boolean) =>
    useConnectivityStore.getState().setServerUnreachable(unreachable),
  setDeviceOffline: (offline: boolean) =>
    useConnectivityStore.getState().setDeviceOffline(offline),
};
