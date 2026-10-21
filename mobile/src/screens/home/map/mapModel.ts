import { Image, type ImageSourcePropType } from 'react-native';
import { captureError } from '../../../services/crashReporter';
import { groupIntoPhases } from '../../../utils/mapPhases';
import { ALL_SURAHS } from '../../../data/allSurahs';
import type { SurahLevel } from '../../../types/api';

// Height of one background-Svg tile, in the same dp space as MAP_H. Splitting
// the map into fixed-height tiles (each its own <Svg>) exists because a
// single MAP_W×MAP_H Svg rasterizes into one Android bitmap, and Canvas has a
// hard ~100MB-per-bitmap ceiling (RecordingCanvas.throwIfCannotDraw) — a tall
// enough map blows past that outright ("Canvas: trying to draw too large
// bitmap", a native crash with no JS exception to catch). That risk is
// unrelated to how many tiles end up mounted at once.
//
// Tiles used to also be virtualized (only the ones near the viewport
// mounted), because at the old season-based map's max size (21 surahs,
// ~21800dp) that was 8 tiles / ~236MB resident if all mounted at once. That's
// gone now that a chapter is capped at NODES_PER_CHAPTER — MAP_H tops out
// around 2-3 tiles' worth regardless of how many surahs exist, which is the
// same amount virtualization already kept resident at steady state. So every
// tile for the current chapter just mounts up front now: no memory cost over
// what was already resident most of the time, and it removes the window where
// a tile scrolled into hadn't mounted yet — the "part of the map wasn't
// there" bug a slower device could hit mid-scroll.
export const SVG_BG_TILE_H = 3000;

// ── Asset refs (static, so Metro can bundle them) ──────────────────
export const BIRDS_SRC    = require('../../../../assets/screens/home/birds.png');
export const CLOUD_SRC    = require('../../../../assets/screens/home/clouds.png');
export const START_SRC    = require('../../../../assets/screens/home/start.png');
export const SCROLL_SRC   = require('../../../../assets/screens/home/map-legacy/scroll2.png');
// Chapter-paging signs — same wooden-signpost art as the season gates, one
// pointing forward ("NEXT STAGE") and one back ("PREVIOUS STAGE"), text baked
// into the art itself. Real aspect ratios (678x767 / 692x756) — close but not
// identical, so each keeps its own rather than sharing one constant.
export const NEXT_STAGE_SRC     = require('../../../../assets/screens/home/map-legacy/NEXT_STAGE.png');
export const PREVIOUS_STAGE_SRC = require('../../../../assets/screens/home/map-legacy/PREVIOUS_STAGE.png');
export const NEXT_STAGE_ASPECT     = 678 / 767;
export const PREVIOUS_STAGE_ASPECT = 692 / 756;
export const GRASS_SRC    = require('../../../../assets/screens/home/map-legacy/grass.jpg');
// Plain standing Lumo for the end-of-map sign-off. Same art the Daily Quest
// screen used before it moved to the reading pose.
export const END_LUMO_SRC = require('../../../../assets/shared/mascot/lumo_transparent.png');
// grass.jpg's own dominant colour, sampled from the file (mean is
// rgb(146,195,1), dominant rgb(136,200,8) — close enough that either works).
// Used wherever a flat fill has to sit flush against the tiled grass, i.e.
// the bottom overscroll strip. Deliberately NOT colors.mapBg: that is the
// gradient's bottom stop, which the grass completely covers, so matching it
// matches an invisible layer. One constant so the two can't drift apart.
export const GRASS_FALLBACK = '#88C808';
export const BRICK_SRC    = require('../../../../assets/screens/home/map-legacy/bricks.jpg');
// Pre-engraved signs — the season number is baked into the art itself, one
// file per season, keyed by season number (1-indexed, matching the label on
// the sign) rather than composed at runtime from a blank sign + overlaid text.
// Season 1 has no gate (it's unlocked from the start, see isSeasonUnlocked)
// so its sign is never actually rendered on a gate — kept in the map anyway
// since gate → sign lookup below falls back to it if a season is ever added
// without matching art. Every other gate renders the sign for the season it
// unlocks (unlocksSeasonIdx is 0-indexed — see the seasonGates render below).
export const SEASON_SIGN_SRCS: Record<number, ImageSourcePropType> = {
  1: require('../../../../assets/screens/home/map-legacy/s1.png'),
  2: require('../../../../assets/screens/home/map-legacy/s2.png'),
  3: require('../../../../assets/screens/home/map-legacy/s3.png'),
  4: require('../../../../assets/screens/home/map-legacy/s4.png'),
  5: require('../../../../assets/screens/home/map-legacy/s5.png'),
  6: require('../../../../assets/screens/home/map-legacy/s6.png'),
  7: require('../../../../assets/screens/home/map-legacy/s7.png'),
};
// Real aspect ratio of the sign art (186x326). All three files share it.
export const SEASON_GATE_ASPECT = 186 / 326;
export const SKY_SRC      = require('../../../../assets/screens/home/map-legacy/sky.jpg');
// Cropped so the art's bottom row is solid edge to edge, then that row is
// repeated MOUNTAINS_BASE_PAD_PX more rows down: a solid skirt that sits
// under the grass, so the mountain and grass always meet with no sky leak,
// whatever rounding a screen does. The silhouette above the grass is unchanged.
export const MOUNTAINS_SRC = require('../../../../assets/screens/home/map-legacy/mountains_crop.png');
export const MOUNTAINS_BASE_PAD_PX = 40;
export const { MOUNTAINS_ASPECT, MOUNTAINS_PAD_FRACTION } = (() => {
  const s = Image.resolveAssetSource(MOUNTAINS_SRC);
  return { MOUNTAINS_ASPECT: s.height / s.width, MOUNTAINS_PAD_FRACTION: MOUNTAINS_BASE_PAD_PX / s.height };
})();
export const NODE_SRCS = {
  locked: require('../../../../assets/screens/home/map-legacy/node_locked.png'),
  current: require('../../../../assets/screens/home/map-legacy/node_current.png'),
  completed: require('../../../../assets/screens/home/map-legacy/node_completed.png'),
  specialDone: require('../../../../assets/screens/home/map-legacy/special_done.png'),
  // Green + star — the art for EVERY reachable (unlocked, not yet
  // completed) special/review node, not just the backend's recommended-next
  // one. special.png used to fill that role, but it is byte-for-byte the
  // same file as node_current.png (a blank green tile with no star at all),
  // so an open review node rendered as an anonymous green blob — nothing
  // marked it as a review. It is no longer referenced anywhere.
  // Still never shown while locked: the star and the 🔒 badge overlap badly
  // on the same small node, so a locked special keeps node_current.png.
  recommendedSpecial: require('../../../../assets/screens/home/map-legacy/recommended_special.png'),
} as const;

// Rough heuristic for the loading overlay's progress bar (current-surah
// levels fetch + one batched phase-0 fetch, cache-first) — not a measured
// average, just a starting point. Tune from real timings once observed.
export const MAP_LOAD_ESTIMATE_MS = 1400;

// ── Types ─────────────────────────────────────────────────────────
// 'pending' = a surah's first level, not yet fetched from the backend. It's
// never actually locked server-side (no cross-surah gate exists), so it
// stays tappable — tapping fetches it on demand instead of blocking. Real
// 'locked' is reserved for non-first levels awaiting the previous level's
// completion, and is the only status that renders differently (lock icon).
export type NodeStatus = 'completed' | 'current' | 'available' | 'locked' | 'pending';

