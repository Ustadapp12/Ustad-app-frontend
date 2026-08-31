/**
 * Groups the MVP surah list into "seasons" for the Map screen so we only
 * proactively fetch/render the first phase up front and lazy-load the rest.
 * Sizes are content pacing, not an access gate — every surah stays reachable
 * even before its phase has been proactively fetched (see MapScreen).
 */

export const PHASE_SIZES = [3, 3, 3, 3, 3, 3, 3];

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

// ── Chapters ───────────────────────────────────────────────────────
// Chapters used to be a season-aligned grouping (3 seasons/chapter, never
// splitting a season across a chapter boundary). That's gone — a chapter is
// now a fixed NODE COUNT (see NODES_PER_CHAPTER in MapScreen.tsx), cut
// wherever that count lands regardless of surah/season boundaries, so every
// chapter lays out (and its grass/road tiles decode) at the same size
// instead of the wildly uneven per-chapter node counts season-alignment
// produced (chapter 1 vs chapter 2 differed by 50%+ purely from how heavy
// the seasons inside each happened to be). Chapter slicing now lives
// entirely in MapScreen.tsx (it needs per-level data — SECTIONS_DEF/
// buildLevelsWithReviews — that isn't available here). Seasons themselves
// are unaffected and still exported above: they're still the real unlock
// unit (isSeasonUnlocked in MapScreen), just no longer tied to chapter
// rendering boundaries.
