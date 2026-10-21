import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

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

// Last successfully resolved fix this app run, for callers that must never
// themselves trigger a permission prompt or a fresh GPS read (startUsageSession
// in particular -- sessions start on login/register/guest/hydrate, often
// before the user has seen the Pray tab at all). Same in-memory-only pattern
// as services/usageSession.ts's activeSessionId: module-level, not persisted,
// cleared on app restart.
let lastKnownCoords: Coords | null = null;

/** Resolves to null on denied permission or an unreadable fix -- callers
 * must treat that as "feature unavailable", never fall back to a guess. */
export async function getCurrentCoordinates(): Promise<Coords | null> {
  const allowed = await ensureLocationPermission();
  if (!allowed) return null;
  const coords = await new Promise<Coords | null>(resolve => {
    Geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  });
  if (coords) lastKnownCoords = coords;
  return coords;
}

/** The last fix getCurrentCoordinates() resolved this app run, or null.
 * Never requests permission or reads the GPS itself -- purely a cache read. */
export function getLastKnownCoordinates(): Coords | null {
  return lastKnownCoords;
}