export interface SectionNode {
  id: string; x: number; y: number;
  status: NodeStatus; stars: number; levelNum: number;
  // This node's 0-based position within its OWN SURAH's full level sequence
  // (buildLevelsWithReviews' output order) — NOT its position within
  // section.nodes, which is only the slice of the surah that landed in the
  // CURRENT chapter (see CHAPTER_SLOTS: a surah can now split across a
  // chapter boundary). full/sorted backend level arrays are always the
  // surah's complete sequence in this same order, so this is the index that
  // actually lines a node up with its real backend group — a chapter-local
  // array position silently shifts once a surah spills into a second
  // chapter (confirmed live: Al-Ma'un 107 splits after g1 at the 30-node
  // chapter cut, which is what mislabeled its 2nd-chapter nodes).
  surahLevelIdx: number;
  startAyah?: number; endAyah?: number;
  resolved?: boolean;
  // Review level — interleaved one after every 2 normal levels (a trailing
  // odd normal level gets its own solo review), not appended once at the
  // end. Seeded from the static def (so it renders before backend data
  // resolves), overridden by the real `is_special` field once a level fetch
  // lands.
  isSpecial?: boolean;
}
export interface Section {
  surahNum: number; name: string; arabicName: string; ayahCount: number;
  nodes: SectionNode[];
}

// ── Section definitions — semantic data, NO pixel coordinates ─────
// To add a level: append to `levels[]` and `xFractions[]`.
// To add a surah: append a new entry. Layout recalculates automatically.
export interface SectionDef {
  surahNum: number; name: string; arabicName: string; ayahCount: number;
  levels: Array<{ id: string; levelNum: number; isSpecial?: boolean }>;
  xFractions: number[];  // x position of each level's node as fraction of map width
}

// Deterministic left/right zigzag fallback for surahs without a hand-tuned
// xFractions array (see the module note below `SECTIONS_DEF`) — same
// sine-hash trick the decoration placement code uses further down, kept
// local since this runs before that code is defined.
export function defaultXFractions(surahNum: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    const raw = Math.sin((surahNum * 100 + i + 1) * 12.9898) * 43758.5453;
    const frac = raw - Math.floor(raw);
    const base = i % 2 === 0 ? 0.62 : 0.28;
    return Math.round(Math.min(0.74, Math.max(0.20, base + (frac - 0.5) * 0.34)) * 100) / 100;
  });
}
// Deterministic x-position for a review node — same sine-hash technique as
// defaultXFractions, seeded off which normal group it follows (afterGroup)
// so it stays stable across renders without needing its own hand-tuned
// entry. Leans the opposite base side from defaultXFractions' own i%2 rule
// so a review doesn't default to the same side as the normal node right
// before it.
export function reviewXFraction(surahNum: number, afterGroup: number): number {
  const raw = Math.sin((surahNum * 100 + afterGroup * 7 + 53) * 12.9898) * 43758.5453;
  const frac = raw - Math.floor(raw);
  const base = afterGroup % 2 === 0 ? 0.28 : 0.62;
  return Math.round(Math.min(0.74, Math.max(0.20, base + (frac - 0.5) * 0.34)) * 100) / 100;
}
// Same sine-hash technique as defaultXFractions/reviewXFraction above, but
// keyed purely on a node's position WITHIN ITS CHAPTER (0-based) instead of
// surah/level identity. This is what makes the road's zigzag — and
// therefore MAP_H, tile boundaries, and the grass canvas built against it —
// come out identical in every chapter, so paging between chapters only ever
// changes which nodes sit on an otherwise-unchanged road, not the road
// itself. Replaces SectionDef.xFractions for actual rendering below — that
// field stays on the SectionDef/SECTIONS_DEF type (buildLevelsWithReviews
// still fills it in) but nothing reads it for node position anymore.
export function chapterXFraction(posInChapter: number): number {
  const raw = Math.sin((posInChapter * 37 + 11) * 12.9898) * 43758.5453;
  const frac = raw - Math.floor(raw);
  const base = posInChapter % 2 === 0 ? 0.62 : 0.28;
  return Math.round(Math.min(0.74, Math.max(0.20, base + (frac - 0.5) * 0.34)) * 100) / 100;
}
// CHUNK_SIZE=2 group builder — must match the backend's own lesson-group
// seeding exactly (see [[project-map-levels]] memory), or node count/ayah
// ranges on the map won't line up with real backend groups. Review nodes
// (backend's `is_special`) are now interleaved one after every 2 normal
// groups, with a trailing odd group getting its own solo review — not one
// appended at the end — matching the backend's own placement (see
// list_lesson_groups). Builds `levels` and `xFractions` together, not
// separately, so the two can never drift out of sync with each other as the
// interleave count changes per surah — `normalXFractions` must have exactly
// one entry per normal group (groupCount = ceil(ayahCount/2)); review
// x-positions are always hashed via reviewXFraction, never hand-tuned,
// since a surah can now have several.
export function buildLevelsWithReviews(
  surahNum: number, ayahCount: number, normalXFractions: number[],
): { levels: Array<{ id: string; levelNum: number; isSpecial?: boolean }>; xFractions: number[] } {
  const groupCount = Math.ceil(ayahCount / 2);
  const levels: Array<{ id: string; levelNum: number; isSpecial?: boolean }> = [];
  const xFractions: number[] = [];
  let reviewIdx = 0;
  for (let g = 1; g <= groupCount; g++) {
    levels.push({ id: `${surahNum}_g${g}`, levelNum: g });
    xFractions.push(normalXFractions[g - 1]);
    if (g % 2 === 0 || g === groupCount) {
      reviewIdx++;
      // levelNum carries the last normal group this review covers — an
      // even value means it paired that group with the one before it, an
      // odd value only ever occurs for the trailing solo case (g ===
      // groupCount with no even hit yet) — see estimateAyahRange, which
      // reads this same value back out.
      levels.push({ id: `${surahNum}_review${reviewIdx}`, levelNum: g, isSpecial: true });
      xFractions.push(reviewXFraction(surahNum, g));
    }
  }
  return { levels, xFractions };
}

// The whole Quran, top-to-bottom in descending surah order (114 → 1) — the
// same "shortest/most-memorised first" order the map has always used, simply
// carried past Juz Amma now that the backend serves every surah's content.
//
// Generated, not hand-written, and it has to be: a hand-typed entry per surah
// was viable at 21 but not at 114 (Al-Baqarah alone is ~143 groups). Nothing
// is lost by generating it — node x-positions come from chapterXFraction(),
// keyed purely on a node's slot within its chapter, so the road is identical
// in every chapter and a surah needs no layout data of its own. All a surah
// contributes is its name and ayah count, both of which the catalogue has.
// (SectionDef.xFractions is still filled in by buildLevelsWithReviews to
// satisfy the type, but nothing reads it for position — see chapterXFraction.)
//
// Deliberately ALL 114, with no notion here of what's playable: the map draws
// the whole Quran, and whether a given surah opens is answered by the backend
// at the moment it's tapped (see handleNodePress). Nothing in the app carries
// a list of what's ready, so none of this needs touching as content lands.
export const SECTIONS_DEF: SectionDef[] = [...ALL_SURAHS]
  .sort((a, b) => b.surah_number - a.surah_number)
  .map(s => ({
    surahNum: s.surah_number,
    name: s.name_en,
    arabicName: s.name_ar,
    ayahCount: s.ayah_count,
    ...buildLevelsWithReviews(
      s.surah_number,
      s.ayah_count,
      defaultXFractions(s.surah_number, Math.ceil(s.ayah_count / 2)),
    ),
  }));

// Seasons (phases) — pure loading/pacing grouping, not an access gate. Pure
// data derived from SECTIONS_DEF, so it doesn't depend on screen width.
export const PHASE_GROUPS: number[][] = groupIntoPhases(SECTIONS_DEF.map(d => d.surahNum));
// Phases double as "seasons" now — surah number -> season index (0,1,2).
export const SURAH_TO_SEASON: Record<number, number> = {};
PHASE_GROUPS.forEach((group, idx) => group.forEach(n => { SURAH_TO_SEASON[n] = idx; }));

