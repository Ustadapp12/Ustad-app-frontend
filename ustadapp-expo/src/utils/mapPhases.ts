/**
 * Groups the MVP surah list into "seasons" for the Map screen so we only
 * proactively fetch/render the first phase up front and lazy-load the rest.
 * Sizes are content pacing, not an access gate — every surah stays reachable
 * even before its phase has been proactively fetched (see MapScreen).
 */

export const PHASE_SIZES = [3, 3, 1];

export function groupIntoPhases<T>(items: T[]): T[][] {
  const phases: T[][] = [];
  let i = 0;
  for (const size of PHASE_SIZES) {
    if (i >= items.length) break;
    phases.push(items.slice(i, i + size));
    i += size;
  }
  if (i < items.length) phases.push(items.slice(i));
  return phases;
}
