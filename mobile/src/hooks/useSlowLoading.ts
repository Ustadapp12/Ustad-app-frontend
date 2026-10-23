import { useEffect, useState } from 'react';
import { useConnectivityStore } from '../store/connectivityStore';

/** How long a load may run before it counts as slow. A healthy map load,
 * cold backend start included, normally finishes well inside this. */
export const SLOW_LOAD_MS = 10000;

/**
 * True when a load that is still running should show the "slow connection"
 * state (the sad Lumo loader) instead of the normal loading screen: the phone
 * has no network, our server isn't answering, or `loading` has lasted longer
 * than `afterMs`. False again as soon as `loading` ends.
 */
export function useSlowLoading(loading: boolean, afterMs = SLOW_LOAD_MS): boolean {
  const deviceOffline = useConnectivityStore(s => s.isDeviceOffline);
  const serverUnreachable = useConnectivityStore(s => s.isServerUnreachable);
  const [tooLong, setTooLong] = useState(false);

  useEffect(() => {
    setTooLong(false);
    if (!loading) return;
    const t = setTimeout(() => setTooLong(true), afterMs);
    return () => clearTimeout(t);
  }, [loading, afterMs]);

  return loading && (deviceOffline || serverUnreachable || tooLong);
}