// ── Chapters: the slice of the map that's actually laid out at one time ──
// A chapter is a fixed count of NODES (not surahs, not seasons) — cut
// wherever that count lands, splitting a surah or a season across the
// boundary if that's where the count runs out. buildMapModel below receives
// a chapter index and lays out only that chapter's slice, so MAP_H and the
// mounted node/pill/label count stay roughly the same size every chapter,
// which is also what keeps the grass/road tiles' decode risk uniform instead
// of concentrated in whichever chapter happened to be heaviest under the old
// season-aligned grouping.
//
// One deliberate exception (2026-09-20): the cut never lands such that a
// surah CONTINUING from the previous chapter opens the new one on a review
// node — see cutWouldOpenOnReview below. That would show the user a bare
// "review this" with none of its surah's preceding normal levels in view
// (e.g. surah 39's chapter 55 used to open on 39_review10 with nothing above
// it). A fresh surah's own opening chapter is never affected — surahLevelIdx
// 0 is always a normal level by construction (buildLevelsWithReviews always
// starts g1).
export const NODES_PER_CHAPTER = 30;

// Every level across every surah, in the same top-to-bottom order
// SECTIONS_DEF already defines, flattened past surah boundaries — this is
// the thing that actually gets cut into NODES_PER_CHAPTER-sized chapters.
export interface FlatLevel {
  surahNum: number; name: string; arabicName: string; ayahCount: number;
  level: { id: string; levelNum: number; isSpecial?: boolean };
  // 0-based position within def.levels — the surah's OWN full sequence,
  // computed here before any chapter-cutting happens, so it stays correct
  // (unlike a chapter-local array index) even when a surah later splits
  // across a chapter boundary. See SectionNode.surahLevelIdx.
  surahLevelIdx: number;
}
export const ALL_FLAT_LEVELS: FlatLevel[] = SECTIONS_DEF.flatMap(def =>
  def.levels.map((lvl, surahLevelIdx) => ({
    surahNum: def.surahNum, name: def.name, arabicName: def.arabicName, ayahCount: def.ayahCount, level: lvl, surahLevelIdx,
  })),
);

// A chapter's contents, in render order — a season-gate sign takes its OWN
// slot at the same NODE_GAP rhythm a level does (not squeezed into an
// existing gap between two levels), so it visually reads exactly like it
// used to. Built as one continuous walk across every surah (not per-chapter)
// so a gate always lands attached to the chapter holding the season's LAST
// level — even when that level happens to be a chapter's 30th — rather than
// ever becoming the first, parentless thing in the next chapter with no
// section above it to attach its sign to.
export type ChapterSlot =
  | { kind: 'level'; flat: FlatLevel }
  | { kind: 'gate'; unlocksSeasonIdx: number };
export const CHAPTER_SLOTS: ChapterSlot[][] = (() => {
  const chapters: ChapterSlot[][] = [[]];
  let levelCountInChapter = 0;
  let prevSeason: number | null = null;
  // Set for exactly one iteration right after a review has been deliberately
  // kept on the CLOSING chapter instead of letting it open the next one (see
  // cutWouldOpenOnReview below) — forces the very next level to start the new
  // chapter regardless of levelCountInChapter, since the closing chapter
  // already grew to 31 instead of 30.
  let forcedCutPending = false;
  for (const flat of ALL_FLAT_LEVELS) {
    const season = SURAH_TO_SEASON[flat.surahNum] ?? 0;
    if (prevSeason != null && season !== prevSeason) {
      chapters[chapters.length - 1].push({ kind: 'gate', unlocksSeasonIdx: season });
    }
    const naturalCut = levelCountInChapter >= NODES_PER_CHAPTER;
    // Would the natural 30-node cut make THIS level the new chapter's first
    // node, and is it a review continuing its surah from the chapter that's
    // closing? A surah's own opening level (surahLevelIdx 0) is always
    // normal by construction, so this only ever fires for a genuine
    // continuation, never a fresh surah start — see the NODES_PER_CHAPTER
    // comment above.
    const cutWouldOpenOnReview =
      naturalCut && !forcedCutPending && flat.surahLevelIdx > 0 && !!flat.level.isSpecial;
    if (cutWouldOpenOnReview) {
      // Keep this review on the closing chapter as an extra (31st) slot
      // instead, and defer the real cut to right after it. The level
      // immediately following a review is always normal — buildLevelsWithReviews
      // never emits two reviews back to back — so the forced cut below is
      // guaranteed to land on a normal node.
      chapters[chapters.length - 1].push({ kind: 'level', flat });
      levelCountInChapter++;
      prevSeason = season;
      forcedCutPending = true;
      continue;
    }
    if (naturalCut || forcedCutPending) {
      chapters.push([]);
      levelCountInChapter = 0;
      forcedCutPending = false;
    }
    chapters[chapters.length - 1].push({ kind: 'level', flat });
    levelCountInChapter++;
    prevSeason = season;
  }
  return chapters;
})();
export const CHAPTER_COUNT = CHAPTER_SLOTS.length;
// A trailing gate can occasionally push one chapter to 31 slots instead of
// 30 (whenever a season boundary lands exactly on the 30th level) — MAP_H
// (see buildMapModel) is sized off this MAX, not the flat 30 target, so
// every chapter still gets the exact same fixed canvas regardless of which
// one, if any, happened to need the extra slot.
export const MAX_CHAPTER_SLOTS = Math.max(NODES_PER_CHAPTER, ...CHAPTER_SLOTS.map(c => c.length));

// Surah -> the chapter its FIRST level lands in. Correct for "show me this
// surah" (search, and the start of a fresh surah), but NOT for "show me this
// particular level": across the whole Quran most surahs are longer than a
// 30-node chapter, so a level partway through one lands chapters later than
// its surah's first. Use chapterForLevel below whenever a specific level is
// the target — landing on a surah's opening chapter when the user is 100
// levels into Al-Baqarah would drop them nowhere near where they left off.
export const SURAH_TO_CHAPTER: Record<number, number> = {};
// Exact reverse lookup for chapterForLevel below: surah:surahLevelIdx -> the
// chapter that ACTUALLY holds it. Built directly off CHAPTER_SLOTS itself
// (not a formula) so it can never drift from where a level really landed —
// this is what keeps chapterForLevel correct even though a chapter is no
// longer always exactly NODES_PER_CHAPTER levels long (cutWouldOpenOnReview
// above occasionally grows one to 31 to keep a review off a new chapter's
// opening slot, which shifts every later chapter's boundary by one level; a
// plain Math.floor(flatIndex / NODES_PER_CHAPTER) formula would silently go
// stale the moment that happens, which is exactly the class of forward/
// reverse-mapping mismatch this screen has already broken from once today).
export const LEVEL_TO_CHAPTER: Record<string, number> = {};
CHAPTER_SLOTS.forEach((slots, chapterIdx) => {
  slots.forEach(slot => {
    if (slot.kind !== 'level') return;
    if (!(slot.flat.surahNum in SURAH_TO_CHAPTER)) {
      SURAH_TO_CHAPTER[slot.flat.surahNum] = chapterIdx;
    }
    LEVEL_TO_CHAPTER[`${slot.flat.surahNum}:${slot.flat.surahLevelIdx}`] = chapterIdx;
  });
});

