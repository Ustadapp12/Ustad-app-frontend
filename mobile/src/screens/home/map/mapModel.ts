import { captureError } from '../../../services/crashReporter';
import { groupIntoPhases } from '../../../utils/mapPhases';
import { ALL_SURAHS } from '../../../data/allSurahs';
import type { SurahLevel } from '../../../types/api';

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
// Generated from the surah catalogue below (SECTIONS_DEF).
export interface SectionDef {
  surahNum: number; name: string; arabicName: string; ayahCount: number;
  levels: Array<{ id: string; levelNum: number; isSpecial?: boolean }>;
}

// CHUNK_SIZE=2 group builder — must match the backend's own lesson-group
// seeding exactly (see [[project-map-levels]] memory), or node count/ayah
// ranges on the map won't line up with real backend groups. Review nodes
// (backend's `is_special`) are interleaved one after every 2 normal groups,
// with a trailing odd group getting its own solo review — not one appended
// at the end — matching the backend's own placement (see list_lesson_groups).
function buildLevelsWithReviews(
  surahNum: number, ayahCount: number,
): { levels: Array<{ id: string; levelNum: number; isSpecial?: boolean }> } {
  const groupCount = Math.ceil(ayahCount / 2);
  const levels: Array<{ id: string; levelNum: number; isSpecial?: boolean }> = [];
  let reviewIdx = 0;
  for (let g = 1; g <= groupCount; g++) {
    levels.push({ id: `${surahNum}_g${g}`, levelNum: g });
    if (g % 2 === 0 || g === groupCount) {
      reviewIdx++;
      // levelNum carries the last normal group this review covers — an
      // even value means it paired that group with the one before it, an
      // odd value only ever occurs for the trailing solo case (g ===
      // groupCount with no even hit yet) — see estimateAyahRange, which
      // reads this same value back out.
      levels.push({ id: `${surahNum}_review${reviewIdx}`, levelNum: g, isSpecial: true });
    }
  }
  return { levels };
}

// The whole Quran, top-to-bottom in descending surah order (114 → 1) — the
// same "shortest/most-memorised first" order the map has always used, simply
// carried past Juz Amma now that the backend serves every surah's content.
//
// Generated, not hand-written, and it has to be: a hand-typed entry per surah
// was viable at 21 but not at 114 (Al-Baqarah alone is ~143 groups). All a
// surah contributes is its name and ayah count, both of which the catalogue
// has; node positions are the map's own layout (see map2Model).
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
    ...buildLevelsWithReviews(s.surah_number, s.ayah_count),
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
// boundary if that's where the count runs out. The map's data loading
// (useMapData) uses chapters to decide which seasons to fetch first.
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

// ── Width-dependent sizes for the map's popups ─────────────────────
// The level start/repeat card and Lumo's "couldn't open" bubble (both drawn
// by Map2Screen) scale off the screen width. Everything else the old map laid
// out here (road, birds, clouds, season signs, labels) went with the old map.
export interface MapScale {
  sc: (n: number) => number;
  ACTION_CARD_W: number; ACTION_CARD_H: number;
}

// Fixed aspect ratio for the "start a new level" / "repeat the lesson" cards —
// height as a fraction of width, measured off the Figma playcard redesign's
// card rect (309×180, node 1090:4964 in the Landing-Page file). Every
// internal element (title, subtitle, button) is then positioned as a
// percentage of this fixed box in makeStyles/LevelActionCard, so scaling
// ACTION_CARD_W scales the whole card uniformly instead of each piece being
// sized off its own independent sc() constant.
const ACTION_CARD_ASPECT = 180 / 309;

export function buildMapScale(mapW: number): MapScale {
  const BASELINE_W = 393;
  const SCALE = Math.min(1.3, Math.max(0.82, mapW / BASELINE_W));
  const sc = (n: number) => Math.round(n * SCALE);
  // Height derived from width via the fixed ACTION_CARD_ASPECT, so the card's
  // rendered size and its position-beside-the-node math never disagree.
  return { sc, ACTION_CARD_W: sc(230), ACTION_CARD_H: Math.round(sc(230) * ACTION_CARD_ASPECT) };
}
