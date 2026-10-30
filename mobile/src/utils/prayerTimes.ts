import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import type { Coords } from './location';

export interface NextPrayer { name: string; time: Date }

const PRAYER_LABEL: Record<string, string> = {
  fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
};

/**
 * Pure: takes a coordinate the caller already resolved (see
 * utils/location.ts), never asks for permission or GPS itself, so a screen
 * needing both prayer times and the qibla bearing (utils/qibla.ts) fetches
 * location once and derives both from it. Computed entirely on-device;
 * nothing here calls out to a server.
 */
export function nextPrayerFromCoords(coords: Coords, now: Date = new Date()): NextPrayer | null {
  const params = CalculationMethod.MuslimWorldLeague();
  const coordinates = new Coordinates(coords.latitude, coords.longitude);
  let times = new PrayerTimes(coordinates, now, params);
  let key = times.nextPrayer(now);
  if (key === 'none') {
    // Past tonight's Isha: tomorrow's Fajr is next.
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    times = new PrayerTimes(coordinates, tomorrow, params);
    key = 'fajr';
  }
  const time = times.timeForPrayer(key);
  if (!time) return null;
  return { name: PRAYER_LABEL[key] ?? key, time };
}

export function formatPrayerTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Which prayer period it is right now (for the hero card's "Fajar"-style
 * pill) -- "none" (adhan's answer before today's Fajr) is still last night's
 * Isha period, not a gap, so it's folded into that label rather than shown
 * as a blank/placeholder state. */
export function currentPrayerFromCoords(coords: Coords, now: Date = new Date()): string {
  const params = CalculationMethod.MuslimWorldLeague();
  const coordinates = new Coordinates(coords.latitude, coords.longitude);
  const times = new PrayerTimes(coordinates, now, params);
  const key = times.currentPrayer(now);
  const resolved = key === 'none' ? 'isha' : key;
  return PRAYER_LABEL[resolved] ?? resolved;
}
