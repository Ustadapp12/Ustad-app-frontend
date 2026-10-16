/**
 * Groups the surah list into "seasons" for the Map screen — a fetch-batching
 * and sign-placement rhythm, NOT an access gate. Every surah is open from the
 * start (see isSeasonUnlocked in MapScreen); a season's only remaining jobs
 * are batching first-level fetches 3 surahs at a time and deciding where the
 * decorative season signs land.
 *
 * This used to be a fixed-length list of sizes, which silently dumped every
 * surah past the 21st into one giant trailing season once the curriculum grew
 * past Juz Amma. It now chunks the whole list at a constant size, so 21 surahs
 * still produce the same 7 seasons they always did and 114 produce 38.
 */

export const PHASE_SIZE = 3;

export function groupIntoPhases<T>(items: T[]): T[][] {
  const phases: T[][] = [];
  for (let i = 0; i < items.length; i += PHASE_SIZE) {
    phases.push(items.slice(i, i + PHASE_SIZE));
  }
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
// are unaffected and still exported above — though they no longer gate
// anything either: every surah is open from the start, and a season is now
// purely a fetch batch plus where the decorative signs sit.
