import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Coords { latitude: number; longitude: number }

// Shared by utils/prayerTimes.ts and utils/qibla.ts so both features reuse
// one permission prompt and one GPS fix instead of each asking separately.
// Android needs an explicit runtime request; iOS prompts off the
// NSLocationWhenInUseUsageDescription string in Info.plist the first time
// requestAuthorization/getCurrentPosition is called.
export async function ensureLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location for prayer times',
        message: 'UstadApp uses your location to calculate accurate prayer times and qibla direction for where you are.',
        buttonPositive: 'Allow',
        buttonNegative: 'Not now',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return new Promise(resolve => {
    Geolocation.requestAuthorization(() => resolve(true), () => resolve(false));
  });
}

// Last real fix, for callers that must never themselves trigger a permission
// prompt or a fresh GPS read (startUsageSession in particular -- sessions
// start on login/register/guest/hydrate, often before the user has seen the
// Pray tab at all). Also saved on the device, so the Pray tab can show
// prayer times instantly on a cold start instead of waiting for a new fix.
let lastKnownCoords: Coords | null = null;
const STORAGE_KEY = '@ustadapp/location/lastKnown';

/** Resolves to null on denied permission or an unreadable fix -- callers
 * must treat that as "feature unavailable", never fall back to a guess.
 * A denied permission also forgets the saved fix; a failed read keeps it. */
export async function getCurrentCoordinates(): Promise<Coords | null> {
  const allowed = await ensureLocationPermission();
  if (!allowed) {
    lastKnownCoords = null;
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
    return null;
  }
  const coords = await new Promise<Coords | null>(resolve => {
    Geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  });
  if (coords) {
    lastKnownCoords = coords;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(coords)).catch(() => undefined);
  }
  return coords;
}

/** The fix saved by a previous getCurrentCoordinates(), from this run or an
 * earlier one. No permission prompt, no GPS read. */
export async function loadSavedCoordinates(): Promise<Coords | null> {
  if (lastKnownCoords) return lastKnownCoords;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
      lastKnownCoords = { latitude: parsed.latitude, longitude: parsed.longitude };
    }
  } catch {
    // Unreadable storage just means no instant times; the live fix still runs.
  }
  return lastKnownCoords;
}

/** The last fix known to this app run (live, or loaded by
 * loadSavedCoordinates), or null. Never requests permission or reads the
 * GPS itself -- purely a cache read. */
export function getLastKnownCoordinates(): Coords | null {
  return lastKnownCoords;
}
