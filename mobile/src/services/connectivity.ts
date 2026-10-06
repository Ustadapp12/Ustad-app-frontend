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
 * "offline". netinfo's default probe is a tiny always-warm endpoint, which is
 * the right instrument for "does this device have internet", and on Android
 * useNativeReachability (default true) means the OS answers and no URL is
 * called at all. Our /health still runs, from SplashScreen, for its real job:
 * warming the serverless instance.
 */

// isInternetReachable is `boolean | null` — null means "not determined yet",
// which is normal for the first event or two and must not be read as offline.
// Only treat the device as offline on an explicit negative.
function isOffline(state: NetInfoState): boolean {
  if (state.type === 'none') return true;
  return state.isInternetReachable === false;
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
