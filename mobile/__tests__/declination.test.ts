import { trueHeadingFromMagnetic } from '../src/utils/declination';

// Reference declination values are NOAA's own WMM check points, shipped
// inside the geomagnetism package as test/values.csv (verified directly
// against that file, 2026-10-21) -- not hand-rolled approximations. Dates
// are reconstructed the same way that package's own test harness does
// (fractional year -> ms offset from Jan 1 UTC), which reproduces each
// row's declination to within ~0.01 degrees -- comfortably inside the 0.1
// degree tolerance used below.
const MS_PER_WMM_YEAR = 365 * 24 * 3600 * 1000;
function dateForFractionalYear(year: number): Date {
  const yearInt = Math.floor(year);
  const fraction = year - yearInt;
  return new Date(Date.UTC(yearInt, 0, 1) + fraction * MS_PER_WMM_YEAR);
}

describe('trueHeadingFromMagnetic', () => {
  it('matches NOAA WMM reference declination (2015.0, lat 80 lon 0 -> decl -3.85, west)', () => {
    const date = dateForFractionalYear(2015.0);
    const result = trueHeadingFromMagnetic(100, { latitude: 80, longitude: 0 }, date);
    // true = magnetic + decl = 100 + (-3.85) = 96.15
    expect(result).toBeCloseTo(96.15, 1);
  });

  it('matches NOAA WMM reference declination (2017.5, lat 0 lon 120 -> decl +0.32, east)', () => {
    const date = dateForFractionalYear(2017.5);
    const result = trueHeadingFromMagnetic(200, { latitude: 0, longitude: 120 }, date);
    // true = magnetic + decl = 200 + 0.32 = 200.32
    expect(result).toBeCloseTo(200.32, 1);
  });

  it('matches NOAA WMM reference declination (2015.21096, lat 44.5364 lon -109.0461 -> decl +11.08386, east)', () => {
    const date = dateForFractionalYear(2015.21096);
    const result = trueHeadingFromMagnetic(0, { latitude: 44.5364, longitude: -109.0461 }, date);
    expect(result).toBeCloseTo(11.08, 1);
  });

  it('a positive (east) declination rotates the true heading forward of magnetic', () => {
    const date = dateForFractionalYear(2017.5);
    const coords = { latitude: 0, longitude: 120 }; // decl +0.32, east
    const result = trueHeadingFromMagnetic(50, coords, date);
    expect(result).toBeGreaterThan(50);
  });

  it('a negative (west) declination rotates the true heading behind magnetic', () => {
    const date = dateForFractionalYear(2015.0);
    const coords = { latitude: 80, longitude: 0 }; // decl -3.85, west
    const result = trueHeadingFromMagnetic(50, coords, date);
    expect(result).toBeLessThan(50);
  });

  it('wraps a heading that would exceed 360 back into 0-360', () => {
    const date = dateForFractionalYear(2017.5);
    const coords = { latitude: 0, longitude: 120 }; // decl +0.32, east
    const result = trueHeadingFromMagnetic(359.9, coords, date);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(1);
  });

  it('wraps a heading that would go below 0 back into 0-360', () => {
    const date = dateForFractionalYear(2015.0);
    const coords = { latitude: 80, longitude: 0 }; // decl -3.85, west
    // 1 + (-3.85) = -2.85, which must wrap to just under 360, not go negative.
    const result = trueHeadingFromMagnetic(1, coords, date);
    expect(result).toBeCloseTo(357.15, 1);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(360);
  });

  it('defaults to the current date when none is passed', () => {
    const result = trueHeadingFromMagnetic(10, { latitude: 31.5, longitude: 74.3 });
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(360);
  });
});
