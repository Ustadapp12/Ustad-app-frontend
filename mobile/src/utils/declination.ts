import { model } from 'geomagnetism';
import type { Coords } from './location';

/**
 * react-native-compass-heading reports MAGNETIC heading on both platforms --
 * confirmed by reading its native source directly (2026-10-21): iOS uses
 * CLHeading.magneticHeading (not .trueHeading), Android reads the raw
 * rotation-vector azimuth with no GeomagneticField correction. utils/
 * qibla.ts's bearing is relative to TRUE north (that's what adhan's
 * Qibla() computes), so comparing the two directly is off by the local
 * magnetic declination everywhere it isn't ~0.
 *
 * `geomagnetism` is a pure-JS port of NOAA's World Magnetic Model (no
 * native code, no fs/Buffer use at runtime -- its coefficient tables are
 * plain JSON requires), so this one correction covers both platforms
 * instead of patching each native module separately. Declination is
 * reported east-positive/west-negative (WMM/NOAA convention, verified
 * against the library's own NOAA reference test vectors), and true
 * heading = magnetic heading + declination.
 */
export function trueHeadingFromMagnetic(magneticHeading: number, coords: Coords, date: Date = new Date()): number {
  // allowOutOfBoundsModel: the shipped WMM tables only cover a date range
  // (currently through 2029); falling back to the nearest model on a
  // wildly wrong device clock beats throwing and losing the compass.
  const info = model(date, { allowOutOfBoundsModel: true }).point([coords.latitude, coords.longitude]);
  return ((magneticHeading + info.decl) % 360 + 360) % 360;
}