// Flat index of each surah's first level in ALL_FLAT_LEVELS. Only still used
// as chapterForLevel's defensive fallback below (an out-of-range surahLevelIdx
// no real caller should ever pass, since every caller derives it from an
// actual fetched/defined level).
export const SURAH_FLAT_START: Record<number, number> = {};
ALL_FLAT_LEVELS.forEach((flat, i) => {
  if (!(flat.surahNum in SURAH_FLAT_START)) SURAH_FLAT_START[flat.surahNum] = i;
});
/**
 * The chapter holding one specific level of a surah, by that level's position
 * within its own surah (the same surahLevelIdx nodes are indexed by).
 *
 * A direct table lookup (LEVEL_TO_CHAPTER), not a formula — chapters are no
 * longer always exactly NODES_PER_CHAPTER levels long (see
 * cutWouldOpenOnReview in CHAPTER_SLOTS above), so plain division can land on
 * the wrong chapter past the first such adjustment. The table is built from
 * CHAPTER_SLOTS itself, so this can never disagree with where a level
 * actually rendered.
 */
export function chapterForLevel(surahNum: number, surahLevelIdx: number): number {
  const idx = Math.max(0, surahLevelIdx);
  const direct = LEVEL_TO_CHAPTER[`${surahNum}:${idx}`];
  if (direct != null) return direct;
  // Defensive fallback only, for an idx no real SECTIONS_DEF level actually
  // has — every genuine caller passes an idx found by searching a fetched
  // levels array, so LEVEL_TO_CHAPTER above always has it in practice.
  const start = SURAH_FLAT_START[surahNum];
  if (start == null) return 0;
  return Math.floor((start + idx) / NODES_PER_CHAPTER);
}

// Verification #1 — catch a surah split across a chapter boundary the
// moment the curriculum changes, instead of only discovering it the way
// Al-Ma'un's was discovered: a user noticing a mislabeled node in
// production. Pure/static (no backend dependency), computed once at module
// load, so it runs on every app start including in CI/tests that import
// this screen. A split itself is NOT an error — enrichedSections/
// handleNodePress now index nodes by surahLevelIdx (see SectionNode),
// which is correct regardless of which chapter a node lands in — this is
// just a loud tripwire so a NEW split is always noticed and its chapter-1
// nodes get eyeballed on-device before shipping, per
// [[project_map_chapter_split_bug]] in project memory.
export const SURAHS_SPLIT_ACROSS_CHAPTERS: number[] = (() => {
  const chaptersBySurah = new Map<number, Set<number>>();
  CHAPTER_SLOTS.forEach((slots, chapterIdx) => {
    slots.forEach(slot => {
      if (slot.kind !== 'level') return;
      const set = chaptersBySurah.get(slot.flat.surahNum) ?? new Set<number>();
      set.add(chapterIdx);
      chaptersBySurah.set(slot.flat.surahNum, set);
    });
  });
  return Array.from(chaptersBySurah.entries())
    .filter(([, chapters]) => chapters.size > 1)
    .map(([surahNum]) => surahNum);
})();
if (__DEV__ && SURAHS_SPLIT_ACROSS_CHAPTERS.length > 0) {
  // Logged as a count, not a list: at 21 surahs a split was a rare event worth
  // naming individually, but every surah longer than ~60 ayahs spans a
  // 30-node chapter, so across the whole Quran splits are the norm (most of
  // the 114). The indexing they used to break is handled by surahLevelIdx —
  // this stays only as a visible reminder that post-split nodes are worth
  // eyeballing on-device.
  // eslint-disable-next-line no-console
  console.log(
    `[MapScreen] ${SURAHS_SPLIT_ACROSS_CHAPTERS.length} of ${SECTIONS_DEF.length} surahs span a chapter boundary (expected — indexed by surahLevelIdx).`,
  );
}

// Verification #2 — the actual invariant enrichedSections' surahLevelIdx
// lookup depends on: a surah's real backend level count (full.length) must
// match its frontend-defined count (SECTIONS_DEF's levels.length) exactly,
// same order. This is what silently broke before the surahLevelIdx fix
// whenever a surah split across a chapter boundary; it's also what would
// silently break AGAIN, a different way, if this screen's chunking rule
// (buildLevelsWithReviews, CHUNK_SIZE=2 plus interleaved reviews — see
// [[project_map_levels]]) ever drifts from what the backend actually seeds.
// SECTIONS_DEF is generated from the surah catalogue now rather than
// hand-maintained, so the likelier source of drift is that shared rule or an
// ayah count, not a mistyped entry. Checked once per surah per app session
// (not every render) so a live mismatch surfaces immediately via Crashlytics
// instead of just quietly mis-indexing nodes again.
export const SURAH_LEVEL_COUNT: Record<number, number> = {};
SECTIONS_DEF.forEach(def => { SURAH_LEVEL_COUNT[def.surahNum] = def.levels.length; });
export const reportedLevelCountMismatches = new Set<number>();
export function verifySurahLevelCount(surahNum: number, backendCount: number): void {
  const expected = SURAH_LEVEL_COUNT[surahNum];
  if (expected == null || backendCount === expected || reportedLevelCountMismatches.has(surahNum)) return;
  reportedLevelCountMismatches.add(surahNum);
  const message = `Surah ${surahNum}: backend returned ${backendCount} level(s), frontend SECTIONS_DEF expects ${expected} — node-to-group indexing (surahLevelIdx) is unsafe for this surah until these agree.`;
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error(`[MapScreen] ${message}`);
  }
  captureError(new Error(`MapScreen surah level count mismatch: ${message}`), { surahNum, backendCount, expectedCount: expected });
}
// Gate every surahLevelIdx lookup through this rather than indexing
// fullLevels/sorted directly — if the count doesn't match (reported once via
// verifySurahLevelCount above), positional indexing can point at the wrong
// group entirely, which is exactly how the original chapter-split bug
// mislabeled a node AND misrouted its tap. Returning undefined here makes
// every call site fall back to its existing safe path (the 'pending'/
// 'available' heuristic in enrichedSections, or the "stay put" no-op in
// handleNodePress) instead of trusting a lookup that isn't guaranteed
// correct — so the very first render/tap is right even when the check
// fails, not just flagged after the fact.
export function trustedLevels(surahNum: number, levels: SurahLevel[] | undefined): SurahLevel[] | undefined {
  if (!levels) return undefined;
  const expected = SURAH_LEVEL_COUNT[surahNum];
  if (expected != null && levels.length !== expected) {
    verifySurahLevelCount(surahNum, levels.length);
    return undefined;
  }
  return levels;
}

// Which season indices a chapter's content actually touches — replaces the
// old CHAPTER_SEASONS (a chapter used to BE a fixed set of whole seasons;
// now it's whatever seasons happen to fall inside its slice, which can be a
// partial season at either edge). Used only to decide which seasons' data to
// prefetch for the chapter on screen — partial-or-whole doesn't matter for
// that, the fetch is per-season regardless.
export const CHAPTER_SEASON_INDICES: number[][] = CHAPTER_SLOTS.map(slots => {
  const seasons = new Set<number>();
  slots.forEach(slot => { if (slot.kind === 'level') seasons.add(SURAH_TO_SEASON[slot.flat.surahNum] ?? 0); });
  return Array.from(seasons).sort((a, b) => a - b);
});

