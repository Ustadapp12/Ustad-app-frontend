import { getCurrentCoordinates, type Coords } from '../../utils/location';
import { nextPrayerFromCoords, currentPrayerFromCoords, type NextPrayer } from '../../utils/prayerTimes';
import { qiblaBearingFromCoords } from '../../utils/qibla';
import { usersApi } from '../../api';

export interface PrayerData { coords: Coords | null; next: NextPrayer | null; current: string | null; qibla: number | null }

/** Exported separately from the component so it's testable as a plain async
 * function, matching this repo's existing test style (no component-render
 * harness is set up here) -- see __tests__/prayScreen.test.ts. Carries
 * `coords` back out (not just the derived fields) so the component can
 * cache it and re-derive next/current locally as time passes, instead of
 * re-reading the GPS on every tick -- see PrayScreen's recompute(). Moved out of PrayScreen.tsx
 * (2026-10-22) so the screen doesn't call the API itself. */
export async function loadPrayerData(): Promise<PrayerData> {
  const coords = await getCurrentCoordinates();
  if (!coords) return { coords: null, next: null, current: null, qibla: null };
  // Mid-session GPS refresh: independent of session start/end, fires every
  // time this tab gets a fresh fix. Best-effort -- never blocks or affects
  // what's shown.
  usersApi.updateLocation(coords.latitude, coords.longitude).catch(() => undefined);
  return {
    coords,
    next: nextPrayerFromCoords(coords),
    current: currentPrayerFromCoords(coords),
    qibla: qiblaBearingFromCoords(coords),
  };
}
