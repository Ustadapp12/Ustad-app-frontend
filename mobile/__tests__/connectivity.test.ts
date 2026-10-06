import NetInfo from '@react-native-community/netinfo';
import { useConnectivityStore, connectivity } from '../src/store/connectivityStore';
import {
  startConnectivityWatch,
  stopConnectivityWatch,
  fetchIsDeviceOffline,
  describeConnection,
} from '../src/services/connectivity';

const addEventListener = NetInfo.addEventListener as unknown as jest.Mock;
const fetchState = NetInfo.fetch as unknown as jest.Mock;

/** Hand the watcher a netinfo state and return what it wrote to the store. */
function emit(state: Record<string, unknown>): boolean {
  let listener: ((s: any) => void) | undefined;
  addEventListener.mockImplementation((l: (s: any) => void) => {
    listener = l;
    return jest.fn();
  });
  stopConnectivityWatch();
  startConnectivityWatch();
  listener?.(state);
  return useConnectivityStore.getState().isDeviceOffline;
}

beforeEach(() => {
  jest.clearAllMocks();
  stopConnectivityWatch();
  useConnectivityStore.setState({ isDeviceOffline: false, isServerUnreachable: false });
});

afterEach(() => stopConnectivityWatch());

describe('device-offline detection', () => {
  it('treats type "none" as offline', () => {
    expect(emit({ type: 'none', isConnected: false, isInternetReachable: false })).toBe(true);
  });

  it('treats an explicit isInternetReachable=false as offline', () => {
    // Connected to a WiFi network that has no route to the internet, e.g. a
    // captive portal.
    expect(emit({ type: 'wifi', isConnected: true, isInternetReachable: false, details: {} }))
      .toBe(true);
  });

  it('does NOT treat isInternetReachable=null as offline', () => {
    // null means "not determined yet", which is normal for the first event or
    // two. Reading it as offline would flash the banner on every cold start,
    // which is the class of bug this whole module replaces.
    expect(emit({ type: 'wifi', isConnected: true, isInternetReachable: null, details: {} }))
      .toBe(false);
  });

  it('is online on a healthy connection', () => {
    expect(emit({ type: 'wifi', isConnected: true, isInternetReachable: true, details: {} }))
      .toBe(false);
  });

  it('clears a stale server-unreachable verdict when the network returns', () => {
    emit({ type: 'none', isConnected: false, isInternetReachable: false });
    connectivity.setServerUnreachable(true);

    emit({ type: 'wifi', isConnected: true, isInternetReachable: true, details: {} });

    // Going offline is the likely cause of the unreachable verdict, so coming
    // back online must not leave a banner up on a device that now has a
    // network. A genuinely down backend re-sets it on the next request.
    expect(useConnectivityStore.getState().isServerUnreachable).toBe(false);
  });

  it('does not stack listeners when started twice', () => {
    startConnectivityWatch();
    startConnectivityWatch();
    expect(addEventListener).toHaveBeenCalledTimes(1);
  });
});

describe('fetchIsDeviceOffline', () => {
  it('reports offline when netinfo says there is no network', async () => {
    fetchState.mockResolvedValueOnce({ type: 'none', isInternetReachable: false });
    await expect(fetchIsDeviceOffline()).resolves.toBe(true);
  });

  it('assumes online if the native module throws', async () => {
    // Better to show nothing than to block the user behind a banner we can't
    // substantiate.
    fetchState.mockRejectedValueOnce(new Error('native module unavailable'));
    await expect(fetchIsDeviceOffline()).resolves.toBe(false);
  });
});

describe('describeConnection', () => {
  it('includes wifi strength when present (Android)', () => {
    expect(describeConnection({ type: 'wifi', details: { strength: 72 } } as any))
      .toBe('wifi 72%');
  });

  it('omits strength when absent (iOS exposes no RSSI)', () => {
    expect(describeConnection({ type: 'wifi', details: {} } as any)).toBe('wifi');
  });

  it('reports cellular generation', () => {
    expect(describeConnection({ type: 'cellular', details: { cellularGeneration: '4g' } } as any))
      .toBe('cellular 4g');
  });
});

describe('connectivityStore flags are independent', () => {
  it('keeps device-offline and server-unreachable separate', () => {
    connectivity.setServerUnreachable(true);
    expect(useConnectivityStore.getState().isServerUnreachable).toBe(true);
    // Our backend being unreachable says nothing about whether the device has
    // a network. Collapsing these two into one boolean is what produced the
    // original false "You're offline" on a working connection.
    expect(useConnectivityStore.getState().isDeviceOffline).toBe(false);
  });

  it('does not notify when a flag is set to its current value', () => {
    const seen: boolean[] = [];
    const unsub = useConnectivityStore.subscribe(s => seen.push(s.isDeviceOffline));
    connectivity.setDeviceOffline(false);
    connectivity.setDeviceOffline(false);
    unsub();
    expect(seen).toHaveLength(0);
  });
});