// ── Pure helpers with no width dependency ──────────────────────────
// Deterministic pseudo-scatter (no Math.random — same input always gives
// the same layout, so cloud banks/parallax puffs don't reshuffle on re-render).
export function hash(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
export function pickEvenly<T>(arr: T[], count: number): T[] {
  if (arr.length <= count) return arr;
  return Array.from({ length: count }, (_, i) =>
    arr[Math.round(i * (arr.length - 1) / Math.max(count - 1, 1))],
  );
}
export interface Zone { y: number; side: 'left' | 'right'; height: number }
export function isBlocked(y: number, side: 'left' | 'right', h: number, zones: Zone[], gap = 8): boolean {
  return zones.some(z => z.side === side && Math.abs(z.y - y) < (z.height + h) / 2 + gap);
}
export function stageToNodeStatus(s: string): NodeStatus {
  if (s === 'completed') return 'completed';
  if (s === 'in_progress') return 'current';
  if (s === 'available') return 'available';
  return 'locked';
}

export function formatAyahRange(from: number, to: number): string {
  return from === to ? `Ayah ${from}` : `Ayahs ${from}-${to}`;
}

// Fallback ayah-range estimate for a node before its real start_ayah/end_ayah
// resolve from the backend. Both normal and review nodes are a uniform
// 2-ayah-per-group slot now — a review's own levelNum (see
// buildLevelsWithReviews) is the index of the last normal group it covers,
// so the same per-group formula applies to it directly; the only wrinkle is
// a paired review (levelNum even) spanning the two groups ending there
// instead of just the one a normal node of that levelNum would cover.
export function estimateAyahRange(levelNum: number, ayahCount: number, isSpecial?: boolean): { from: number; to: number } {
  const fromGroup = isSpecial && levelNum % 2 === 0 ? levelNum - 1 : levelNum;
  return { from: (fromGroup - 1) * 2 + 1, to: Math.min(levelNum * 2, ayahCount) };
}

// ── Types for the fully-computed, width-dependent map model ────────
export interface DecorBird    { y: number; x: number }
export interface DecorSeasonGate { x: number; y: number; w: number; h: number; unlocksSeasonIdx: number }
export interface LabelBox { x: number; y: number; w: number; h: number; isLeft: boolean }
export interface PillBox { x: number; y: number; w: number; h: number }
/** Where the "Begin/Continue here" tag hangs off its node. `left` is an
 * offset from the node's own left edge (the tag's wrapper is a child of the
 * node), so it can legitimately be negative for a tag on the node's left. */
export interface TagPlacement {
  left: number;
  alignItems: 'flex-start' | 'flex-end' | 'center';
  above: boolean;
}

export interface MapModel {
  MAP_W: number; SCALE: number; sc: (n: number) => number;
  NODE_SIZE: number; NODE_GAP: number; TOP_MARGIN: number; FOOTER_PAD: number;
  ACTION_CARD_W: number; ACTION_CARD_H: number;
  NODE_TAG_W: number;
  BASE_SECTIONS: Section[]; MAP_H: number; ALL_NODES: SectionNode[];
  comingSoonY: number | null;
  pathDForYRange: (startY: number, endY: number) => string;
  DECORATIONS: { birds: DecorBird[]; seasonGates: DecorSeasonGate[] };
  SKY_BOUNDARY_Y: number;
  GRASS_EDGE_D: string;
  SKY_CLOUDS: { x: number; y: number; w: number; h: number }[];
  SKY_BIRDS: { x: number; y: number; w: number; flip: boolean }[];
  AYAH_PILLS: Record<string, PillBox>;
  SURAH_LABELS: Record<number, LabelBox>;
}

// Fixed aspect ratio for the "start a new level" / "repeat the lesson" cards —
// height as a fraction of width, measured off the Figma playcard redesign's
// card rect (309×180, node 1090:4964 in the Landing-Page file). Every
// internal element (title, subtitle, button) is then positioned as a
// percentage of this fixed box in makeStyles/LevelActionCard, so scaling
// ACTION_CARD_W scales the whole card uniformly instead of each piece being
// sized off its own independent sc() constant.
export const ACTION_CARD_ASPECT = 180 / 309;

// ── ONE function: real device width (+ viewport height) in → every pixel of
// the map's layout out. Nothing derived here is a module-level constant
// anymore — it's all recomputed whenever width/height change (see
// useWindowDimensions in the component), so split-screen/foldable/rotation
// resizes actually relayout instead of leaving a stale frozen width baked in
// from first mount.
export function buildMapModel(mapW: number, viewportH: number, chapterIdx: number): MapModel {
  const BASELINE_W = 393;
  const SCALE = Math.min(1.3, Math.max(0.82, mapW / BASELINE_W));
  const sc = (n: number) => Math.round(n * SCALE);

  const NODE_SIZE     = sc(56);
  const NODE_GAP      = sc(170);
  // Both chapter-paging signs now sit together at the bottom (see the
  // end-of-chapter banner below) — no sign at the top anymore, so every
  // chapter uses the same margin.
  const TOP_MARGIN    = sc(220);
  // Room under the last node for the end-of-chapter banner: flag + a side-by-
  // side row of [PREVIOUS_STAGE?, NEXT_STAGE?] signs (NEW badge floats over
  // the corner, doesn't add height) + season-range captions under each —
  // not the bare "More coming soon…" text — so the banner never rides up
  // into the last node's ayah pill, and the captions never clip at the
  // scroll end.
  // sc(260) for the flag + sign row, plus sc(125) of clear space under it for
  // the end-of-map Lumo ("nothing to see here"). He needs his own room: the
  // sign row already fills the original padding, and tucking him under it
  // would have him overlapping the season captions. The block is about
  // sc(101) tall (bubble text + padding + margin + sc(64) of art), and the
  // map canvas is overflow:'hidden', so anything past MAP_H is cut.
  const FOOTER_PAD    = sc(260) + sc(125);
  // Real visual gap from the road's widest visible (glow) stroke, not just
  // its centerline — the old NODE_SIZE/2 + sc(8) was only ~5px past the
  // glow's own half-width, which read as "touching the road."
  // Node bounding boxes are independently registered as blocking zones below
  // (see ALL_NODES.forEach a bit further down), so this no longer needs to
  // carry the whole safety margin by itself — a large CLEARANCE here mostly
  // just rejected valid placements, which is why several decorations you'd
  // expect to see (mosques, trees) were silently skipped as "no room."
  const CLEARANCE = NODE_SIZE / 2 + sc(25);
  // Half-width of the road's widest visible stroke (the beveled undercoat in
  // Pathway is sc(64) wide) — used to verify a candidate spot against where
  // the road actually is, not just its centerline.
  const ROAD_HALF_WIDTH = sc(32);

  // A season gate is a node, not a decoration: it occupies its own slot in
  // CHAPTER_SLOTS at the exact same rhythm a level does (see below), sized a
  // bit bigger than a level node so "Season N" reads clearly. Based on the
  // road's own visible width (ROAD_HALF_WIDTH*2), scaled up 56% (was 30%;
  // bumped another 20% at the user's request).
  const SEASON_GATE_W = Math.round(ROAD_HALF_WIDTH * 2 * 1.56);
  const SEASON_GATE_H = Math.round(SEASON_GATE_W / SEASON_GATE_ASPECT);

  // ── Layout: chapter slots → pixel positions ──
  // Every consecutive pair of things along the road — node to node, node to
  // season-sign, sign to node — sits exactly NODE_GAP apart, INCLUDING a
  // season-sign step: a gate is its own slot in CHAPTER_SLOTS (see above),
  // laid out at the exact same rhythm a level is, not squeezed into an
  // existing gap. Only the requested chapter's slots are laid out —
  // everything below (path, tiles, labels, pills, gates, MAP_H) derives from
  // this one slice, so it's the single point that makes the map a chapter at
  // a time. Falls back to chapter 0 rather than producing an empty map if an
  // out-of-range index ever arrives.
  const slots = CHAPTER_SLOTS[chapterIdx]?.length ? CHAPTER_SLOTS[chapterIdx] : CHAPTER_SLOTS[0];

  // Fixed regardless of chapter content — sized off MAX_CHAPTER_SLOTS (every
  // chapter's real slot count, levels + any gates, maxed across all of
  // them — see its own comment), so MAP_H (and everything sized against it:
  // tile boundaries, GRASS_EDGE_D, the road's own shape via chapterXFraction
  // above) comes out identical for every chapter regardless of how many
  // gates, if any, happen to land inside it. This is what actually makes
  // grass/road reusable instead of rebuilt-per-chapter, not just equal
  // level counts on their own.
  const MAP_H = TOP_MARGIN + (MAX_CHAPTER_SLOTS - 1) * NODE_GAP + NODE_SIZE + FOOTER_PAD;

  // Every slot — level OR gate — sits on the exact same x/y rhythm
  // (chapterXFraction(idx), TOP_MARGIN + idx*NODE_GAP), so a gate is
  // positioned exactly like a node would be at that slot, not centered
  // around its own (much taller, ~3x a node) art afterward. Centering the
  // sign's oversized art on a node-sized point was the actual bug: it pushed
  // the sign's top edge up past TOP_MARGIN into the mountain skyline
  // whenever a gate landed as a chapter's very first slot (season boundary
  // landing right after a chapter's 30th level). Anchoring by TOP the same
  // way a node is means a gate's top never rises above where a same-slot
  // node's top would be, regardless of the art's own height.
  //
  // PATH_ANCHORS collects a center point for every slot in order, gates
  // included, using the node-rhythm y (not the gate's own taller-art
  // center) — this is what the round curve is threaded through below, so
  // the visible road actually bends through the gate's slot instead of
  // skipping straight past it to the next level (which used to leave gates
  // stranded off the drawn curve rather than "on the path").
  const PATH_ANCHORS: { x: number; y: number }[] = [];
  const SEASON_GATES_DATA: DecorSeasonGate[] = [];

  const BASE_SECTIONS: Section[] = [];
  let currentSection: Section | null = null;
  slots.forEach((slot, idx) => {
    const centerX = chapterXFraction(idx) * mapW;
    const centerY = TOP_MARGIN + idx * NODE_GAP + NODE_SIZE / 2;
    PATH_ANCHORS.push({ x: centerX, y: centerY });
    if (slot.kind === 'gate') {
      SEASON_GATES_DATA.push({
        x: Math.round(centerX - SEASON_GATE_W / 2),
        y: TOP_MARGIN + idx * NODE_GAP,
        w: SEASON_GATE_W,
        h: SEASON_GATE_H,
        unlocksSeasonIdx: slot.unlocksSeasonIdx,
      });
      return;
    }
    const { flat } = slot;
    if (!currentSection || currentSection.surahNum !== flat.surahNum) {
      if (currentSection) BASE_SECTIONS.push(currentSection);
      currentSection = { surahNum: flat.surahNum, name: flat.name, arabicName: flat.arabicName, ayahCount: flat.ayahCount, nodes: [] };
    }
    currentSection.nodes.push({
      id: flat.level.id,
      x: Math.round(centerX - NODE_SIZE / 2),
      y: TOP_MARGIN + idx * NODE_GAP,
      status: 'locked' as NodeStatus,
      stars: 0,
      levelNum: flat.level.levelNum,
      surahLevelIdx: flat.surahLevelIdx,
      isSpecial: flat.level.isSpecial,
    });
  });
  if (currentSection) BASE_SECTIONS.push(currentSection);
  const ALL_NODES = BASE_SECTIONS.flatMap(s => s.nodes);

  // The final chapter can come up short of MAX_CHAPTER_SLOTS (the whole
  // Quran's ~4,700 nodes don't divide evenly into 30). MAP_H is already sized
  // for the max regardless (see above), so a short chapter's real content just
  // stops early within that same fixed canvas. Fill the untouched remainder
  // with a closing banner rather than leaving it looking simply empty — the
  // map now runs to Al-Fatihah, so this is the end of the road, not a
  // placeholder for curriculum still to come.
  let comingSoonY: number | null = null;
  if (chapterIdx === CHAPTER_COUNT - 1 && slots.length < MAX_CHAPTER_SLOTS) {
    const midIdx = (slots.length - 1 + (MAX_CHAPTER_SLOTS - 1)) / 2;
    comingSoonY = TOP_MARGIN + midIdx * NODE_GAP + NODE_SIZE / 2;
  }

  // ── Path string + geometry through all node (and gate) centres ──
  // Threaded through PATH_ANCHORS, not just ALL_NODES, so the drawn road
  // actually bends through a gate's slot too instead of curving straight
  // past it between the levels on either side (see PATH_ANCHORS above).
  const PATH_PTS = PATH_ANCHORS;

  // Per-tile slice of the road path — see the SVG background tiling further
  // down (the ~100MB-per-bitmap comment): every tile is its own <Svg> clipped
  // to its own viewBox. This used to build one PATH_D string spanning every
  // node and hand the FULL thing to every tile, which meant Skia had to
  // scan-convert and AA-fill every node-to-node segment — stroked 5 times
  // over for the road's shadow/edge/fill/highlight layers — once per tile,
  // not once total. On a long map (dozens of nodes × dozens of tiles) that's
  // enough main-thread work to freeze a frame for multiple seconds (caught
  // live in an ANR trace: main thread stuck inside SkScan::AAAFillPath via
  // com.horcrux.svg.RenderableView.draw). Each C segment's control points
  // depend only on its own two endpoints, so segments are independent and can
  // be sliced by y-range with no change of shape at the seam — a tile only
  // ever needs the handful of segments that actually fall inside it.
  function pathDForYRange(startY: number, endY: number): string {
    if (PATH_PTS.length < 2) return '';
    let d = '';
    for (let i = 1; i < PATH_PTS.length; i++) {
      const p = PATH_PTS[i - 1], c = PATH_PTS[i];
      if (c.y < startY || p.y > endY) continue;
      if (!d) d = `M ${p.x} ${p.y}`;
      const midY = (p.y + c.y) / 2;
      d += ` C ${p.x} ${midY}, ${c.x} ${midY}, ${c.x} ${c.y}`;
    }
    return d;
  }

  // The path's segments are cubic Beziers with control points pinned at the
  // same-y midpoint (see pathDForYRange above), which reduces to
  // y(t) = p.y + dy·h(t), h(t) = 1.5t − 1.5t² + t³, and
  // x(t) = p.x + dx·g(t), g(t) = 3t² − 2t³.
  // A plain linear interpolation of x against y (the old approach) implicitly
  // assumes h(t) ≡ t, which only holds at t = 0, 0.5, 1 — everywhere else it
  // diverges from the real curve (worst at t ≈ 0.21/0.79, by ~14% of dx).
  // Decorations anchored at those points were landing visibly off the actual
  // rendered road. Solving h(t) = frac exactly (h is monotonic, so a few
  // Newton steps converge) and then evaluating g(t) tracks the true curve.
  function solveT(frac: number): number {
    let t = frac;
    for (let i = 0; i < 5; i++) {
      const h = 1.5 * t - 1.5 * t * t + t * t * t;
      const hp = 1.5 - 3 * t + 3 * t * t;
      t -= (h - frac) / hp;
      if (t < 0) t = 0; else if (t > 1) t = 1;
    }
    return t;
  }
  function pathXAt(py: number): number {
    if (py <= PATH_PTS[0].y) return PATH_PTS[0].x;
    if (py >= PATH_PTS[PATH_PTS.length - 1].y) return PATH_PTS[PATH_PTS.length - 1].x;
    for (let i = 0; i < PATH_PTS.length - 1; i++) {
      const p = PATH_PTS[i], c = PATH_PTS[i + 1];
      if (py >= p.y && py < c.y) {
        const frac = (py - p.y) / (c.y - p.y);
        const t = solveT(frac);
        const g = 3 * t * t - 2 * t * t * t;
        return Math.round(p.x + g * (c.x - p.x));
      }
    }
    return Math.round(mapW / 2);
  }
  // The path's local unit normal at y — offsets decorations perpendicular to
  // the curve instead of a naive horizontal x±constant.
  function pathNormalAt(py: number): { nx: number; ny: number } {
    const d = 12;
    const x0 = pathXAt(Math.max(PATH_PTS[0].y, py - d));
    const x1 = pathXAt(Math.min(PATH_PTS[PATH_PTS.length - 1].y, py + d));
    const dx = x1 - x0, dy = 2 * d;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { nx: -dy / len, ny: dx / len };
  }

  // A decoration has real height, but the road it's dodging is a curve, not
  // a straight line — the road's x can drift several px between the top and
  // bottom of a tall decoration even when it's clear at the vertical center
  // (the single point placeSide used to check). Sampling pathXAt across the
  // decoration's full [y0, y1] span and checking every sample against its
  // horizontal span [x0, x1] catches the case a single center-point check
  // misses: the road swinging back into the decoration's box on a steep
  // curve between two nodes, which used to render as an icon sitting
  // visibly on the road (decorations always paint on top of it — see the
  // Pathway/decoration z-order in the render tree below).
  function roadClearAcross(y0: number, y1: number, x0: number, x1: number, gap: number): boolean {
    const step = 10;
    for (let y = y0; y <= y1; y += step) {
      const roadX = pathXAt(y);
      if (x1 >= roadX - ROAD_HALF_WIDTH - gap && x0 <= roadX + ROAD_HALF_WIDTH + gap) return false;
    }
    const roadXEnd = pathXAt(y1);
    return !(x1 >= roadXEnd - ROAD_HALF_WIDTH - gap && x0 <= roadXEnd + ROAD_HALF_WIDTH + gap);
  }

  // Geometrically-guaranteed placement: clearance is measured from the
  // node/path's own radius, never a screen-edge clamp. If neither side has
  // real room, the decoration is skipped instead of forced onto the road.
  function placeSide(
    midY: number, w: number, h: number, preferSide: 'left' | 'right',
    zones: Zone[], gap = 8,
  ): { side: 'left' | 'right'; x: number; y: number } | null {
    for (const side of [preferSide, preferSide === 'left' ? 'right' : 'left'] as const) {
      const dir = side === 'left' ? -1 : 1;
      // Most spots clear on the first try (extra = 0, same distance as
      // before); only spots on a steep curve need the wider margins.
      for (const extra of [0, sc(16), sc(32)]) {
        const pathX = pathXAt(midY);
        const { nx, ny } = pathNormalAt(midY);
        const clearance = CLEARANCE + extra;
        const anchorX = pathX + nx * clearance * dir;
        const anchorY = midY + ny * clearance * dir;
        const x = side === 'left' ? anchorX - w : anchorX;
        const py = anchorY - h / 2;
        const fits = side === 'left' ? x >= 0 : x + w <= mapW;
        if (!fits) continue;
        if (isBlocked(py, side, h, zones, gap)) continue;
        if (!roadClearAcross(py, py + h, x, x + w, gap)) continue;
        return { side, x: Math.round(x), y: Math.round(py) };
      }
    }
    return null;
  }

  // ── Shared zone registry — seeded with the ayah pill / surah label /
  // bridge / season-gate arch FIRST (real geometry, computed below), before
  // any tree/mosque/rock/bird/lantern is placed, so nothing can land on them. ──
  const placed: Zone[] = [];

  // Ayah pill — real offset derived from NODE_SIZE (not implicit flow-stacking).
  const PILL_H = sc(26);
  const AYAH_PILLS: Record<string, PillBox> = {};
  BASE_SECTIONS.forEach(section => {
    section.nodes.forEach((node, nodeIdx) => {
      // Width follows the actual range text instead of one fixed size for
      // every node — same fix as SURAH_LABELS' labelW below. A fixed sc(80)
      // fit "Ayah 1" fine but let double-digit ranges ("Ayahs 19–20") run
      // wider than their reserved zone, leaking text into whatever
      // tree/mosque/bush got placed beside it assuming only sc(80) was
      // taken. levelNum/ayahCount are the same inputs the render's ayahFrom/
      // ayahTo fallback uses, so this sizes against the label that will
      // actually show even before any backend start/endAyah override lands.
      const levelNum = node.levelNum ?? 1;
      const { from: ayahFrom, to: ayahTo } = estimateAyahRange(levelNum, section.ayahCount, node.isSpecial);
      const rangeLabel = formatAyahRange(ayahFrom, ayahTo);
      const pillW = Math.round(Math.max(sc(50), Math.min(sc(105), sc(38) + rangeLabel.length * sc(5.5))));
      const px = Math.max(0, Math.min(mapW - pillW, node.x + NODE_SIZE / 2 - pillW / 2));
      const py = node.y + NODE_SIZE + sc(6);
      AYAH_PILLS[`${section.surahNum}_${nodeIdx}`] = { x: px, y: py, w: pillW, h: PILL_H };
      // No separate blocking zone for the pill itself (unlike the node
      // above) — it sits centered ON the path (px is node-centered), while
      // decorations always anchor off to one SIDE via CLEARANCE, so it was
      // rarely the thing actually in their way; it was mostly just adding
      // ~32px of dead reach on top of the node's own zone (see that zone's
      // comment) toward the ~102px-of-170px saturation that left zero room
      // for any tree/mosque anywhere. Worst case now is a decoration
      // landing adjacent to a pill's text rather than clearly beside it —
      // a minor cosmetic tradeoff against decorations existing at all.
    });
  });

  // Surah label — real offset derived from firstNode.x, mirroring the
  // formula LumaFloat already used correctly (lumaLeft), not a hardcoded
  // screen-edge constant.
  // Bumped 20% (was sc(60)) at the user's request.
  const LABEL_H = sc(72);
  const SURAH_LABELS: Record<number, LabelBox> = {};
  BASE_SECTIONS.forEach(section => {
    const firstNode = section.nodes[0];
    // A surah spanning several chapters (the norm post-expansion) gets a
    // `section` entry in EVERY chapter it touches, each just that chapter's
    // slice of nodes — so `section.nodes[0]` here is only the surah's real
    // opening level on the ONE chapter that actually contains it; on every
    // later chapter it's some mid-surah node instead. Labeling every one of
    // those put the surah's name sign on every page it spans, not just its
    // first. Only the chapter holding the true opening level should get one.
    if (!firstNode || firstNode.surahLevelIdx !== 0) return;
    // Scroll width follows the name's length instead of one fixed size for
    // every surah — "An-Nasr" and "Al-Kafirun" don't need (and don't look
    // right in) the same box. Bounds and scale bumped 20% along with LABEL_H
    // (were sc(95)/sc(155)/sc(58)/sc(7)).
    const labelW = Math.round(Math.max(sc(114), Math.min(sc(186), sc(69.6) + section.name.length * sc(8.4))));
    // Pick whichever side actually has more room, then clamp only against
    // the screen edge on THAT side — clamping against the far edge (the old
    // behaviour) could push the label back over the node itself when the
    // node sat near a screen edge, making the scroll cover the node instead
    // of sitting beside it.
    const spaceLeft = firstNode.x;
    const spaceRight = mapW - (firstNode.x + NODE_SIZE);
    const isLeft = spaceLeft >= spaceRight;
    const rawX = isLeft ? firstNode.x - labelW - sc(10) : firstNode.x + NODE_SIZE + sc(10);
    const lx = isLeft ? Math.max(0, rawX) : Math.min(mapW - labelW, rawX);
    const ly = firstNode.y + NODE_SIZE / 2 - LABEL_H / 2;
    SURAH_LABELS[section.surahNum] = { x: lx, y: ly, w: labelW, h: LABEL_H, isLeft };
    placed.push({ y: ly, side: isLeft ? 'left' : 'right', height: LABEL_H });
  });

  // Section-boundary midpoints — decoration scatter only (mosque/tree/bush
  // "extra pass at section boundaries" below). Season-gate signs do NOT use
  // this: they get their own precise slot from the layout loop above
  // (PATH_ANCHORS/SEASON_GATES_DATA), not a midpoint average, so their
  // spacing matches every other node-to-node step exactly.
  const secMidYs = BASE_SECTIONS.slice(0, -1).map((sec, i) => {
    const lastY  = sec.nodes[sec.nodes.length - 1].y + NODE_SIZE / 2;
    const firstY = BASE_SECTIONS[i + 1].nodes[0].y + NODE_SIZE / 2;
    return Math.round((lastY + firstY) / 2);
  });

  // Season gates themselves (SEASON_GATES_DATA) are built above, in the same
  // slots.forEach pass that builds ALL_NODES — straight from each slot's own
  // {kind:'gate'} marker, not reconstructed afterward by diffing
  // BASE_SECTIONS' surah→season boundaries. That reconstruction used to be
  // the only place a gate's render position came from, and it silently
  // missed/misplaced a gate whenever the season boundary landed on the very
  // first slot of a chapter (BASE_SECTIONS.forEach skipped i===0, so a gate
  // there had no "previous section" to diff against within that chapter).
  const seasonGates = SEASON_GATES_DATA;

  // Lesson nodes themselves — previously never registered here, so nothing
  // stopped a decoration from landing on top of a node as long as it cleared
  // *other decorations*. A node sits on the path's own centerline (not off
  // to one side), so it's registered on BOTH sides with a margin so nothing
  // anchors too close to its y regardless of which side it ends up on.
  //
  // Padding trimmed from sc(28)/sc(14) to sc(10)/sc(5) — confirmed via
  // instrumented placeSide (temporary attempts/blockedF/roadF counters) that
  // the original padding, combined with every node's own ayah-pill also
  // reserving a full separate zone just below it (see AYAH_PILLS below),
  // consumed ~102px of the 170px NODE_GAP step around every single node —
  // more than the tallest decoration even needs, so ~95% of every placement
  // attempt across the whole map (3292 of 3468 in that run) failed on this
  // check alone and virtually nothing ever placed. sc(10)/sc(5) still clears
  // the node art itself (which overhangs NODE_SIZE slightly on a special
  // node — see nodeImgRecommendedSpecial) with a few px to spare.
  ALL_NODES.forEach(node => {
    const zoneH = NODE_SIZE + sc(10);
    const zoneY = node.y - sc(5);
    placed.push({ y: zoneY, side: 'left', height: zoneH });
    placed.push({ y: zoneY, side: 'right', height: zoneH });
  });

  // ── Decorations — every type placed via placeSide, into the zones already
  // seeded above. Priority: rock > bird > lantern.
  //
  // Trees and mosques used to be placed here too (three passes each) and drawn
  // as <SvgImage> inside the background tiles. Removed outright: they never
  // actually rendered on device. Both source images kept hitting RNSVG's
  // Android decoder ("fetchDecodedImage failed!"), and each replacement — a
  // downscaled mosque, a non-palette tree — bought at most a partial fix, so
  // what shipped was a map whose two most numerous decorations were invisible
  // while still costing placement work and paint calls per tile. ──
  const nodeMidYs = ALL_NODES.slice(0, -1).map((n, i) => Math.round((n.y + ALL_NODES[i + 1].y) / 2));

  const birdW = sc(96), birdH = sc(48);
  const birds: DecorBird[] = [];
  secMidYs.forEach((midY, i) => {
    const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
    const p = placeSide(midY - sc(20), birdW, birdH, side, placed, 6);
    if (p) { placed.push({ y: p.y, side: p.side, height: birdH }); birds.push({ y: p.y, x: p.x }); }
  });
  // Extra birds pass along the road itself (not just section boundaries).
  nodeMidYs.forEach((midY, i) => {
    if (i % 2 !== 0) return;
    const side: 'left' | 'right' = i % 4 === 0 ? 'right' : 'left';
    const p = placeSide(midY + sc(30), birdW, birdH, side, placed, 6);
    if (p) { placed.push({ y: p.y, side: p.side, height: birdH }); birds.push({ y: p.y, x: p.x }); }
  });

  // ── Ground color boundary — sky ends, ground begins. Shared by the
  // gradient, the grass texture wash, the mountain image and the static
  // sky-cloud strip so none of them can drift out of sync with each other.
  // Capped to a fraction of the actual viewport height (not just TOP_MARGIN,
  // which is a pure width-based offset with no idea how tall the screen
  // actually is) so the sky/mountain band stays a consistent slice of
  // the visible screen on any device instead of ballooning on short
  // viewports — the grass fills the rest. Node 1's own Y position (driven by
  // TOP_MARGIN alone, untouched here) simply ends up sitting on the grass
  // rather than at the boundary line once this is smaller than TOP_MARGIN.
  // 0.19 (was 0.13) makes the mountain a more prominent band now that
  // mountains_crop.png has a consistent baseline safe to size up without
  // risking a gap at the bottom edge. ──
  const SKY_BOUNDARY_Y = Math.round(Math.min(TOP_MARGIN + NODE_SIZE * 0.35, viewportH * 0.26));

  // Straight grass edge (was a jagged "torn" line, removed per request). The
  // mountain image's base extends sc(28) below this line, so the grass drawn
  // over it hides the base across the full width: no sky between the two.
  // Overshoots both sides by 10: mapW can land a fraction of a dp short of
  // the canvas width, which left a 2px sky strip at the right edge. The Svg
  // clips the overshoot.
  const GRASS_EDGE_D = `M -10 ${SKY_BOUNDARY_Y} L ${mapW + 10} ${SKY_BOUNDARY_Y} L ${mapW + 10} ${MAP_H} L -10 ${MAP_H} Z`;

  // More clouds scattered across the sky band itself, varied size/position
  // so the sky doesn't look empty.
  const SKY_CLOUDS = Array.from({ length: 6 }, (_, i) => {
    const w = sc(110 + hash(i * 9 + 3) * 70);
    return {
      x: Math.round(hash(i * 9 + 1) * Math.max(1, mapW - w * 0.6) - w * 0.2),
      y: Math.round(4 + hash(i * 9 + 5) * Math.max(1, SKY_BOUNDARY_Y - sc(50))),
      w, h: w * 0.42,
    };
  });

  // Birds scattered across the sky photo itself, not just at ground level.
  const SKY_BIRDS = Array.from({ length: 6 }, (_, i) => ({
    x: Math.round(hash(i * 11 + 4) * Math.max(1, mapW - sc(50))),
    y: Math.round(14 + hash(i * 11 + 8) * Math.max(1, SKY_BOUNDARY_Y - sc(40))),
    w: sc(30 + hash(i * 11 + 12) * 16),
    flip: hash(i * 11 + 16) > 0.5,
  }));


  // ── Ambient parallax cloud layers (3 depths) ──
  return {
    MAP_W: mapW, SCALE, sc,
    NODE_SIZE, NODE_GAP, TOP_MARGIN, FOOTER_PAD,
    // Width + height for the "start a new level" / "repeat the lesson"
    // popout cards — computed once here (not re-derived in makeStyles or the
    // tap handler) so the card's rendered size and its position-beside-the-
    // node math never disagree. Height is derived from width via the fixed
    // ACTION_CARD_ASPECT rather than measured from content.
    ACTION_CARD_W: sc(230),
    ACTION_CARD_H: Math.round(sc(230) * ACTION_CARD_ASPECT),
    // Fixed width of the "Begin/Continue here" tag beside the recommended
    // node — both the real width of its wrapper box AND the maxWidth of the
    // pill inside it, so the placement test below can never disagree with
    // what actually renders (the same guarantee ACTION_CARD_W gives the
    // card). Widened from sc(104): at that size "Continue here" ran right up
    // against the pill's own horizontal padding with nothing to spare.
    NODE_TAG_W: sc(118),
    BASE_SECTIONS, MAP_H, ALL_NODES, comingSoonY,
    pathDForYRange,
    DECORATIONS: { birds, seasonGates },
    SKY_BOUNDARY_Y, GRASS_EDGE_D, SKY_CLOUDS, SKY_BIRDS,
    AYAH_PILLS, SURAH_LABELS,
  };
}
