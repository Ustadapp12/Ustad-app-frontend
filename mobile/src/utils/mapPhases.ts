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
// A second grouping ON TOP of seasons: the Map screen lays out and mounts
// exactly one chapter at a time instead of the whole 21-surah journey.
//
// This is a rendering/pacing window, NOT an access gate — seasons keep their
// own unlock rules (see isSeasonUnlocked in MapScreen) and the user can page
// freely in both directions. The point is that a full 7-season map is
// ~21,800dp tall (~57,000 physical px) and mounts ~250 view subtrees at once;
// a 3-season chapter is roughly a third of that, and it saves the user from
// scrolling the entire journey to reach where they left off.
//
// The grouping is by SEASON, not surah, so a chapter boundary can never fall
// mid-season and split a season's gate away from the surahs it unlocks.
export const SEASONS_PER_CHAPTER = 3;

// Season indices per chapter, 0-indexed: [[0,1,2],[3,4,5],[6]] for 7 seasons.
// The last chapter is short whenever PHASE_SIZES.length isn't a multiple of
// SEASONS_PER_CHAPTER — that's fine, and it fills in as seasons are added.
export const CHAPTER_SEASONS: number[][] = (() => {
  const out: number[][] = [];
  for (let i = 0; i < PHASE_SIZES.length; i += SEASONS_PER_CHAPTER) {
    out.push(
      Array.from(
        { length: Math.min(SEASONS_PER_CHAPTER, PHASE_SIZES.length - i) },
        (_, k) => i + k,
      ),
    );
  }
  return out;
})();

export const CHAPTER_COUNT = CHAPTER_SEASONS.length;

export function chapterOfSeason(seasonIdx: number): number {
  return Math.max(0, Math.min(CHAPTER_COUNT - 1, Math.floor(seasonIdx / SEASONS_PER_CHAPTER)));
}

// Human label for a chapter's season span, 1-indexed to match the signs the
// user actually sees on the map ("Seasons 1-3", or just "Season 7" alone).
export function chapterSeasonLabel(chapterIdx: number): string {
  const seasons = CHAPTER_SEASONS[chapterIdx] ?? [];
  if (seasons.length === 0) return '';
  const first = seasons[0] + 1;
  const last = seasons[seasons.length - 1] + 1;
  return first === last ? `Season ${first}` : `Seasons ${first}-${last}`;
}
