import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { connectivity } from '../store/connectivityStore';
import { addBreadcrumb } from './crashReporter';

/**
 * The single writer of connectivityStore.isDeviceOffline.
 *
 * Why the OS and not an HTTP probe: asking netinfo costs no request, so there
 * is no timeout to lose a race against and our own backend's cold-start
 * latency cannot make a connected device look offline. It also pushes an
 * event the instant the radio state changes, so the banner clears itself the
 * moment WiFi comes back. The old boolean could not do that for a guest or
 * unverified user, because the only code that cleared it was refreshLearning,
 * gated behind email_verified.
 *
 * Deliberately NOT configured with our own /health as reachabilityUrl. That
 * would recreate the exact bug this replaces, just inside the library: a
 * cold-starting serverless function would again decide whether the user is
 * "offline". No internet probe is used at all any more (see isOffline): only
 * the OS's own "is there a network" answer drives the banner. Our /health
 * still runs, from SplashScreen, for its real job: warming the serverless
 * instance.
 */

// Offline means the OS reports no network at all (no WiFi, no cellular,
// airplane mode). isInternetReachable is deliberately NOT read: on iOS
// netinfo has no native reachability, so it comes only from a JS HEAD probe
// to clients3.google.com, and one failed or slow probe (an ad blocker, a DNS
// filter, Private Relay, a probe cut off by backgrounding) kept "You're
// offline" up on a phone with working internet while every API call
// succeeded (reported 2026-10-12). "Has a network but can't reach us" is
// covered by connectivityStore.isServerUnreachable, set from real API calls.
// isConnected is `boolean | null`; null ("not determined yet", normal for the
// first event) must not read as offline, so only an explicit false counts.
function isOffline(state: NetInfoState): boolean {
  if (state.type === 'none') return true;
  return state.isConnected === false;
}

/** Human-readable connection quality, for breadcrumbs on network-shaped crashes. */
export function describeConnection(state: NetInfoState): string {
  if (state.type === 'wifi') {
    // `strength` (0–100) is Android-only: iOS does not expose WiFi RSSI to
    // apps, so it is undefined there and the type is left off the output.
    const strength = (state.details as { strength?: number | null })?.strength;
    return strength == null ? 'wifi' : `wifi ${strength}%`;
  }
  if (state.type === 'cellular') {
    return `cellular ${state.details?.cellularGeneration ?? 'unknown'}`;
  }
  return state.type;
}

let unsubscribe: (() => void) | null = null;

/**
 * Start watching. Called once from App.tsx. Idempotent: a second call is a
 * no-op rather than a second subscription, so a Fast Refresh in dev cannot
 * stack listeners.
 *
 * Never throws. netinfo is a native module, and React Native's NativeModules
 * proxy throws on access when the native side did not link — which is exactly
 * the failure mode this app has already seen in the wild with SoLoader on
 * emulator installs. This runs in a useEffect at the top of the tree, so an
 * exception here would take the whole app to the ErrorBoundary screen on
 * launch. An informational banner is never worth that: if the module is
 * unavailable we simply never report the device as offline, and the app
 * behaves exactly as it did before this module existed.
 */
export function startConnectivityWatch(): void {
  if (unsubscribe) return;

  try {
    unsubscribe = subscribe();
  } catch (e) {
    unsubscribe = null;
    addBreadcrumb('connectivity: netinfo unavailable, connectivity watch disabled', {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

function subscribe(): () => void {
  // isOffline() no longer reads isInternetReachable, so the Google probe
  // would only cost a request a minute (every 5s while failing) for nothing.
  // Must be configured before the first listener is added.
  NetInfo.configure({ reachabilityShouldRun: () => false });
  return NetInfo.addEventListener(state => {
    const offline = isOffline(state);
    const was = connectivity.isDeviceOffline();
    connectivity.setDeviceOffline(offline);

    if (offline !== was) {
      addBreadcrumb(`connectivity: ${offline ? 'offline' : 'online'}`, {
        connection: describeConnection(state),
        type: state.type,
        is_internet_reachable: String(state.isInternetReachable),
      });
    }

    // Coming back online makes the last "couldn't reach the server" verdict
    // stale: it was almost certainly a symptom of being offline, and leaving
    // it set would keep a banner up on a device that now has a network. The
    // next failing request re-sets it if the backend really is down.
    if (!offline && was) connectivity.setServerUnreachable(false);
  });
}

/**
 * Mirrors startConnectivityWatch. Also never throws: this is an effect
 * cleanup, and the reference must be dropped even if the native unsubscribe
 * fails, or a restart could never re-subscribe.
 */
export function stopConnectivityWatch(): void {
  try {
    unsubscribe?.();
  } catch {
    // Nothing useful to do, and the finally below is what actually matters.
  } finally {
    unsubscribe = null;
  }
}

/**
 * One-shot check, for the rare caller that needs an answer before the
 * listener has delivered its first event. Never throws.
 */
export async function fetchIsDeviceOffline(): Promise<boolean> {
  try {
    return isOffline(await NetInfo.fetch());
  } catch {
    // Treat an unavailable native module as "assume online" rather than
    // blocking the user behind a banner we can't substantiate.
    return false;
  }
}
