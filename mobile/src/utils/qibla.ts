import { Coordinates, Qibla } from 'adhan';
import type { Coords } from './location';

/** Bearing from true north to the Kaaba, in degrees (0-360), for this
 * coordinate. Pure, on-device -- see utils/prayerTimes.ts's sibling note. */
export function qiblaBearingFromCoords(coords: Coords): number {
  return Qibla(new Coordinates(coords.latitude, coords.longitude));
}
