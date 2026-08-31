import React, { useRef, useEffect, useState, useMemo, useCallback, useReducer } from 'react';
import {
  View, Text, StyleSheet, Animated, useWindowDimensions, Image, ActivityIndicator, TouchableOpacity,
  ScrollView, RefreshControl, type ImageSourcePropType,
} from 'react-native';
import Svg, {
  Defs, Path, G, Pattern, Image as SvgImage,
} from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import PredictedProgressBar from '../../components/PredictedProgressBar';
import { LoadingRing } from '../../components/LoadingSpinner';
import MascotShadow from '../../components/MascotShadow';
import LoadingStatusText from '../../components/LoadingStatusText';
import { useAuthStore } from '../../store/authStore';
import { useLessonStore } from '../../store/lessonStore';
import { learningApi } from '../../api';
import { setCrashContext, addBreadcrumb, captureError } from '../../services/crashReporter';
import { colors } from '../../theme/colors';
import { groupIntoPhases } from '../../utils/mapPhases';
import { STREAK_ACTIVE_ICON_SMALL, STREAK_FROZEN_ICON_SMALL, isStreakFrozen, streakColor, checkStreakFrozenPopup } from '../../utils/streak';
import StreakFrozenModal from '../../components/StreakFrozenModal';
import AuthRequiredModal from '../../components/AuthRequiredModal';
import { isGuest } from '../../utils/guest';
import { getCachedRecommended, setCachedRecommended, getCachedLevels, getCachedFirstLevel, subscribeRecommended, fetchLevels } from '../../services/bootCache';
import { AnalyticsEvents, logAnalyticsEvent } from '../../services/analytics';
import { loadLessonGroup } from '../../services/cachedContent';
import { getUnlockedSeasons, setTourOffered, unlockSeason, wasTourOffered } from '../../utils/storage';
import { useTourStore } from '../../store/tourStore';
import { TOUR_STEPS } from '../../components/tour/tourSteps';
import { TOUR_GLOW } from '../lesson/LessonSessionScreen';
import TourOfferModal from '../../components/tour/TourOfferModal';
import { useTourTarget } from '../../components/tour/useTourTarget';
import type { SurahLevel } from '../../types/api';
import type { MapNavProp } from '../../navigation/types';

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
const SVG_BG_TILE_H = 3000;

// ── Asset refs (static, so Metro can bundle them) ──────────────────
const BIRDS_SRC    = require('../../../assets/birds.png');
const CLOUD_SRC    = require('../../../assets/clouds.png');
const START_SRC    = require('../../../assets/start.png');
const SCROLL_SRC   = require('../../../assets/map/scroll2.png');
// Chapter-paging signs — same wooden-signpost art as the season gates, one
// pointing forward ("NEXT STAGE") and one back ("PREVIOUS STAGE"), text baked
// into the art itself. Real aspect ratios (678x767 / 692x756) — close but not
// identical, so each keeps its own rather than sharing one constant.
const NEXT_STAGE_SRC     = require('../../../assets/map/NEXT_STAGE.png');
const PREVIOUS_STAGE_SRC = require('../../../assets/map/PREVIOUS_STAGE.png');
const NEXT_STAGE_ASPECT     = 678 / 767;
const PREVIOUS_STAGE_ASPECT = 692 / 756;
const GRASS_SRC    = require('../../../assets/map/grass.jpg');
const BRICK_SRC    = require('../../../assets/map/bricks.jpg');
// Pre-engraved signs — the season number is baked into the art itself, one
// file per season, keyed by season number (1-indexed, matching the label on
// the sign) rather than composed at runtime from a blank sign + overlaid text.
// Season 1 has no gate (it's unlocked from the start, see isSeasonUnlocked)
// so its sign is never actually rendered on a gate — kept in the map anyway
// since gate → sign lookup below falls back to it if a season is ever added
// without matching art. Every other gate renders the sign for the season it
// unlocks (unlocksSeasonIdx is 0-indexed — see the seasonGates render below).
const SEASON_SIGN_SRCS: Record<number, ImageSourcePropType> = {
  1: require('../../../assets/map/s1.png'),
  2: require('../../../assets/map/s2.png'),
  3: require('../../../assets/map/s3.png'),
  4: require('../../../assets/map/s4.png'),
  5: require('../../../assets/map/s5.png'),
  6: require('../../../assets/map/s6.png'),
  7: require('../../../assets/map/s7.png'),
};
// Real aspect ratio of the sign art (186x326). All three files share it.
const SEASON_GATE_ASPECT = 186 / 326;
const SKY_SRC      = require('../../../assets/map/sky.jpg');
// Cropped from the original mountains.png (1400x443 → 1400x385): the source
// art's foreground isn't a flat line — a lake dips as low as y≈442 on the
// left while the right side's tree line ends by y≈387, a 55px wobble in the
// baseline. Left uncropped, "cover"-scaling that into a wide/short band and
// overlapping it with the grass's flat boundary meant the required overlap
// margin had to cover the worst-case dip everywhere, capping how big the
// band could get before risking a gap ("leakage") on the shallow side.
// Cropping at 385 — just under the true minimum content-bottom (387,
// verified across the full width) — keeps every column opaque right to the
// bottom edge, so the mountain reads as one consistent skyline instead of
// forcing an oversized safety margin.
const MOUNTAINS_SRC = require('../../../assets/map/mountains_crop.png');
const NODE_SRCS = {
  locked: require('../../../assets/map/node_locked.png'),
  current: require('../../../assets/map/node_current.png'),
  completed: require('../../../assets/map/node_completed.png'),
  specialDone: require('../../../assets/map/special_done.png'),
  // Green + star — the art for EVERY reachable (unlocked, not yet
  // completed) special/review node, not just the backend's recommended-next
  // one. special.png used to fill that role, but it is byte-for-byte the
  // same file as node_current.png (a blank green tile with no star at all),
  // so an open review node rendered as an anonymous green blob — nothing
  // marked it as a review. It is no longer referenced anywhere.
  // Still never shown while locked: the star and the 🔒 badge overlap badly
  // on the same small node, so a locked special keeps node_current.png.
  recommendedSpecial: require('../../../assets/map/recommended_special.png'),
} as const;

// Rough heuristic for the loading overlay's progress bar (current-surah
// levels fetch + one batched phase-0 fetch, cache-first) — not a measured
// average, just a starting point. Tune from real timings once observed.
const MAP_LOAD_ESTIMATE_MS = 1400;

// ── Types ─────────────────────────────────────────────────────────
interface Props { navigation: MapNavProp }
// 'pending' = a surah's first level, not yet fetched from the backend. It's
// never actually locked server-side (no cross-surah gate exists), so it
// stays tappable — tapping fetches it on demand instead of blocking. Real
// 'locked' is reserved for non-first levels awaiting the previous level's
// completion, and is the only status that renders differently (lock icon).
type NodeStatus = 'completed' | 'current' | 'available' | 'locked' | 'pending';

interface SectionNode {
  id: string; x: number; y: number;
  status: NodeStatus; stars: number; levelNum: number;
  startAyah?: number; endAyah?: number;
  resolved?: boolean;
  // Review level — interleaved one after every 2 normal levels (a trailing
  // odd normal level gets its own solo review), not appended once at the
  // end. Seeded from the static def (so it renders before backend data
  // resolves), overridden by the real `is_special` field once a level fetch
  // lands.
  isSpecial?: boolean;
}
interface Section {
  surahNum: number; name: string; arabicName: string; ayahCount: number;
  nodes: SectionNode[];
}

// ── Section definitions — semantic data, NO pixel coordinates ─────
// To add a level: append to `levels[]` and `xFractions[]`.
// To add a surah: append a new entry. Layout recalculates automatically.
interface SectionDef {
  surahNum: number; name: string; arabicName: string; ayahCount: number;
  levels: Array<{ id: string; levelNum: number; isSpecial?: boolean }>;
  xFractions: number[];  // x position of each level's node as fraction of map width
}

// Deterministic left/right zigzag fallback for surahs without a hand-tuned
// xFractions array (see the module note below `SECTIONS_DEF`) — same
// sine-hash trick the decoration placement code uses further down, kept
// local since this runs before that code is defined.
function defaultXFractions(surahNum: number, count: number): number[] {
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
function reviewXFraction(surahNum: number, afterGroup: number): number {
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
function chapterXFraction(posInChapter: number): number {
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
function buildLevelsWithReviews(
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

const SECTIONS_DEF: SectionDef[] = [
  {
    // 6 ayahs ÷ 2 = 3 groups: 1-2, 3-4, 5-6. Reviews interleave after every
    // 2 groups plus a trailing solo — 3 groups means one paired review
    // (after g2) and one solo review (after g3), 5 nodes total. Hand-tuned
    // xFractions cover only the 3 normal groups; review positions are
    // always hashed (see buildLevelsWithReviews).
    surahNum: 114, name: 'An-Nas', arabicName: 'الناس', ayahCount: 6,
    ...buildLevelsWithReviews(114, 6, [0.55, 0.20, 0.62]),
  },
  {
    // 5 ayahs ÷ 2 = 3 groups: 1-2, 3-4, 5
    surahNum: 113, name: 'Al-Falaq', arabicName: 'الفلق', ayahCount: 5,
    ...buildLevelsWithReviews(113, 5, [0.35, 0.68, 0.28]),
  },
  {
    // 4 ayahs ÷ 2 = 2 groups: 1-2, 3-4 — exactly one pair, one review, no
    // trailing solo.
    surahNum: 112, name: 'Al-Ikhlas', arabicName: 'الإخلاص', ayahCount: 4,
    ...buildLevelsWithReviews(112, 4, [0.60, 0.22]),
  },
  {
    // 5 ayahs ÷ 2 = 3 groups: 1-2, 3-4, 5
    surahNum: 111, name: 'Al-Masad', arabicName: 'المسد', ayahCount: 5,
    ...buildLevelsWithReviews(111, 5, [0.65, 0.28, 0.62]),
  },
  {
    // 3 ayahs ÷ 2 = 2 groups: 1-2, 3 — one pair, one review.
    surahNum: 110, name: 'An-Nasr', arabicName: 'النصر', ayahCount: 3,
    ...buildLevelsWithReviews(110, 3, [0.38, 0.72]),
  },
  {
    // 6 ayahs ÷ 2 = 3 groups: 1-2, 3-4, 5-6
    surahNum: 109, name: 'Al-Kafirun', arabicName: 'الكافرون', ayahCount: 6,
    ...buildLevelsWithReviews(109, 6, [0.22, 0.65, 0.25]),
  },
  {
    // 3 ayahs ÷ 2 = 2 groups: 1-2, 3 — one pair, one review.
    surahNum: 108, name: 'Al-Kawthar', arabicName: 'الكوثر', ayahCount: 3,
    ...buildLevelsWithReviews(108, 3, [0.45, 0.72]),
  },
  // ── Below this point: surahs added when the backend expanded the MVP
  // curriculum from 10 to 21 surahs. No hand-tuned xFractions yet — these
  // use the deterministic defaultXFractions() fallback instead (see note
  // above), sized to the normal-group count only (Math.ceil(ayahCount/2)) —
  // buildLevelsWithReviews adds the interleaved reviews' own hashed
  // positions on top. Season grouping is 3 surahs/season (see PHASE_SIZES
  // in mapPhases.ts), continuing the same top-to-bottom, highest-to-lowest
  // surah-number order as the original 7. ──
  { surahNum: 107, name: "Al-Ma'un", arabicName: 'الماعون', ayahCount: 7,
    ...buildLevelsWithReviews(107, 7, defaultXFractions(107, 4)) },
  { surahNum: 106, name: 'Quraysh', arabicName: 'قريش', ayahCount: 4,
    ...buildLevelsWithReviews(106, 4, defaultXFractions(106, 2)) },
  { surahNum: 105, name: 'Al-Fil', arabicName: 'الفيل', ayahCount: 5,
    ...buildLevelsWithReviews(105, 5, defaultXFractions(105, 3)) },
  { surahNum: 104, name: 'Al-Humazah', arabicName: 'الهمزة', ayahCount: 9,
    ...buildLevelsWithReviews(104, 9, defaultXFractions(104, 5)) },
  { surahNum: 103, name: "Al-'Asr", arabicName: 'العصر', ayahCount: 3,
    ...buildLevelsWithReviews(103, 3, defaultXFractions(103, 2)) },
  { surahNum: 102, name: 'At-Takathur', arabicName: 'التكاثر', ayahCount: 8,
    ...buildLevelsWithReviews(102, 8, defaultXFractions(102, 4)) },
  { surahNum: 101, name: "Al-Qari'ah", arabicName: 'القارعة', ayahCount: 11,
    ...buildLevelsWithReviews(101, 11, defaultXFractions(101, 6)) },
  { surahNum: 100, name: "Al-'Adiyat", arabicName: 'العاديات', ayahCount: 11,
    ...buildLevelsWithReviews(100, 11, defaultXFractions(100, 6)) },
  { surahNum: 99, name: 'Az-Zalzalah', arabicName: 'الزلزلة', ayahCount: 8,
    ...buildLevelsWithReviews(99, 8, defaultXFractions(99, 4)) },
  { surahNum: 98, name: 'Al-Bayyinah', arabicName: 'البينة', ayahCount: 8,
    ...buildLevelsWithReviews(98, 8, defaultXFractions(98, 4)) },
  { surahNum: 97, name: 'Al-Qadr', arabicName: 'القدر', ayahCount: 5,
    ...buildLevelsWithReviews(97, 5, defaultXFractions(97, 3)) },
  // 96 (Al-'Alaq) intentionally excluded from the MVP curriculum.
  { surahNum: 95, name: 'At-Tin', arabicName: 'التين', ayahCount: 8,
    ...buildLevelsWithReviews(95, 8, defaultXFractions(95, 4)) },
  { surahNum: 94, name: 'Ash-Sharh', arabicName: 'الشرح', ayahCount: 8,
    ...buildLevelsWithReviews(94, 8, defaultXFractions(94, 4)) },
  { surahNum: 93, name: 'Ad-Duha', arabicName: 'الضحى', ayahCount: 11,
    ...buildLevelsWithReviews(93, 11, defaultXFractions(93, 6)) },
];

// Seasons (phases) — pure loading/pacing grouping, not an access gate. Pure
// data derived from SECTIONS_DEF, so it doesn't depend on screen width.
const PHASE_GROUPS: number[][] = groupIntoPhases(SECTIONS_DEF.map(d => d.surahNum));
// Phases double as "seasons" now — surah number -> season index (0,1,2).
const SURAH_TO_SEASON: Record<number, number> = {};
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
const NODES_PER_CHAPTER = 30;

// Every level across every surah, in the same top-to-bottom order
// SECTIONS_DEF already defines, flattened past surah boundaries — this is
// the thing that actually gets cut into NODES_PER_CHAPTER-sized chapters.
interface FlatLevel {
  surahNum: number; name: string; arabicName: string; ayahCount: number;
  level: { id: string; levelNum: number; isSpecial?: boolean };
}
const ALL_FLAT_LEVELS: FlatLevel[] = SECTIONS_DEF.flatMap(def =>
  def.levels.map(lvl => ({
    surahNum: def.surahNum, name: def.name, arabicName: def.arabicName, ayahCount: def.ayahCount, level: lvl,
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
type ChapterSlot =
  | { kind: 'level'; flat: FlatLevel }
  | { kind: 'gate'; unlocksSeasonIdx: number };
const CHAPTER_SLOTS: ChapterSlot[][] = (() => {
  const chapters: ChapterSlot[][] = [[]];
  let levelCountInChapter = 0;
  let prevSeason: number | null = null;
  for (const flat of ALL_FLAT_LEVELS) {
    const season = SURAH_TO_SEASON[flat.surahNum] ?? 0;
    if (prevSeason != null && season !== prevSeason) {
      chapters[chapters.length - 1].push({ kind: 'gate', unlocksSeasonIdx: season });
    }
    if (levelCountInChapter >= NODES_PER_CHAPTER) {
      chapters.push([]);
      levelCountInChapter = 0;
    }
    chapters[chapters.length - 1].push({ kind: 'level', flat });
    levelCountInChapter++;
    prevSeason = season;
  }
  return chapters;
})();
const CHAPTER_COUNT = CHAPTER_SLOTS.length;
// A trailing gate can occasionally push one chapter to 31 slots instead of
// 30 (whenever a season boundary lands exactly on the 30th level) — MAP_H
// (see buildMapModel) is sized off this MAX, not the flat 30 target, so
// every chapter still gets the exact same fixed canvas regardless of which
// one, if any, happened to need the extra slot.
const MAX_CHAPTER_SLOTS = Math.max(NODES_PER_CHAPTER, ...CHAPTER_SLOTS.map(c => c.length));

// Surah -> the chapter its FIRST level lands in. A surah can now be split
// across a chapter boundary, so this is necessarily an approximation for a
// split surah — but it matches the precision the rest of this screen already
// works at (the recommendation itself is only ever a surah number, not a
// specific level; see recommended?.surah_number below), so it's not losing
// anything a split surah wouldn't already have been ambiguous about.
const SURAH_TO_CHAPTER: Record<number, number> = {};
CHAPTER_SLOTS.forEach((slots, chapterIdx) => {
  slots.forEach(slot => {
    if (slot.kind === 'level' && !(slot.flat.surahNum in SURAH_TO_CHAPTER)) {
      SURAH_TO_CHAPTER[slot.flat.surahNum] = chapterIdx;
    }
  });
});

// Which season indices a chapter's content actually touches — replaces the
// old CHAPTER_SEASONS (a chapter used to BE a fixed set of whole seasons;
// now it's whatever seasons happen to fall inside its slice, which can be a
// partial season at either edge). Used only to decide which seasons' data to
// prefetch for the chapter on screen — partial-or-whole doesn't matter for
// that, the fetch is per-season regardless.
const CHAPTER_SEASON_INDICES: number[][] = CHAPTER_SLOTS.map(slots => {
  const seasons = new Set<number>();
  slots.forEach(slot => { if (slot.kind === 'level') seasons.add(SURAH_TO_SEASON[slot.flat.surahNum] ?? 0); });
  return Array.from(seasons).sort((a, b) => a - b);
});

// ── Pure helpers with no width dependency ──────────────────────────
// Deterministic pseudo-scatter (no Math.random — same input always gives
// the same layout, so cloud banks/parallax puffs don't reshuffle on re-render).
function hash(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
function pickEvenly<T>(arr: T[], count: number): T[] {
  if (arr.length <= count) return arr;
  return Array.from({ length: count }, (_, i) =>
    arr[Math.round(i * (arr.length - 1) / Math.max(count - 1, 1))],
  );
}
interface Zone { y: number; side: 'left' | 'right'; height: number }
function isBlocked(y: number, side: 'left' | 'right', h: number, zones: Zone[], gap = 8): boolean {
  return zones.some(z => z.side === side && Math.abs(z.y - y) < (z.height + h) / 2 + gap);
}
function stageToNodeStatus(s: string): NodeStatus {
  if (s === 'completed') return 'completed';
  if (s === 'in_progress') return 'current';
  if (s === 'available') return 'available';
  return 'locked';
}

function formatAyahRange(from: number, to: number): string {
  return from === to ? `Ayah ${from}` : `Ayahs ${from}-${to}`;
}

// Fallback ayah-range estimate for a node before its real start_ayah/end_ayah
// resolve from the backend. Both normal and review nodes are a uniform
// 2-ayah-per-group slot now — a review's own levelNum (see
// buildLevelsWithReviews) is the index of the last normal group it covers,
// so the same per-group formula applies to it directly; the only wrinkle is
// a paired review (levelNum even) spanning the two groups ending there
// instead of just the one a normal node of that levelNum would cover.
function estimateAyahRange(levelNum: number, ayahCount: number, isSpecial?: boolean): { from: number; to: number } {
  const fromGroup = isSpecial && levelNum % 2 === 0 ? levelNum - 1 : levelNum;
  return { from: (fromGroup - 1) * 2 + 1, to: Math.min(levelNum * 2, ayahCount) };
}

// ── Types for the fully-computed, width-dependent map model ────────
interface DecorBird    { y: number; x: number }
interface DecorSeasonGate { x: number; y: number; w: number; h: number; unlocksSeasonIdx: number }
interface LabelBox { x: number; y: number; w: number; h: number; isLeft: boolean }
interface PillBox { x: number; y: number; w: number; h: number }
/** Where the "Begin/Continue here" tag hangs off its node. `left` is an
 * offset from the node's own left edge (the tag's wrapper is a child of the
 * node), so it can legitimately be negative for a tag on the node's left. */
interface TagPlacement {
  left: number;
  alignItems: 'flex-start' | 'flex-end' | 'center';
  above: boolean;
}

interface MapModel {
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
// height as a fraction of width, measured off the source design's card rect
// (392×179, i.e. the rounded-rect shape itself, not its viewBox — the
// viewBox padding is just drop-shadow bleed, which an RN shadow doesn't need
// extra canvas for). Every internal element (title, subtitle, button) is then
// positioned as a percentage of this fixed box in makeStyles/LevelActionCard,
// so scaling ACTION_CARD_W scales the whole card uniformly instead of each
// piece being sized off its own independent sc() constant.
const ACTION_CARD_ASPECT = 179 / 392;

// ── ONE function: real device width (+ viewport height) in → every pixel of
// the map's layout out. Nothing derived here is a module-level constant
// anymore — it's all recomputed whenever width/height change (see
// useWindowDimensions in the component), so split-screen/foldable/rotation
// resizes actually relayout instead of leaving a stale frozen width baked in
// from first mount.
function buildMapModel(mapW: number, viewportH: number, chapterIdx: number): MapModel {
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
  const FOOTER_PAD    = sc(260);
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
      isSpecial: flat.level.isSpecial,
    });
  });
  if (currentSection) BASE_SECTIONS.push(currentSection);
  const ALL_NODES = BASE_SECTIONS.flatMap(s => s.nodes);

  // The curriculum isn't full yet — the final chapter can come up short of
  // MAX_CHAPTER_SLOTS (116 real levels ÷ 30 = 3 full chapters + a 26-level
  // remainder, as of the 21-surah MVP). MAP_H is already sized for the max
  // regardless (see above), so a short chapter's real content just stops
  // early within that same fixed canvas — show a banner centered in the
  // untouched remainder instead of leaving it looking simply empty.
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

  // Jagged grass edge — a torn/uneven line instead of a dead-flat cut, as if
  // the grass texture were cut into the sky rather than pasted under it.
  // Deterministic (hash-seeded), so it doesn't reshuffle on re-render.
  const edgeStep = sc(16), edgeAmp = sc(9);
  let GRASS_EDGE_D = `M 0 ${Math.round(SKY_BOUNDARY_Y + (hash(0) - 0.5) * edgeAmp * 2)}`;
  {
    let seed = 1;
    // <= mapW, not <, so the jagged line's last vertex lands exactly on the
    // right edge instead of stopping one step short — a short-stop left the
    // closing `L mapW SKY_BOUNDARY_Y` segment cutting straight across at the
    // flat boundary y, past the last jagged point, which on some widths (the
    // step doesn't divide mapW evenly) opened a sliver gap between the
    // jagged edge and the tile's true right edge for the sky to leak
    // through.
    for (let x = edgeStep; x <= mapW; x += edgeStep) {
      const ey = SKY_BOUNDARY_Y + (hash(seed) - 0.5) * edgeAmp * 2;
      GRASS_EDGE_D += ` L ${Math.round(x)} ${Math.round(ey)}`;
      seed++;
    }
  }
  GRASS_EDGE_D += ` L ${mapW} ${SKY_BOUNDARY_Y} L ${mapW} ${MAP_H} L 0 ${MAP_H} Z`;

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

// ── Styles that depend on the model's `sc()` — rebuilt via useMemo whenever
// the model changes (i.e. whenever screen width changes). ──
function makeStyles(M: MapModel) {
  const { sc, NODE_SIZE, ACTION_CARD_W, ACTION_CARD_H, NODE_TAG_W } = M;
  // Fractions of ACTION_CARD_W, not independent sc() constants — every piece
  // of the action card scales off the same one number, so it can never drift
  // out of proportion with the fixed card box the way separately-tuned sc()
  // values could. RN doesn't accept percentage strings for fontSize/
  // borderRadius/shadowRadius, so those are computed here as plain numbers;
  // layout box positions below (top/left/width/height) use real percentage
  // strings since RN resolves those against the card's own fixed dimensions.
  const acw = (fraction: number) => Math.round(ACTION_CARD_W * fraction);
  const S = StyleSheet.create({
    // Ground green, not sky blue — this is the fallback fill for whatever
    // isn't covered by the sky backdrop or the map's own content (e.g.
    // bottom overscroll bounce). It should never read as "the sky leaking
    // through at the bottom."
    container: { flex: 1, backgroundColor: colors.mapBg },
    // Absolute + zIndex so this sits on top of the ScrollView instead of
    // pushing it down, letting the map scroll freely underneath it.
    hud: {
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 15,
      overflow: 'hidden',
      paddingHorizontal: sc(16), paddingVertical: sc(6),
    },
    hudRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    hudPill: {
      flexDirection: 'row', alignItems: 'center', gap: sc(4),
      backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: sc(20),
      paddingHorizontal: sc(10), paddingVertical: sc(5),
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 3,
    },
    hudVal: { fontFamily: 'Nunito_700Bold', fontSize: sc(12), color: '#DC2626' },
    hudStreakIcon: { width: sc(16), height: sc(16) },
    loadingOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(42,140,90,0.72)', zIndex: 20,
    },
    // Opaque variant for the initial load — see the comment at its use site.
    loadingOverlaySolid: { backgroundColor: colors.mapBg },
    loadingOverlayText: { fontFamily: 'Nunito_700Bold', fontSize: sc(13), color: '#fff', marginTop: sc(10) },
    node: { width: NODE_SIZE, height: NODE_SIZE, alignItems: 'center', justifyContent: 'center' },
    nodeImg: { position: 'absolute', width: NODE_SIZE, height: NODE_SIZE },
    // No top/left set, so `node`'s own alignItems/justifyContent:'center'
    // still centers this larger box — no manual offset math needed.
    nodeImgRecommendedSpecial: { width: NODE_SIZE * 1.3, height: NODE_SIZE * 1.3 },
    nodeShadow: {
      position: 'absolute', bottom: -sc(4), width: NODE_SIZE * 0.8, height: sc(10), borderRadius: sc(6),
      backgroundColor: 'rgba(0,0,0,0.25)', left: NODE_SIZE * 0.1,
    },
    nodeNumber: { fontFamily: 'Nunito_700Bold', fontSize: sc(20), color: 'white', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    lockIcon: { fontSize: sc(18) },
    nodeWrapper: { alignItems: 'center' },
    // The tag is absolutely positioned BESIDE the node, never in normal flow.
    //
    // It used to be an in-flow child rendered before the node, which meant the
    // one node carrying a tag was pushed down by the tag's height and sat off
    // the road while every other node stayed at its own `node.y`. Taking it out
    // of flow is what makes node position independent of whether a tag exists.
    //
    // An explicit NODE_TAG_W-wide box, NOT a shrink-wrapping one. The wrapper
    // this sits in is only NODE_SIZE wide (it hugs the node), so an absolute
    // child offset past NODE_SIZE used to be handed a NEGATIVE available
    // width and collapsed to near-nothing — that, not the maxWidth, is what
    // truncated the label to "Conti…". A declared width overflows the narrow
    // parent instead of being squeezed by it (nothing up the tree clips).
    // `left` and `alignItems` come per-instance from nodeTagPlacement().
    nodeTagWrap: { position: 'absolute', width: NODE_TAG_W },
    // Beside the node: same vertical center as the node itself. nodeWrapper's
    // only in-flow child is the node, so the wrapper box is exactly NODE_SIZE
    // tall and centering here needs no measurement of the tag.
    nodeTagWrapBeside: { top: 0, height: NODE_SIZE, justifyContent: 'center' },
    // Above the node, used only when a surah-name scroll occupies the one
    // side that had room (see nodeTagPlacement). Anchored by `bottom` so the
    // tag's own height doesn't need to be known: sc(14) of clear air between
    // the tag's underside and the node's top edge, which also clears the
    // scroll art's top (it starts sc(8) above the node).
    nodeTagWrapAbove: { bottom: NODE_SIZE + sc(14) },
    // White with black text always (never tints with Begin/Continue state) so
    // it reads as a clickable label/tooltip rather than a status pill, drawing
    // the eye the way a real callout would. maxWidth matches NODE_TAG_W so the
    // placement test upstream can never disagree with the rendered width.
    nodeTag: {
      maxWidth: NODE_TAG_W, backgroundColor: 'white', borderRadius: sc(10),
      paddingHorizontal: sc(9), paddingVertical: sc(4),
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4,
    },
    nodeTagText: { fontFamily: 'Nunito_700Bold', fontSize: sc(10), color: '#1A1A1A', letterSpacing: 0.2 },
    starsBadge: { position: 'absolute', bottom: -sc(6), backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: sc(8), paddingHorizontal: sc(4), paddingVertical: sc(1) },
    starsText: { fontSize: sc(8), color: '#FFD700' },
    // alignItems:'stretch' (not 'center') so the Text has a real width to
    // measure against — same fix as SL.labelBox below: without it,
    // adjustsFontSizeToFit never triggers and wider ranges (e.g. "Ayahs
    // 111–112") overflow the pill art instead of shrinking to fit.
    ayahPill: { alignItems: 'stretch', justifyContent: 'center', paddingHorizontal: sc(4) },
    ayahPillText: {
      fontFamily: 'Nunito_700Bold', fontSize: sc(10), color: '#3B2A12', textAlign: 'center',
      textShadowColor: 'rgba(255,255,255,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
    },
    // Bigger than before (72→96 glow, 66→84 image) while keeping the image
    // inset inside the glow circle rather than filling it edge to edge —
    // 6px of padding on all sides between the image and the circle's rim.
    lumaGlow: {
      width: sc(96), height: sc(96), borderRadius: sc(48),
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#fff', shadowOpacity: 0.6, shadowRadius: 8, elevation: 5,
    },
    lumaImg: { width: sc(84), height: sc(84) },
    endText: { fontFamily: 'Nunito_700Bold', fontSize: sc(11), color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: sc(4) },
    // The big "Coming soon!" banner filling a short final chapter's unused
    // reserved space (see comingSoonY) — deliberately much larger than
    // endText above, which is a small footer note, not a banner.
    comingSoonBanner: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    comingSoonText: {
      fontFamily: 'Nunito_700Bold', fontSize: sc(28), color: 'rgba(255,255,255,0.85)',
      textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
    },
    // ── Chapter paging — both signs side by side at the bottom, wooden
    // signpost art, same material as the season gate signs, text baked into
    // the image. Row is centered + gap-based so it re-centers responsively
    // instead of relying on fixed left/right offsets. ──
    chapterSignRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: sc(16), marginTop: sc(6) },
    chapterSignCol: { alignItems: 'center' },
    chapterSignCaption: {
      fontFamily: 'Nunito_700Bold', fontSize: sc(12), color: colors.darkText,
      marginTop: sc(2), textShadowColor: 'rgba(255,255,255,0.8)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 0 },
    },
    // Floats over the NEXT sign's top-right corner (not stacked above it) so
    // its image stays level with the PREVIOUS sign, which has no badge.
    chapterNewBadgeFloat: {
      position: 'absolute', top: sc(-10), right: sc(-6), zIndex: 2,
      backgroundColor: '#FFD34D', borderRadius: sc(8),
      paddingHorizontal: sc(8), paddingVertical: sc(2),
    },
    chapterNewBadgeText: { fontFamily: 'Nunito_700Bold', fontSize: sc(10), color: '#3B2A12', letterSpacing: 0.6 },
    unlockBtn: {
      marginTop: sc(6), backgroundColor: colors.primary, borderRadius: sc(14),
      paddingHorizontal: sc(16), paddingVertical: sc(8),
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5,
    },
    unlockBtnText: { fontFamily: 'Nunito_700Bold', fontSize: sc(13), color: 'white' },
    unlockDismiss: {
      marginTop: sc(6), backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: sc(14),
      paddingHorizontal: sc(16), paddingVertical: sc(8),
    },
    unlockDismissText: { fontFamily: 'Nunito_700Bold', fontSize: sc(13), color: colors.midText },
    actionCard: {
      width: ACTION_CARD_W, height: ACTION_CARD_H,
      borderRadius: acw(0.087), borderWidth: 1.5,
      shadowColor: '#000', shadowOffset: { width: 0, height: acw(0.043) }, shadowOpacity: 0.25, shadowRadius: acw(0.061), elevation: 10,
    },
    actionCardStart: { backgroundColor: colors.levelStartAccent, borderColor: colors.levelStartAccent },
    actionCardRepeat: { backgroundColor: colors.levelRepeatBg, borderColor: colors.levelRepeatBorder },
    actionCardClose: {
      position: 'absolute', top: '5%', right: '5%', width: acw(0.09), height: acw(0.09),
      alignItems: 'center', justifyContent: 'center', zIndex: 1,
    },
    actionCardCloseText: { fontSize: acw(0.05), fontFamily: 'Nunito_700Bold' },
    // Title/subtitle/button all sit in absolutely-positioned percentage boxes
    // (percentages resolved against the fixed actionCard width/height above)
    // instead of normal flex flow, so their position stays locked to the
    // card's proportions no matter how long the surah name or ayah range is.
    // Title is narrower than subtitle/button (78% vs 92%) so a long surah
    // name shrinks-to-fit within its own lane instead of running under the
    // close button sitting in the top-right corner.
    actionCardTitleBox: { position: 'absolute', left: '4%', top: '14%', width: '78%' },
    actionCardTitle: { fontFamily: 'Nunito_700Bold', fontSize: acw(0.07) },
    actionCardSubtitleBox: { position: 'absolute', left: '4%', top: '34%', width: '92%' },
    actionCardSubtitle: { fontFamily: 'Nunito_700Bold', fontSize: acw(0.052), opacity: 0.7 },
    actionCardBtn: {
      // top nudged down from 51% (height trimmed to match, 31%→28%, so the
      // bottom edge — and the card's own bottom margin — stays put) to open
      // up more breathing room under the ayah-range subtitle, which sat
      // right on top of the button before.
      position: 'absolute', left: '4%', top: '54%', width: '92%', height: '28%',
      borderRadius: acw(0.052), alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: acw(0.017) }, shadowOpacity: 0.2, shadowRadius: acw(0.026), elevation: 4,
    },
    actionCardBtnText: { fontFamily: 'Nunito_700Bold', fontSize: acw(0.057), letterSpacing: 0.3 },
  });
  const SL = StyleSheet.create({
    // width:'100%' + alignItems:'stretch' (not 'center') is required, not
    // decorative — the Text needs a real width to measure against, or
    // `adjustsFontSizeToFit` never triggers and longer names (Al-Ikhlas,
    // Al-Kafirun) overflow the scroll art instead of shrinking to fit.
    labelBox: { width: '100%', alignItems: 'stretch', justifyContent: 'center', paddingHorizontal: sc(10) },
    english: {
      fontFamily: 'Nunito_700Bold', fontSize: sc(17), color: '#FFFFFF', letterSpacing: 0.4,
      textAlign: 'center',
      textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
    },
  });
  const SB = StyleSheet.create({
    wrapper: { alignItems: 'center', marginBottom: sc(2) },
    bubble: {
      backgroundColor: 'white', borderRadius: sc(12),
      paddingHorizontal: sc(12), paddingVertical: sc(8), maxWidth: sc(160),
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4,
    },
    text: { fontFamily: 'Nunito_700Bold', fontSize: sc(10), color: '#374151', textAlign: 'center', lineHeight: sc(14) },
    tail: {
      width: 0, height: 0,
      borderLeftWidth: sc(7), borderRightWidth: sc(7), borderTopWidth: sc(8),
      borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'white',
    },
  });
  return { S, SL, SB };
}
type Styles = ReturnType<typeof makeStyles>;

// ── Speech bubble — pure CSS, sizes to text content ───────────────
// tailAngle rotates the tail away from its default straight-down point —
// Lumo stands beside the active node (left or right, see scrollIsLeft), not
// under it, so a straight-down tail pointed at Lumo's own head instead of
// what the speech is actually about. Rotating it toward whichever side the
// node is on (the opposite side from Lumo) reads as "pointing at the node"
// without needing to reposition the bubble itself off of Lumo.
function SpeechBubble({ text, SB, tailAngle }: { text: string; SB: Styles['SB']; tailAngle?: number }) {
  return (
    <View style={SB.wrapper}>
      <View style={SB.bubble}>
        <Text style={SB.text}>{text}</Text>
      </View>
      <View style={[SB.tail, tailAngle ? { transform: [{ rotate: `${tailAngle}deg` }] } : null]} />
    </View>
  );
}

// ── Surah name label — scroll art behind Arabic + English name ───────────
function SurahLabel({ name, box, SL }: {
  name: string; box: LabelBox; sc: (n: number) => number; SL: Styles['SL'];
}) {
  return (
    <View style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={SCROLL_SRC} resizeMode="contain" style={{ position: 'absolute', width: box.w, height: box.h }} />
      <View style={SL.labelBox}>
        <Text style={SL.english} numberOfLines={1} adjustsFontSizeToFit>{name}</Text>
      </View>
    </View>
  );
}

// ── Pathway — the walkable road itself, textured with the brick pattern.
// One function so the whole road is a single reusable unit; every dimension
// comes from `sc()`, so it resizes with the model instead of being frozen at
// whatever width the app first mounted at. ──
function Pathway({ d, sc, patternId }: { d: string; sc: (n: number) => number; patternId: string }) {
  return (
    <G>
      {/* Beveled undercoat so the road reads as carved into the ground —
          kept light so it doesn't read as a heavy shadow. */}
      <Path d={d} stroke="rgba(60,38,8,0.14)" strokeWidth={sc(64)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={d} stroke="rgba(60,38,8,0.18)" strokeWidth={sc(50)} fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(0, ${sc(2)})`} />
      {/* Brick texture — the actual walkable surface */}
      <Path d={d} stroke={`url(#${patternId})`} strokeWidth={sc(40)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={d} stroke="rgba(20,10,4,0.14)" strokeWidth={sc(3)} fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(0, ${sc(2)})`} />
      {/* Thin top-edge highlight for a subtle 3D pop */}
      <Path d={d} stroke="rgba(255,248,220,0.32)" strokeWidth={sc(3)} fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(0, ${-sc(1)})`} />
    </G>
  );
}

// ── Map node — one visual shell for every non-completed/non-green status.
// The ONLY differentiator for a real locked gate is the lock icon; nothing
// is dimmed/faded anymore (dimming previously read as "broken", not "locked"). ──
function MapNode({ status, stars, goldAnim, levelNum, isFetching, isSpecial, tagLabel, tagPlacement, S }: {
  status: NodeStatus; stars: number;
  goldAnim: Animated.Value;
  levelNum: number; isFetching?: boolean; isSpecial?: boolean;
  // "Begin here" (never completed a level yet) / "Continue here" (returning
  // user) — shown only on the one node the backend recommends next.
  // Undefined everywhere else.
  tagLabel?: string;
  // Where the tag hangs relative to the node. Decided by the caller, which is
  // the only place that knows MAP_W, this node's x, and where the surah-name
  // scroll sits — see nodeTagPlacement().
  tagPlacement?: TagPlacement;
  S: Styles['S'];
}) {
  const goldScale  = goldAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  // Special/review (collective) node art, by status:
  //   completed → gold special_done.png
  //   locked    → plain green node_current.png. Green keeps it visually
  //               distinct as "special" even while locked, but without the
  //               star, which clashes with the 🔒 overlay drawn below.
  //   open      → recommended_special.png (green + star). Every reachable
  //               review node gets the star now, not only the backend's
  //               recommended-next one: the old "merely unlocked" art
  //               (special.png) is byte-identical to node_current.png, so
  //               that case rendered as a blank green tile indistinguishable
  //               from a locked node minus its padlock.
  //
  // The pulse ring that used to sit behind reachable special nodes is gone
  // (removed 2026-08-28, user: "not working anyway") — the star art and the
  // white "Begin/Continue here!" tag are the visual cues now.
  const nodeImgSrc = isSpecial
    ? (status === 'completed' ? NODE_SRCS.specialDone
      : status === 'locked' ? NODE_SRCS.current
      : NODE_SRCS.recommendedSpecial)
    : (status === 'completed' ? NODE_SRCS.completed : NODE_SRCS.locked);

  return (
    <View style={S.nodeWrapper}>
      {!!tagLabel && !!tagPlacement && (
        <View
          style={[
            S.nodeTagWrap,
            tagPlacement.above ? S.nodeTagWrapAbove : S.nodeTagWrapBeside,
            { left: tagPlacement.left, alignItems: tagPlacement.alignItems },
          ]}
          pointerEvents="none"
        >
          {/* adjustsFontSizeToFit is the last line of defence only — the wrap
              above is a real fixed NODE_TAG_W box (it used to inherit the
              node's own NODE_SIZE-wide parent, which left it literally
              negative space to lay out in and truncated "Continue here" to
              "Conti…" on every device), so the label fits at full size. */}
          <View style={S.nodeTag}>
            <Text style={S.nodeTagText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {tagLabel}
            </Text>
          </View>
        </View>
      )}
      <View style={S.nodeShadow} />
      <Animated.View style={[
        S.node,
        status === 'completed' && { transform: [{ scale: goldScale }] },
      ]}>
        {/* recommended_special.png has substantially more baked-in
            transparent padding around its badge than every other node's
            art (node_current.png, node_locked.png, etc.) — at the same
            NODE_SIZE box that renders visibly smaller than the rest, not
            bigger despite it being the one meant to draw the eye.
            Compensating with a larger box specifically for this one
            source (not touching NODE_SIZE globally, which every other
            node also uses) so the visible badge actually matches. */}
        <Image
          source={nodeImgSrc}
          resizeMode="contain"
          style={nodeImgSrc === NODE_SRCS.recommendedSpecial ? [S.nodeImg, S.nodeImgRecommendedSpecial] : S.nodeImg}
        />
        {status === 'locked' ? (
          <Text style={S.lockIcon}>🔒</Text>
        ) : status === 'pending' && isFetching ? (
          <ActivityIndicator size="small" color="#5A3A00" />
        ) : isSpecial ? (
          // Review node: the star is already baked into
          // recommended_special.png / special_done.png, so no separate glyph
          // is drawn here.
          null
        ) : (
          <Text style={S.nodeNumber}>{levelNum}</Text>
        )}
        {status === 'completed' && stars > 0 && (
          <View style={S.starsBadge}><Text style={S.starsText}>{'★'.repeat(stars)}</Text></View>
        )}
      </Animated.View>
    </View>
  );
}

// ── Level action card — the on-map popout for "start a new level" (fresh
// node tap) and "repeat the lesson" (completed node tap), replacing what used
// to be an instant navigate / a plain text prompt. Fixed width AND height
// (see ACTION_CARD_ASPECT), with title/subtitle/button/close each positioned
// as a percentage box of that fixed frame (see makeStyles) — matches the
// source design's fixed card exactly rather than sizing to content.
//
// Scales in on mount and scales+fades out before either the close button or
// the confirm button actually does anything — the parent only clears the
// state that unmounts this (retryNodeId/startPrompt) once the shrink
// animation's callback fires, so it never just pops out of existence. ──
function LevelActionCard({
  variant, surahName, ayahFrom, ayahTo, onConfirm, onDismiss, S,
}: {
  variant: 'start' | 'repeat';
  surahName: string;
  ayahFrom: number;
  ayahTo: number;
  onConfirm: () => void;
  onDismiss: () => void;
  S: Styles['S'];
}) {
  const isStart = variant === 'start';
  const accent = isStart ? colors.levelCardOffWhite : colors.levelRepeatAccent;

  const anim = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 60 }).start();
  }, []);

  // Guarded so a close-then-confirm double-tap during the 140ms shrink can't
  // fire both actions — only the first tap's action ever runs.
  function animateOutThen(action: () => void) {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => action());
  }

  return (
    <Animated.View
      style={[
        S.actionCard, isStart ? S.actionCardStart : S.actionCardRepeat,
        { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }] },
      ]}
    >
      <TouchableOpacity
        style={S.actionCardClose}
        onPress={() => animateOutThen(onDismiss)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={[S.actionCardCloseText, { color: accent }]}>✕</Text>
      </TouchableOpacity>
      <View style={S.actionCardTitleBox}>
        <Text style={[S.actionCardTitle, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
          Surah {surahName}
        </Text>
      </View>
      <View style={S.actionCardSubtitleBox}>
        <Text style={[S.actionCardSubtitle, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
          {formatAyahRange(ayahFrom, ayahTo)}
        </Text>
      </View>
      <TouchableOpacity
        style={[S.actionCardBtn, { backgroundColor: isStart ? colors.levelCardOffWhite : colors.levelRepeatAccent }]}
        onPress={() => animateOutThen(onConfirm)}
        activeOpacity={0.85}
      >
        <Text style={[S.actionCardBtnText, { color: isStart ? colors.levelStartAccentText : colors.white }]}>
          {isStart ? 'START A NEW LEVEL' : 'REPEAT THE LESSON'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Luma mascot ───────────────────────────────────────────────────
function LumaFloat({ style, speech, speechTailAngle, S, SB, sc }: { style?: object; speech?: string; speechTailAngle?: number; S: Styles['S']; SB: Styles['SB']; sc: (n: number) => number }) {
  return (
    <View style={[{ alignItems: 'center' }, style]}>
      {speech && <SpeechBubble text={speech} SB={SB} tailAngle={speechTailAngle} />}
      <View style={S.lumaGlow}>
        <Image
          source={require('../../../assets/images/lumo_kufi.png')}
          style={S.lumaImg}
          resizeMode="contain"
        />
      </View>
      {/* Ground contact shadow — fixed, doesn't bob with ty (translateY
          above) so it reads as Lumo lifting off his own shadow rather than
          the shadow floating with him. Normal flow (not MascotShadow's
          default absolute-under-the-Image), pulled up under the glow
          circle's base via negative margin instead. */}
      <MascotShadow width={sc(96)} style={{ position: 'relative', marginTop: -sc(10) }} />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────
export default function MapScreen({ navigation }: Props) {
  // Per-mount-unique so SVG pattern ids below never collide with a previous
  // mount's — react-native-svg mis-resolves url(#id) refs when the same id
  // exists more than once at once, which happens on remount (leave the map,
  // come back) since tileIdx alone always restarts at 0. Random rather than
  // an incrementing counter: a counter only guards against collisions within
  // one JS engine lifetime — if the JS context itself ever gets recreated
  // while stale native SVG views haven't fully torn down yet (more of a risk
  // under real-device memory pressure than in an emulator), a counter would
  // restart at 1 and collide with the app's own earlier mount. Random has no
  // such reset point.
  const mapInstanceId = useRef(Math.random().toString(36).slice(2)).current;
  const insets = useSafeAreaInsets();
  const { user, learning, refreshLearning } = useAuthStore();
  // Never earned any XP yet = never actually completed a level (guests
  // included — their XP is computed the same way, just unbanked). Drives
  // "Begin here" vs "Continue here" on the recommended node's tag below.
  const hasAnyProgress = (learning?.xp_total ?? 0) > 0;
  // Guest streak/XP are never banked (see utils/guest.ts) — the HUD pills
  // show dashes instead of the backend's computed-but-not-saved numbers, and
  // tapping either pitches account creation instead of opening the real
  // Streak page.
  const isGuestUser = isGuest(user);
  const [guestPromptVisible, setGuestPromptVisible] = useState(false);
  const { width, height } = useWindowDimensions();
  // Forces a re-render when prefetchAll()'s recommendedNext() resolves in the
  // background (it's fire-and-forget, so nothing else triggers one) — without
  // this, Lumo's position can go stale until some unrelated state change
  // happens to re-render the screen.
  const [, forceRecommendedTick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeRecommended(() => forceRecommendedTick()), []);
  // "You opened the map and your streak is frozen" — shown once per freeze
  // occurrence (see checkStreakFrozenPopup's AsyncStorage-backed gate), not
  // once per map visit. Re-checks whenever streak_state changes under this
  // screen (a poll/foreground refresh can flip it while the map stays open),
  // not just on first mount.
  const [frozenPopupVisible, setFrozenPopupVisible] = useState(false);
  useEffect(() => {
    if (!learning) return;
    void (async () => {
      const shouldShow = await checkStreakFrozenPopup(learning.streak_state ?? 'active');
      if (shouldShow) setFrozenPopupVisible(true);
    })();
  }, [learning?.streak_state]);
  // ── Which chapter (3-season slice) is laid out right now ──────────
  // Seeded from the boot cache so a warm start renders the right chapter on
  // the very first frame; corrected by the resolve effect below when the
  // recommendation only lands after a network round-trip. Paging with the
  // signs at the top/bottom of the map sets it directly.
  const [chapterIdx, setChapterIdx] = useState(() => {
    const surah = getCachedRecommended()?.surah_number;
    return surah != null ? (SURAH_TO_CHAPTER[surah] ?? 0) : 0;
  });
  // False only across a cold start where the recommendation wasn't cached
  // yet when chapterIdx was seeded above — set true once the resolve effect
  // below has confirmed (or corrected) which chapter that recommendation
  // actually lands in. Keeps the loading overlay up until then, so a
  // cold-start correction jumps chapters behind the scrim instead of
  // flashing the wrong chapter's map first.
  const [chapterResolved, setChapterResolved] = useState(() => getCachedRecommended() != null);
  // Last recommended surah the chapter was auto-moved for — so a changing
  // recommendation (finishing the last level of a chapter) follows the user
  // forward exactly once per change, rather than on every re-render.
  const appliedRecSurahRef = useRef<number | null>(null);
  // Set once the user pages by hand. From then on the map stays where they
  // put it for the rest of the session instead of being yanked back to the
  // recommendation — a fresh launch re-seeds from the cache above, which is
  // what makes "open the app, land where I am" still true.
  const manualChapterRef = useRef(false);
  // Where a chapter switch should land the viewport, consumed by the
  // chapter-jump effect. Forward reads as continuing the journey, so it opens
  // at the top; back returns you to the end of the chapter you came from.
  const chapterJumpRef = useRef<'top' | 'bottom' | null>(null);
  const M = useMemo(() => buildMapModel(width, height, chapterIdx), [width, height, chapterIdx]);
  const styles = useMemo(() => makeStyles(M), [M]);
  const { S, SL, SB } = styles;
  const {
    MAP_W, MAP_H, sc, NODE_SIZE, TOP_MARGIN, BASE_SECTIONS, DECORATIONS, comingSoonY,
    SKY_BOUNDARY_Y, GRASS_EDGE_D, SKY_CLOUDS, SKY_BIRDS, AYAH_PILLS, SURAH_LABELS,
    pathDForYRange, ACTION_CARD_W, ACTION_CARD_H, NODE_TAG_W,
  } = M;
  // Beside the node — level with it (not above, like the old retry bubble),
  // on whichever side of the road actually has room. "Parallel to the node"
  // always: same vertical center as the node, never stacked over it. The
  // card's fixed height means this centers exactly, not an approximation.
  function actionCardPosition(node: SectionNode): { left: number; top: number } {
    const margin = sc(14);
    const spaceRight = MAP_W - (node.x + NODE_SIZE + margin + ACTION_CARD_W);
    const left = spaceRight >= 0
      ? node.x + NODE_SIZE + margin
      : Math.max(sc(8), Math.min(MAP_W - ACTION_CARD_W - sc(8), node.x - margin - ACTION_CARD_W));
    const top = node.y + NODE_SIZE / 2 - ACTION_CARD_H / 2;
    return { left, top };
  }

  // Where the "Begin/Continue here" tag goes. Right of the node is the
  // default, but a side is only usable if the tag both fits inside the map
  // AND clears that surah's name scroll — which is exactly what was broken:
  // the scroll is anchored to its section's FIRST node (see SURAH_LABELS) and
  // the recommended node is very often that same node, so tag and scroll were
  // laid out on top of each other with neither aware of the other, and the
  // tag ended up reading as a torn-off label pasted across "Al-Ikhlas".
  //
  // Order of preference: right, then left, then — when the scroll occupies
  // the only side with room, which really happens (node x-centers are clamped
  // to 0.20–0.74 of MAP_W, and the scroll always takes whichever side has
  // MORE room) — above the node, clear of both.
  function nodeTagPlacement(node: SectionNode, surahNum: number): TagPlacement {
    const gap = sc(10);
    const edge = sc(6);
    const rightX = node.x + NODE_SIZE + gap;
    const leftX  = node.x - gap - NODE_TAG_W;
    const label = SURAH_LABELS[surahNum];
    // Vertical overlap is checked against the node's own band: the tag is
    // centered on the node and never taller than it.
    const labelInTheWay = label != null
      && label.y < node.y + NODE_SIZE
      && label.y + label.h > node.y;
    const clearsLabel = (x: number) =>
      !labelInTheWay || x + NODE_TAG_W <= label!.x || x >= label!.x + label!.w;
    const beside = (x: number, onLeft: boolean): TagPlacement => ({
      left: Math.round(x - node.x),
      alignItems: onLeft ? 'flex-end' : 'flex-start',
      above: false,
    });
    if (rightX + NODE_TAG_W <= MAP_W - edge && clearsLabel(rightX)) return beside(rightX, false);
    if (leftX >= edge && clearsLabel(leftX)) return beside(leftX, true);
    return { left: Math.round((NODE_SIZE - NODE_TAG_W) / 2), alignItems: 'center', above: true };
  }

  // ── Guided tour ──────────────────────────────────────────────────
  // Offered once, on a first-time user's first sight of the map. Declining
  // leaves them here with Level 1 already in reach, which is the point of
  // asking rather than imposing.
  // Lives in the tour store, not local state: the overlay that can re-open
  // this offer (hardware back on step 1) is hosted in MainTabs now, since
  // only a sibling of Tab.Navigator can paint over the tab bar.
  const tourOfferVisible = useTourStore(s => s.offerVisible);
  const setTourOfferVisible = useTourStore(s => s.setOfferVisible);
  // Separate refs (not one ref around the whole HUD row) so the tour can
  // glow the streak pill and the XP pill as two distinct targets, matching
  // how they're introduced as two separate steps.
  // 'round': S.hudPill's declared borderRadius (sc(20)) always exceeds half
  // its own rendered height, so it clamps to a full stadium regardless of sc
  // scale — matching that clamp here directly is simpler and no less
  // correct than importing sc() to restate the same number.
  const streakTarget = useTourTarget('hudStreak', 'round');
  const xpTarget = useTourTarget('hudXp', 'round');
  // Tour-only: each pill glows itself (a real border+shadow on the real
  // pill, inheriting S.hudPill's own borderRadius) exactly while the tour's
  // current step targets it — same pattern as the tab icons in MainTabs, so
  // there's no drawn ring to fall out of sync with the pill's real shape.
  const glowStreak = useTourStore(s => s.active && TOUR_STEPS[s.stepIndex]?.target === 'hudStreak');
  const glowXp = useTourStore(s => s.active && TOUR_STEPS[s.stepIndex]?.target === 'hudXp');
  // Real height of the streak/XP bar, measured after layout — needed so the
  // mountain image (see MOUNTAINS_SRC below) can start right below it
  // instead of tucking underneath and getting blurred along with the sky.
  // Estimate before the first layout pass is close enough that there's no
  // visible jump once the real measurement lands.
  const [hudHeight, setHudHeight] = useState(insets.top + sc(64));
  const startTour = useTourStore(s => s.start);

  function handleAcceptTour() {
    setTourOfferVisible(false);
    void setTourOffered();
    // TourOfferModal is a native Android dialog and is still tearing itself
    // down for a beat after `visible` flips to false, during which it keeps
    // eating touches meant for whatever comes next. Waiting out its close
    // animation before starting the tour avoids that overlap. (The tour
    // overlay itself is no longer a Modal, but this offer still is.)
    setTimeout(() => {
      startTour();
    }, 350);
  }

  function handleDeclineTour() {
    setTourOfferVisible(false);
    void setTourOffered();
  }

  // fullLevels: every group of a surah (only fetched for the current surah).
  // firstLevel: just the first group's status (fetched for every other surah,
  // one phase at a time, batched). Nodes with neither yet render 'pending'
  // (see enrichedSections below) but stay tappable — see handleNodePress.
  const [fullLevels, setFullLevels]   = useState<Record<number, SurahLevel[]>>({});
  const [firstLevel, setFirstLevel]   = useState<Record<number, SurahLevel>>({});
  const [loadingPaths, setLoading]    = useState(true);
  const [mapLoadDurationMs, setMapLoadDurationMs] = useState<number | null>(null);
  const [fetchingSurah, setFetchingSurah] = useState<number | null>(null);
  const fetchedPhasesRef = useRef<Set<number>>(new Set());
  // Seasons explicitly unlocked by the user (persisted — see
  // src/utils/storage.ts). Season 0 is always implicitly unlocked and never
  // stored. Populated from disk in the mount effect below.
  const [unlockedSeasons, setUnlockedSeasons] = useState<Set<number>>(new Set());
  // Which season-gate's tap message is currently showing (null = none).
  const [gateTapped, setGateTapped] = useState<number | null>(null);
  // Which completed node's "retry?" prompt is currently showing on the map
  // (null = none). Tapping a completed node no longer navigates straight
  // into LessonSession — that's what triggers the expensive exercise-build
  // fetch — it just surfaces this prompt; only confirming pays that cost.
  const [retryNodeId, setRetryNodeId] = useState<string | null>(null);
  // "Start a new level" prompt for a fresh (non-completed) node tap — the
  // counterpart to retryNodeId above. Carries the real lesson_group_id and
  // ayah range resolved at tap time rather than read back off `node` at
  // render time, because a 'pending' node's own fields are still empty until
  // fetchFirstLevelNow resolves them (see handleNodePress).
  const [startPrompt, setStartPrompt] = useState<{
    section: Section; node: SectionNode; groupId: string; ayahFrom: number; ayahTo: number;
  } | null>(null);
  // Which season index is currently having its previous-season eligibility
  // re-checked on demand (see handleGatePress) — null when no check in flight.
  const [checkingGate, setCheckingGate] = useState<number | null>(null);
  // Latest resolved "current surah" — read (not reactive) by
  // handleUnlockConfirm, set by both the mount effect and the focus effect.
  const currentSurahNumRef = useRef<number | null>(null);
  // Pull-to-refresh state, and the scroll handle + last-auto-scrolled node id
  // used to keep the viewport following wherever Lumo currently stands.
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const autoScrolledNodeIdRef = useRef<string | null>(null);

  // Gated on the map having actually finished loading, not just on mount:
  // the offer used to appear while the first levels fetch was still in
  // flight, so accepting it started the tour over S.loadingOverlay rather
  // than over the real map. That overlay is opaque enough on its own that
  // the tour's dim on top of it read as a flat black screen with no map in
  // it. loadingPaths only ever goes true→false, so this still fires once.
  useEffect(() => {
    if (loadingPaths) return;
    void (async () => {
      if (await wasTourOffered()) return;
      setTourOfferVisible(true);
    })();
  }, [loadingPaths, setTourOfferVisible]);

  // If learning is still null when this screen becomes active (hydrate's
  // retries exhausted, or a stale session), nudge one refresh rather than
  // leaving the HUD stuck on the "not loaded" placeholder indefinitely.
  // Self-limiting: learning is only ever nulled at logout.
  useEffect(() => {
    if (!learning) void refreshLearning({ force: true });
  }, [learning, refreshLearning]);

  // Sort by the real sort_order field, not start_ayah — review levels are
  // now interleaved one after every 2 normal levels (see buildLevels below)
  // and each review's own ayah range overlaps the normal levels it covers,
  // so start_ayah no longer reflects true display order (a review covering
  // groups 1-2 and group 2 itself can share the same start_ayah). Nodes are
  // indexed by array position after this (see enrichedSections below), so
  // getting this order right is load-bearing, not cosmetic.
  //
  // Falls back to end_ayah when sort_order is missing — confirmed live
  // against the testing environment that this happens: its /levels
  // response already carries the new interleaved is_special content
  // (correct overlapping ranges, e.g. a review at start=1/end=4 alongside
  // groups 1-2 and 3-4) but every item's sort_order came back undefined,
  // so `a.sort_order - b.sort_order` is NaN for every pair and Array.sort
  // silently leaves the API's raw (non-interleaved: normals then reviews)
  // order in place. end_ayah works as a substitute because a review's own
  // end_ayah always equals the last normal group it covers (same overlap
  // property that broke start_ayah-sorting in the first place) — sorting
  // ascending by it and breaking ties by putting is_special after normal
  // reconstructs "review right after the pair/group it covers" without
  // needing sort_order at all. Once every environment actually serves
  // sort_order this fallback stops mattering (the first branch always
  // wins), so it's safe to leave in rather than ripping out later.
  const sortedLevels = (levels: SurahLevel[]) => levels.slice().sort((a, b) => {
    if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order;
    if (a.end_ayah !== b.end_ayah) return a.end_ayah - b.end_ayah;
    return (a.is_special ? 1 : 0) - (b.is_special ? 1 : 0);
  });

  const mergeFirstLevels = (levels: SurahLevel[]) => {
    if (levels.length === 0) return;
    setFirstLevel(prev => {
      const next = { ...prev };
      for (const lvl of levels) next[lvl.surah_number] = lvl;
      return next;
    });
  };

  // Batched fetch for one phase's surahs (skips the current surah, which
  // gets full detail instead, and anything already cached from boot).
  const fetchPhase = async (phaseIdx: number, currentSurah: number | null) => {
    if (fetchedPhasesRef.current.has(phaseIdx)) return;
    fetchedPhasesRef.current.add(phaseIdx);
    const surahs = PHASE_GROUPS[phaseIdx] ?? [];
    const targets = surahs.filter(n => n !== currentSurah);
    if (targets.length === 0) return;
    const fromCache = targets.filter(n => getCachedFirstLevel(n));
    if (fromCache.length) {
      mergeFirstLevels(fromCache.map(n => getCachedFirstLevel(n)!).filter(Boolean));
    }
    const uncached = targets.filter(n => !getCachedFirstLevel(n));
    if (uncached.length === 0) return;
    try {
      mergeFirstLevels(await learningApi.firstLevels(uncached));
    } catch (e) {
      console.warn(`[MapScreen] phase ${phaseIdx} fetch failed:`, e);
      fetchedPhasesRef.current.delete(phaseIdx); // allow a later on-demand retry
    }
  };

  // Pull-to-refresh: per bootCache's own contract ("pull-to-refresh always
  // bypasses the cache"), hit the network directly for the recommendation
  // and every surah whose phase has already loaded, instead of reading
  // getCachedRecommended()/getCachedLevels().
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const recommended = await learningApi.recommendedNext().catch(() => null);
      setCachedRecommended(recommended ?? null);
      const currentSurah = recommended?.surah_number
        ?? (learning?.mvp_surah_numbers?.[0] ?? SECTIONS_DEF[0]?.surahNum ?? null);
      currentSurahNumRef.current = currentSurah;

      const tasks: Promise<void>[] = [];
      if (currentSurah != null) {
        tasks.push(
          learningApi.levels(currentSurah)
            .then(levels => setFullLevels(prev => ({ ...prev, [currentSurah]: sortedLevels(levels) })))
            .catch(e => console.warn('[MapScreen] refresh current-surah levels failed:', e)),
        );
      }
      const otherSurahs = Array.from(fetchedPhasesRef.current)
        .flatMap(i => PHASE_GROUPS[i] ?? [])
        .filter(n => n !== currentSurah);
      if (otherSurahs.length) {
        tasks.push(
          learningApi.firstLevels(otherSurahs)
            .then(levels => mergeFirstLevels(levels))
            .catch(e => console.warn('[MapScreen] refresh firstLevels failed:', e)),
        );
      }
      await Promise.all(tasks);
    } finally {
      setRefreshing(false);
    }
  }, [learning]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const persistedUnlocked = await getUnlockedSeasons();
      const unlockedSet = new Set(persistedUnlocked);
      if (!cancelled) setUnlockedSeasons(unlockedSet);

      const recommended = getCachedRecommended();
      const currentSurah = recommended?.surah_number
        ?? (learning?.mvp_surah_numbers?.[0] ?? SECTIONS_DEF[0]?.surahNum ?? null);
      currentSurahNumRef.current = currentSurah;

      // 1. Current surah (full detail) and 2. rest of phase 1 (batched,
      // lightweight) are independent network calls — run them in parallel
      // so the loading overlay is up for max(call1, call2), not the sum of
      // both (they used to run as two sequential awaits back-to-back).
      const currentSurahFetch = (async () => {
        if (currentSurah == null) return;
        const cached = getCachedLevels(currentSurah);
        if (cached) {
          if (!cancelled) setFullLevels(prev => ({ ...prev, [currentSurah]: sortedLevels(cached) }));
          return;
        }
        try {
          const levels = await learningApi.levels(currentSurah);
          if (!cancelled) setFullLevels(prev => ({ ...prev, [currentSurah]: sortedLevels(levels) }));
        } catch (e) { console.warn('[MapScreen] current-surah levels fetch failed:', e); }
      })();

      // The chapter the user actually opens into (same lookup the chapterIdx
      // state seed uses) may not be chapter 0 — a returning user with real
      // progress can land straight into chapter 2. Phase 0 is only "season
      // 0", which that user never sees, so prioritizing it unconditionally
      // used to leave the chapter actually on screen showing placeholder
      // ('pending') nodes until the staggered loop below happened to reach
      // it several seconds later. Fetch the visible chapter's own
      // (unlocked) seasons up front instead — season 0 stays included
      // whenever it's part of that chapter, since chapter 0 is still the
      // overwhelmingly common case.
      const startSurah = currentSurah ?? SECTIONS_DEF[0]?.surahNum;
      const startChapterIdx = startSurah != null ? (SURAH_TO_CHAPTER[startSurah] ?? 0) : 0;
      const prioritySeasons = (CHAPTER_SEASON_INDICES[startChapterIdx] ?? [0])
        .filter((i: number) => i === 0 || unlockedSet.has(i));

      const startTime = Date.now();
      await Promise.all([
        currentSurahFetch,
        ...prioritySeasons.map(i => fetchPhase(i, currentSurah)),
      ]);
      const measureDuration = Date.now() - startTime;
      if (cancelled) return;
      setMapLoadDurationMs(measureDuration);
      setLoading(false);

      // 3. Remaining phases — staggered in the background so they don't
      // compete with the initial paint, but arrive within a couple seconds
      // without requiring any tap. Signs fade in as each phase lands; nodes
      // are tappable the whole time regardless (on-demand fetch fallback).
      // Phases double as seasons now — a season the user hasn't unlocked
      // yet is skipped entirely (not even the lightweight fetch), per the
      // "seasons shouldn't all load at once" requirement; its data loads
      // for the first time only when the user explicitly unlocks it (see
      // handleUnlockConfirm below). Seasons already covered by
      // prioritySeasons above are skipped here (fetchPhase would no-op on
      // them anyway via fetchedPhasesRef, but skipping avoids wasting one of
      // the 700ms stagger steps on a fetch that isn't going to happen).
      for (let i = 0; i < PHASE_GROUPS.length; i++) {
        if (cancelled) return;
        if (prioritySeasons.includes(i)) continue;
        if (!unlockedSet.has(i)) continue;
        await new Promise(res => setTimeout(res, 700));
        if (cancelled) return;
        await fetchPhase(i, currentSurah);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Re-fetch the current surah's levels when the map regains focus after a
  // genuine lesson completion (skip the very first focus — the mount effect
  // above already covers it). MapScreen sits underneath
  // LessonStart/LessonSession/LessonComplete in the same native stack, so it
  // never remounts between lessons; without this, finishing a lesson
  // invalidates the shared bootCache (see lessonStore.completeSession) but
  // this screen's own `fullLevels` state — already populated before the
  // lesson — never gets told to reload, so the map kept showing
  // pre-completion statuses indefinitely.
  //
  // Gated on lastVisitedSurah, not on plain focus: only a real lesson
  // session (completed OR abandoned) sets it, so the map still doesn't
  // re-fetch on every trivial focus change (switching tabs and back, for
  // instance) — that's what made the map look like it "reloads" every time
  // you came back to it even when nothing had changed, which was the whole
  // reason this used to gate on completion alone.
  //
  // completion-only gating (2026-08-xx) was too narrow, though:
  // abandonSession never invalidated anything, so leaving a level any way
  // other than finishing it (backing out, losing connection, the app dying
  // mid-session) left the map showing pre-session data with nothing to tell
  // it otherwise — reported as "the map looked stale after exiting a level".
  // lastVisitedSurah is set by BOTH completeSession and abandonSession (see
  // lessonStore.ts), so this now runs on either.
  const isFirstFocusRef = useRef(true);
  // Bumped once this effect's refresh has actually landed, so a SEPARATE
  // effect (see jumpToRecommended's own useEffect below) can re-scroll the
  // viewport to the recommended node on every return from a level, not just
  // when the recommended node itself happens to change. The existing scroll-
  // follow effect only re-scrolls on an id CHANGE (autoScrolledNodeIdRef
  // dedup) — exiting a level without advancing (abandon, or a level that
  // wasn't the last one) leaves firstActiveNode.id identical to before, so
  // that effect silently does nothing and the viewport stays wherever it
  // was left, which could be nowhere near "Continue here" (2026-08-28,
  // user: "when I come back from a level the thing I should see is where
  // the continue here button is"). A plain counter, not a boolean: two
  // returns in a row must both trigger a re-scroll even if nothing else
  // about the state changed between them.
  const [returnedFromLevelTick, setReturnedFromLevelTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) { isFirstFocusRef.current = false; return; }
      if (useLessonStore.getState().lastVisitedSurah == null) return;
      let cancelled = false;
      (async () => {
        let currentSurah = getCachedRecommended()?.surah_number ?? null;
        if (currentSurah == null) {
          try {
            const recommended = await learningApi.recommendedNext();
            // invalidateLevels() (called on lesson completion) nulls the
            // shared bootCache recommendation and nothing else ever refills
            // it for the rest of the app session — write the fresh value
            // back so getCachedRecommended() (and Lumo's placement below)
            // stops reading null until the next full app relaunch.
            setCachedRecommended(recommended ?? null);
            currentSurah = recommended?.surah_number ?? null;
          } catch { /* fall back to mvp default below */ }
        }
        currentSurah = currentSurah ?? (learning?.mvp_surah_numbers?.[0] ?? SECTIONS_DEF[0]?.surahNum ?? null);
        if (currentSurah == null || cancelled) return;
        currentSurahNumRef.current = currentSurah;
        try {
          const levels = await learningApi.levels(currentSurah);
          if (!cancelled) setFullLevels(prev => ({ ...prev, [currentSurah]: sortedLevels(levels) }));
        } catch (e) { console.warn('[MapScreen] focus refresh failed:', e); }

        // The surah the user just left a lesson session in (completed OR
        // abandoned) may no longer be `currentSurah` above — finishing a
        // surah's last level advances the "recommended next" pointer to the
        // next surah, so without this, whichever surah the user was actually
        // just looking at never gets refreshed: its last node stays stuck
        // non-golden, or (the abandon case) it keeps showing whatever was
        // cached before the session started at all.
        const visitedSurah = useLessonStore.getState().lastVisitedSurah;
        if (visitedSurah != null && visitedSurah !== currentSurah && !cancelled) {
          try {
            const visitedLevels = await learningApi.levels(visitedSurah);
            if (!cancelled) setFullLevels(prev => ({ ...prev, [visitedSurah]: sortedLevels(visitedLevels) }));
            // Re-derives "was this surah actually finished" from the fresh
            // fetch rather than trusting why the refresh was triggered —
            // safe to run this check after an abandon too: an abandoned
            // session's group only reads 'completed' here if it genuinely
            // was (e.g. abandoning a Retry replay of an already-done level),
            // never merely because a session existed and was exited.
            if (!cancelled && visitedLevels.length > 0 && visitedLevels.every(l => l.status === 'completed')) {
              void logAnalyticsEvent(AnalyticsEvents.SURAH_COMPLETE, { surah_number: visitedSurah });
            }
            useLessonStore.getState().clearLastCompletedSurah();
            useLessonStore.getState().clearLastVisitedSurah();
          } catch (e) { console.warn('[MapScreen] visited-surah refresh failed:', e); }
        } else if (visitedSurah != null) {
          useLessonStore.getState().clearLastCompletedSurah();
          useLessonStore.getState().clearLastVisitedSurah();
        }
        if (!cancelled) setReturnedFromLevelTick(t => t + 1);
      })();
      return () => { cancelled = true; };
    }, [learning]),
  );

  // Immersive mode is now applied app-wide from RootNavigator (once, at
  // mount) rather than toggled per-screen here — see that file. Map no
  // longer needs its own focus/blur toggle.

  // On-demand fallback: fetch a single surah's first level the moment its
  // node is tapped, in case the background phase fetch hasn't landed yet.
  async function fetchFirstLevelNow(surahNumber: number): Promise<SurahLevel | null> {
    const cached = getCachedFirstLevel(surahNumber);
    if (cached) { mergeFirstLevels([cached]); return cached; }
    setFetchingSurah(surahNumber);
    try {
      const [lvl] = await learningApi.firstLevels([surahNumber]);
      if (lvl) mergeFirstLevels([lvl]);
      return lvl ?? null;
    } catch (e) {
      console.warn('[MapScreen] on-demand first-level fetch failed:', e);
      return null;
    } finally {
      setFetchingSurah(null);
    }
  }

  // Enrich base layout with live backend statuses and real ayah ranges
  const enrichedSections = BASE_SECTIONS.map(section => {
    const full = fullLevels[section.surahNum];
    const first = firstLevel[section.surahNum];
    return {
      ...section,
      nodes: section.nodes.map((node, nodeIdx) => {
        const group = full?.[nodeIdx];
        if (group) {
          return { ...node, id: group.lesson_group_id, status: stageToNodeStatus(group.status), stars: group.stars ?? 0, startAyah: group.start_ayah, endAyah: group.end_ayah, isSpecial: group.is_special, resolved: true };
        }
        if (nodeIdx === 0 && first) {
          return { ...node, id: first.lesson_group_id, status: stageToNodeStatus(first.status), stars: first.stars ?? 0, startAyah: first.start_ayah, endAyah: first.end_ayah, isSpecial: first.is_special, resolved: true };
        }
        if (nodeIdx === 0) {
          // First level of a surah is never actually locked server-side —
          // just not confirmed yet. Tappable; see handleNodePress.
          return { ...node, status: 'pending' as NodeStatus, resolved: false };
        }
        // Later levels of a surah whose first level reads 'completed' but
        // whose full levels haven't arrived yet (surahsNeedingFullLevels'
        // backfill below is fetching them). Shown as 'available': open,
        // tappable, no gold, no stars.
        //
        // This used to guess 'completed' with a flat 3 stars, and that guess
        // is not allowed to exist. The map is the user's record of their own
        // work, and a node claiming three gold stars for a level they never
        // played misjudges them — the one failure mode here that isn't
        // merely cosmetic. 'available' can only ever be wrong in the
        // harmless direction: it offers a level the user may have already
        // finished, it never credits them with one they haven't.
        //
        // resolved:false marks it as unconfirmed either way, and
        // handleNodePress resolves the real group (id AND status) from the
        // backend before it will navigate — which is also what keeps this
        // safe, since an unresolved node's `id` is still the static
        // placeholder (`${surahNum}_${n}`), not a real lesson_group_id.
        if (first?.status === 'completed') {
          return { ...node, status: 'available' as NodeStatus, stars: 0, resolved: false };
        }
        return { ...node, resolved: false }; // stays computeLayout's default 'locked' — a real gate
      }),
    };
  });

  async function handleNodePress(section: Section, node: SectionNode) {
    if (node.status === 'locked') { shakeLockedNode(node.id); return; } // real gate — previous level not completed
    if (node.status === 'completed') {
      // Always warm the lesson-content cache the instant a completed node is
      // tapped (loadLessonGroup is cache-first over disk — see
      // cachedContent.ts), so if the user does confirm "Retry", LessonSession
      // hits a warm cache instead of the network.
      void loadLessonGroup(node.id).catch(() => {});
      if (!node.resolved) {
        // Assumed-completed (the enrichedSections heuristic guessed this from
        // the surah's first level, with no real per-group data) — verify
        // before trusting it. A surah can be genuinely finished (show the
        // retry prompt) or only partially done and skipped past (this
        // specific node is actually the real next 'available' level) — in
        // that case skip the prompt and start it directly instead.
        try {
          const levels = await learningApi.levels(section.surahNum);
          const sorted = sortedLevels(levels);
          setFullLevels(prev => ({ ...prev, [section.surahNum]: sorted }));
          // node.levelNum is a group index, not an array position — review
          // levels now interleave (one after every 2 normal levels), so a
          // later normal level's own levelNum no longer matches its
          // position in the full sequence. node.id is still the static
          // placeholder here (this branch only runs when !node.resolved,
          // i.e. no real group has overwritten it yet), and both this
          // section's own node list and `sorted` share the same array order
          // buildLevelsWithReviews/the backend's sort_order both produce —
          // so look the position up by id instead of trusting levelNum.
          const nodeIdx = section.nodes.findIndex(n => n.id === node.id);
          const real = nodeIdx >= 0 ? sorted[nodeIdx] : undefined;
          if (real && real.status !== 'completed') {
            navigation.navigate('LessonSession', { groupId: real.lesson_group_id, surahName: section.name, surahNumber: section.surahNum, isSpecial: node.isSpecial });
            return;
          }
        } catch (e) {
          console.warn('[MapScreen] completed-node status verify failed:', e);
          // Fall through and treat it as completed per the heuristic —
          // start_session() already allows (re)starting a "completed" group,
          // so worst case here is just a misleading "Retry" label.
        }
      }
      // Already done — tapping it is just Browse, not intent to redo the
      // lesson. Surface the retry prompt on the map instead of immediately
      // navigating (tap again to dismiss). The node stays 'completed' the
      // whole time; only handleRetryConfirm below actually navigates.
      setGateTapped(null);
      setStartPrompt(null);
      setRetryNodeId(prev => (prev === node.id ? null : node.id));
      return;
    }
    setRetryNodeId(null);
    setGateTapped(null);
    // Tapping the node whose "start" card is already open closes it. Keyed
    // by surah+levelNum rather than node.id — a 'pending' node's id is a
    // placeholder that gets swapped for the real lesson_group_id the moment
    // fetchFirstLevelNow below resolves it, so node.id itself isn't stable
    // across the two taps a close-by-retapping needs to compare.
    if (startPrompt?.section.surahNum === section.surahNum && startPrompt?.node.levelNum === node.levelNum) {
      setStartPrompt(null);
      return;
    }
    if (node.status === 'pending') {
      const lvl = await fetchFirstLevelNow(section.surahNum);
      if (!lvl) return; // fetch failed — stay put rather than showing a prompt with a bad id
      setStartPrompt({ section, node, groupId: lvl.lesson_group_id, ayahFrom: lvl.start_ayah, ayahTo: lvl.end_ayah });
      return;
    }
    // Unresolved non-first node — enrichedSections marked this 'available'
    // from the surah's first level alone, so `node.id` here is still the
    // static placeholder, NOT a lesson_group_id the backend would recognise.
    // Resolve the real group before offering to start it. This also settles
    // the status honestly: the level may well already be completed, in which
    // case the retry prompt is the right thing to show, not a start card.
    if (!node.resolved) {
      let real: SurahLevel | undefined;
      try {
        const levels = await fetchLevels(section.surahNum);
        const sorted = sortedLevels(levels);
        setFullLevels(prev => ({ ...prev, [section.surahNum]: sorted }));
        // Position, not levelNum: review levels interleave, so a normal
        // level's levelNum stops matching its index in the full sequence.
        // Both lists share the order buildLevelsWithReviews and the
        // backend's sort_order agree on.
        const nodeIdx = section.nodes.findIndex(n => n.id === node.id);
        real = nodeIdx >= 0 ? sorted[nodeIdx] : undefined;
      } catch (e) {
        console.warn('[MapScreen] start-tap level resolve failed:', e);
      }
      // No real group (fetch failed, or the backend has fewer groups than
      // the static layout drew) — stay put. Better an unresponsive tap than
      // navigating into a session for a groupId that doesn't exist.
      if (!real) return;
      if (real.status === 'locked') { shakeLockedNode(node.id); return; }
      if (real.status === 'completed') { setRetryNodeId(real.lesson_group_id); return; }
      setStartPrompt({
        section, node, groupId: real.lesson_group_id,
        ayahFrom: real.start_ayah, ayahTo: real.end_ayah,
      });
      return;
    }
    const estimated = estimateAyahRange(node.levelNum ?? 1, section.ayahCount, node.isSpecial);
    const ayahFrom = node.startAyah ?? estimated.from;
    const ayahTo = node.endAyah ?? estimated.to;
    setStartPrompt({ section, node, groupId: node.id, ayahFrom, ayahTo });
  }

  // Only reached by the "start" card's confirm button — same shape as
  // handleRetryConfirm below, just for the not-yet-completed path.
  function handleStartConfirm() {
    if (!startPrompt) return;
    const { section, groupId, node } = startPrompt;
    setStartPrompt(null);
    navigation.navigate('LessonSession', { groupId, surahName: section.name, surahNumber: section.surahNum, isSpecial: node.isSpecial });
  }

  // Only reached by the retry-prompt's "Retry" button — the one place a
  // completed node's tap actually navigates (and pays for the exercise fetch).
  function handleRetryConfirm(section: Section, node: SectionNode) {
    setRetryNodeId(null);
    navigation.navigate('LessonSession', { groupId: node.id, surahName: section.name, surahNumber: section.surahNum, isSpecial: node.isSpecial });
  }

  // Season 0 is always unlocked. Seasons 1+ need an explicit user unlock
  // (persisted — see the mount effect above and handleUnlockConfirm below).
  function isSeasonUnlocked(seasonIdx: number): boolean {
    return seasonIdx <= 0 || unlockedSeasons.has(seasonIdx);
  }
  // "Complete" only checks the LAST surah's LAST level — progression is
  // sequential, so by the time that's done, everything earlier in the
  // season is provably done too. Only needs the current-surah data that's
  // already fetched (see Context in the season-gate plan) — no extra fetch.
  function isSeasonComplete(seasonIdx: number): boolean {
    const surahs = PHASE_GROUPS[seasonIdx] ?? [];
    if (surahs.length === 0) return false;
    const lastSurah = surahs[surahs.length - 1];
    const levels = fullLevels[lastSurah];
    return !!levels?.length && levels[levels.length - 1].status === 'completed';
  }

  async function handleUnlockConfirm(seasonIdx: number) {
    await unlockSeason(seasonIdx);
    setUnlockedSeasons(prev => new Set(prev).add(seasonIdx));
    setGateTapped(null);
    void fetchPhase(seasonIdx, currentSurahNumRef.current);
  }
  // isSeasonComplete only has data to check when the previous season's last
  // surah has been full-fetched — which stops happening once the "current
  // surah" pointer (recommended-next) moves on to the new season, leaving
  // the gate permanently unable to confirm eligibility. Fetch that one
  // surah on demand, right when the gate is tapped, instead.
  async function handleGatePress(seasonIdx: number) {
    if (isSeasonUnlocked(seasonIdx)) return; // already unlocked — pure scenery now
    setRetryNodeId(null);
    setGateTapped(seasonIdx);
    const prevSeasonSurahs = PHASE_GROUPS[seasonIdx - 1] ?? [];
    const lastSurah = prevSeasonSurahs[prevSeasonSurahs.length - 1];
    if (lastSurah != null && !fullLevels[lastSurah]) {
      setCheckingGate(seasonIdx);
      try {
        const levels = await learningApi.levels(lastSurah);
        setFullLevels(prev => ({ ...prev, [lastSurah]: levels }));
      } catch (e) {
        console.warn('[MapScreen] gate eligibility check failed:', e);
      } finally {
        setCheckingGate(null);
      }
    }
  }

  // Page to another chapter. Purely a change of which slice of the journey is
  // laid out — it unlocks nothing and gates nothing, so it's allowed in both
  // directions at any time (seasons keep their own unlock rules, see
  // isSeasonUnlocked above). Any open on-map prompt is dismissed first, since
  // it belongs to a node that's about to stop existing.
  function goToChapter(next: number, land: 'top' | 'bottom') {
    if (next < 0 || next >= CHAPTER_COUNT || next === chapterIdx) return;
    manualChapterRef.current = true;
    chapterJumpRef.current = land;
    setGateTapped(null);
    setRetryNodeId(null);
    setStartPrompt(null);
    setChapterIdx(next);
    // Pull the first levels for the seasons we're paging into so their nodes
    // resolve real ids/statuses instead of sitting 'pending'. fetchPhase
    // de-dupes against fetchedPhasesRef, so re-entering a chapter is free.
    for (const seasonIdx of CHAPTER_SEASON_INDICES[next] ?? []) {
      void fetchPhase(seasonIdx, currentSurahNumRef.current);
    }
  }

  // Nodes in a still-locked season render as 'locked' regardless of backend
  // status (including the first-of-surah 'pending' exception above) and are
  // non-tappable — handleNodePress's existing `status === 'locked'`
  // early-return already covers that, no change needed there.
  const gatedSections = enrichedSections.map(section => {
    const seasonIdx = SURAH_TO_SEASON[section.surahNum] ?? 0;
    if (isSeasonUnlocked(seasonIdx)) return section;
    return { ...section, nodes: section.nodes.map(n => ({ ...n, status: 'locked' as NodeStatus })) };
  });

  const allEnrichedNodes = gatedSections.flatMap(s => s.nodes.map(n => ({ ...n, surahNum: s.surahNum })));
  // Multiple surahs' first levels can be simultaneously unlocked (no
  // cross-surah gate), so more than one node can read 'current'/'available'
  // at once — trust the backend's own "start here" answer instead of
  // scanning node statuses, which previously landed Luma on whichever
  // already-fetched surah happened to be last in array order rather than
  // the actual next-up level.
  const recommended = getCachedRecommended();
  let firstActiveNode: (typeof allEnrichedNodes)[number] | undefined =
    recommended ? allEnrichedNodes.find(n => n.id === recommended.lesson_group_id) : undefined;
  if (!firstActiveNode && recommended) {
    // Fallback for when that surah's real per-group ids haven't landed yet
    // (only its first level has, so every other node still carries a static
    // placeholder id). This used to take the surah's FIRST node outright,
    // which put "Continue here" on an already-golden completed node — the
    // one place the tag must never point. Take the first node that's
    // actually startable instead, and only fall back to a completed one if
    // the whole surah reads done.
    const inSurah = allEnrichedNodes.filter(n => n.surahNum === recommended.surah_number);
    firstActiveNode =
      inSurah.find(n => n.status === 'current' || n.status === 'available' || n.status === 'pending')
      ?? inSurah.find(n => n.status !== 'completed')
      ?? inSurah[0];
  }

  // The mount effect above resolves `currentSurah` from getCachedRecommended(),
  // which is still null whenever MapScreen mounts before boot's deliberately
  // un-awaited prefetchAll() has landed the recommendation — a plain race, and
  // the one that produced the reported "levels 7 and 8 are done but 9 never
  // opened" map. In that race the mount effect full-fetches the levels of the
  // WRONG surah (mvp_surah_numbers[0]) and nothing ever corrects it:
  // subscribeRecommended only forces a re-render, it re-runs no fetch. The
  // surah actually on screen is then left with only its first level, and
  // enrichedSections' no-full-data heuristic takes over — which fakes EVERY
  // later normal node as completed with a flat 3 stars (hence a node showing
  // gold ★★★ the user had never played) while leaving every review node at
  // its baseline 'locked' (hence the next level never opening).
  //
  // Same heuristic, same symptom, for any other already-finished surah in the
  // visible chapter. So: pull real levels for the recommended surah and for
  // every visible surah whose first level reads 'completed', replacing the
  // guesses with backend truth. fetchLevels() is cache-first with in-flight
  // dedup (and writes through to the disk cache), so a surah already loaded
  // by any other path costs nothing here.
  const recommendedSurah = recommended?.surah_number ?? null;
  const surahsNeedingFullLevels = BASE_SECTIONS
    .map(sec => sec.surahNum)
    .filter(n => !fullLevels[n] && (n === recommendedSurah || firstLevel[n]?.status === 'completed'))
    .join(',');
  useEffect(() => {
    if (!surahsNeedingFullLevels) return;
    let cancelled = false;
    void (async () => {
      for (const surahNum of surahsNeedingFullLevels.split(',').map(Number)) {
        try {
          const levels = await fetchLevels(surahNum);
          if (cancelled) return;
          setFullLevels(prev => ({ ...prev, [surahNum]: sortedLevels(levels) }));
        } catch (e) {
          // Leave the heuristic in place for this surah and stop retrying it
          // this pass — the key below is unchanged by a failure, so this
          // effect won't re-fire in a loop over it.
          console.warn(`[MapScreen] full-levels backfill failed for surah ${surahNum}:`, e);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [surahsNeedingFullLevels]);

  // Manually triggered "go to the recommended level" jump — same destination
  // the cold-start effects further down settle on (see appliedRecSurahRef/
  // autoScrolledNodeIdRef below), but callable on demand instead of only
  // once per distinct recommendation. Wired to the Home tab's own tabPress
  // below so every tap lands here, even a re-tap while already on this
  // screen — clearing manualChapterRef is what lets it override a chapter
  // the user paged to by hand, which the passive cold-start effects
  // deliberately never do on their own.
  const jumpToRecommended = useCallback(() => {
    const surah = recommended?.surah_number;
    if (surah == null) return;
    manualChapterRef.current = false;
    appliedRecSurahRef.current = surah;
    const target = SURAH_TO_CHAPTER[surah] ?? 0;
    if (target !== chapterIdx) {
      // Cross-chapter: land at the new chapter's top, same as paging
      // "next" — the existing chapterJump landing effect below takes it
      // from there once the new chapter's model has built.
      chapterJumpRef.current = 'top';
      autoScrolledNodeIdRef.current = null;
      setChapterIdx(target);
      return;
    }
    if (!firstActiveNode) return;
    autoScrolledNodeIdRef.current = firstActiveNode.id;
    const targetY = Math.max(0, firstActiveNode.y - height / 2);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    });
  }, [recommended?.surah_number, chapterIdx, firstActiveNode, height]);

  // react-navigation fires 'tabPress' every time this tab's own button is
  // pressed, including a re-press while it's already focused — unlike
  // useFocusEffect, which only fires when navigating IN from another tab.
  // That's the behavior asked for: tapping Home always jumps to the
  // recommended level, whether you're switching tabs in or already here.
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      jumpToRecommended();
    });
    return unsubscribe;
  }, [navigation, jumpToRecommended]);

  // Re-scroll to the recommended node every time a level session ends, full
  // stop — see returnedFromLevelTick's own comment above for why the
  // id-change-only scroll-follow effect further below isn't enough on its
  // own. Skips tick 0 (the state's initial value, never an actual return).
  // jumpToRecommended is safe to call unconditionally here: it already no-ops
  // when there's no recommended surah, and already handles the cross-chapter
  // case (finishing a chapter's last level) the same way a manual Home-tab
  // tap does.
  useEffect(() => {
    if (returnedFromLevelTick === 0) return;
    jumpToRecommended();
  }, [returnedFromLevelTick, jumpToRecommended]);

  const goldAnim  = useRef(new Animated.Value(0)).current;
  // One shared value (mirrors goldAnim above) driving a shake on
  // whichever locked node was just tapped — the tap itself is a no-op
  // otherwise, which reads as the app ignoring you rather than as "locked."
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [shakingNodeId, setShakingNodeId] = useState<string | null>(null);
  function shakeLockedNode(nodeId: string) {
    setShakingNodeId(nodeId);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start(() => setShakingNodeId(null));
  }
  const scrollY   = useRef(new Animated.Value(0)).current;
  // Last scroll position breadcrumbed, so the listener below only logs on a
  // meaningful move rather than every pixel — see its own comment for why
  // breadcrumbing scroll position matters here (the still-unsymbolicated
  // libc.so SIGABRT, whose only lead so far is scroll position at crash time).
  const lastBreadcrumbYRef = useRef(0);

  // Grass decode-failure retry counters, keyed by tileIdx. Plain <Image>
  // (unlike react-native-svg's Image) has a real onError — on a
  // memory-constrained device the decode can fail outright rather than just
  // race a cache-miss, and it does not retry itself. Bumping the counter
  // changes that tile's Image `key`, forcing a fresh mount/decode attempt
  // after a short delay instead of leaving it permanently blank.
  const [grassRetry, setGrassRetry] = useState<Record<number, number>>({});
  const onScroll  = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (e: any) => {
        // Reported crash: the app closes while scrolling the map — no JS
        // exception ever reaches ErrorUtils for that, because the failure
        // mode documented above (a native bitmap allocation over Canvas's
        // ~100MB ceiling) aborts the process straight from native code. This
        // whole listener is therefore wrapped, and scroll position is
        // breadcrumbed (throttled to a real move, not every pixel), so that
        // WHEN it crashes again, Crashlytics has the exact scroll position
        // and map size that preceded it, sitting right next to the
        // now-symbolicated native stack (see the Gradle
        // nativeSymbolUploadEnabled change) instead of a bare offset with no
        // lead-up context.
        try {
          const y = e.nativeEvent.contentOffset.y as number;
          if (Math.abs(y - lastBreadcrumbYRef.current) < height / 2) return;
          lastBreadcrumbYRef.current = y;
          addBreadcrumb('map: scrolled', { scrollY: Math.round(y), MAP_H: Math.round(MAP_H), chapterIdx });
        } catch (err) {
          captureError(err, { where: 'MapScreen.onScroll', chapterIdx, MAP_H: Math.round(MAP_H) });
        }
      },
    },
  );

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(goldAnim,  { toValue: 1, duration: 1400, useNativeDriver: true }),
      Animated.timing(goldAnim,  { toValue: 0, duration: 1400, useNativeDriver: true }),
    ])).start();
  }, []);

  // Keep the viewport following the recommended node (formerly framed as
  // "following Lumo" — Lumo no longer stands beside it, but the
  // scroll-to-reveal behavior is unchanged):
  // on first load (opening the map fresh)
  // and again any time firstActiveNode moves to a different node (finishing
  // a level advances the recommendation to N+1, a pull-to-refresh may also
  // reveal a new node), scroll so that node is in view instead of leaving
  // the user to hunt for it starting from the very top of the map.
  useEffect(() => {
    if (loadingPaths || !firstActiveNode) return;
    // A chapter switch owns the scroll position for this commit — the jump
    // effect below is about to send the viewport to the top or bottom, and
    // paging into the chapter Lumo happens to stand in shouldn't fight it.
    // Recording the node as already-handled means a later genuine change
    // (finishing a level) still scrolls normally.
    if (chapterJumpRef.current) {
      autoScrolledNodeIdRef.current = firstActiveNode.id;
      return;
    }
    if (autoScrolledNodeIdRef.current === firstActiveNode.id) return;
    autoScrolledNodeIdRef.current = firstActiveNode.id;
    const targetY = Math.max(0, firstActiveNode.y - height / 2);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    });
  }, [firstActiveNode?.id, loadingPaths, height]);

  // Land the viewport after a chapter switch. Runs after the new chapter has
  // laid out, so MAP_H is already the new chapter's height.
  // Not animated: this is a change of place, not a move within one.
  useEffect(() => {
    const land = chapterJumpRef.current;
    if (!land) return;
    chapterJumpRef.current = null;
    const targetY = land === 'top' ? 0 : Math.max(0, MAP_H - height);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: false });
    });
  }, [chapterIdx, MAP_H, height]);

  // Follow the backend's recommended-next into its chapter. Covers the cold
  // start (the useState seed above had no cached recommendation to read) and
  // the moment finishing a chapter's last level advances the recommendation
  // into the next one. Applied once per distinct surah, and never once the
  // user has paged by hand — at that point where they are is their choice.
  useEffect(() => {
    const surah = recommended?.surah_number;
    if (loadingPaths) return;
    if (surah == null) { setChapterResolved(true); return; }
    if (appliedRecSurahRef.current === surah) { setChapterResolved(true); return; }
    appliedRecSurahRef.current = surah;
    if (!manualChapterRef.current) {
      const target = SURAH_TO_CHAPTER[surah] ?? 0;
      setChapterIdx(prev => (prev === target ? prev : target));
    }
    setChapterResolved(true);
  }, [recommended?.surah_number, loadingPaths]);

  // Crash context, not app behavior — this screen had none of the
  // breadcrumb/context wiring the rest of the app relies on (see
  // authStore/lessonStore/api/client.ts), despite being the one screen
  // reported to crash the app on scroll. `setCrashContext` tags every crash
  // report from here on with which chapter/surah was open and how tall its
  // map is (tile-mount OOM is a known failure mode for a tall MAP_H — see
  // the comment above the tiled Svg render below), so a crash report shows
  // that context even if it happens before the user does anything else.
  useEffect(() => {
    if (!chapterResolved) return;
    setCrashContext({ screen: 'Map', surah_id: recommended?.surah_number });
    addBreadcrumb('map: chapter shown', { chapterIdx, MAP_H: Math.round(MAP_H), nodeCount: allEnrichedNodes.length });
  }, [chapterResolved, chapterIdx, MAP_H, recommended?.surah_number, allEnrichedNodes.length]);

  const skyPct = Math.min(95, (SKY_BOUNDARY_Y / MAP_H) * 100);

  const svgBgTileCount = Math.max(1, Math.ceil(MAP_H / SVG_BG_TILE_H));

  return (
    <View style={S.container}>
      {/* HUD — streak (emoji) top-left, XP top-right. Hearts hidden on the
          map for now (still shown in-lesson). No backdrop of its own: the
          pills carry their own opaque background and shadow, so they read
          fine straight over the live sky. */}
      <View
        style={[S.hud, { paddingTop: insets.top + sc(4) }]}
        onLayout={e => setHudHeight(e.nativeEvent.layout.height)}
      >
        <View style={S.hudRow}>
          <TouchableOpacity
            {...streakTarget}
            style={[S.hudPill, glowStreak && TOUR_GLOW]}
            activeOpacity={0.7}
            onPress={() => (isGuestUser ? setGuestPromptVisible(true) : navigation.navigate('Streak'))}
          >
            <Image
              source={isStreakFrozen(learning?.streak_state) ? STREAK_FROZEN_ICON_SMALL : STREAK_ACTIVE_ICON_SMALL}
              style={S.hudStreakIcon}
              resizeMode="contain"
            />
            <Text style={[S.hudVal, { color: streakColor(learning?.streak_state) }]}>
              {learning ? (isGuestUser ? '—' : learning.current_streak) : '…'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            {...xpTarget}
            style={[S.hudPill, glowXp && TOUR_GLOW]}
            activeOpacity={0.7}
            onPress={() => (isGuestUser ? setGuestPromptVisible(true) : navigation.navigate('XP'))}
          >
            <Text>⚡</Text>
            <Text style={[S.hudVal, { color: '#2A7D4F' }]}>
              {learning ? (isGuestUser ? '— XP' : `${learning.xp_total} XP`) : '… XP'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {(!chapterResolved || refreshing) && (
        // NOT gated on loadingPaths alone — the sky/mountains/grass/road and
        // the node positions are all static, computed from SECTIONS_DEF for
        // whichever chapter is selected, so they don't need network data to
        // draw correctly; only each node's own status (locked/current/gold)
        // is still resolving, and MapNode already renders that placeholder
        // as a plain numbered node, no overlay required. The one thing that
        // genuinely can't be shown early is which CHAPTER to draw in the
        // first place: on a cold start (no cached recommendation yet) the
        // map doesn't know that until the resolve effect runs, and a wrong
        // guess means a different-length road/height once it corrects — so
        // this stays solid until chapterResolved flips true (see its
        // declaration above). Kept translucent for pull-to-refresh, where
        // the already-correct map underneath is meant to stay visible while
        // it re-fetches.
        <View style={[S.loadingOverlay, !chapterResolved && S.loadingOverlaySolid]} pointerEvents="none">
          <LoadingRing size={64} color="#fff" />
          <LoadingStatusText style={S.loadingOverlayText} />
        </View>
      )}

      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* Map canvas — height computed from layout, not hardcoded */}
        <View style={{ width: MAP_W, height: MAP_H, position: 'relative', overflow: 'hidden' }}>

          {/* Sky-to-ground backdrop. Plain (react-native-linear-gradient), not
              an SVG Rect+LinearGradient — it used to live inside each tile's
              <Svg>, drawn first there so the sky/mountain images (below, in
              document order within that same Svg) painted over it. Once the
              images moved out to plain RN Images so they'd render only once
              instead of once per tile, they had to move BEFORE this in the
              tree to still sit on top of it — but an svg Rect can only stack
              against *other elements inside its own <Svg>*, not against a
              plain Image sibling positioned before that Svg. Moving the
              gradient out here too — as the bottommost layer, before
              anything else — sidesteps that entirely. */}
          <LinearGradient
            colors={['#4FB3E8', '#8ED2F0', colors.mapBg, colors.mapBg]}
            locations={[0, skyPct / 100, Math.min(0.98, skyPct / 100 + 0.03), 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: 'absolute', left: 0, top: 0, width: MAP_W, height: MAP_H }}
          />

          {/* Real sky photo — fills the sky band; the jagged grass edge in the
              Svg tiles below overlaps its bottom edge so the seam isn't a
              hard line. Plain Image, not SvgImage — it only ever needs to
              appear once at the true top of the map, not once per tile, and
              plain Image doesn't carry the remount bug per-tile SvgImages
              had. Must render BEFORE the Svg tiles below (earlier siblings
              sit underneath), so their grass/road painting still overlaps
              and masks this image's bottom edge — after them, this covered
              the grass/road instead of blending under it. */}
          <Image
            source={SKY_SRC}
            resizeMode="cover"
            style={{ position: 'absolute', left: 0, top: 0, width: MAP_W, height: SKY_BOUNDARY_Y + sc(24) }}
          />

          {/* Distant mountain range on the horizon. Starts below the HUD
              (hudHeight, measured from the real streak/XP bar) instead of
              the canvas's very top, so the status bar and the streak/XP
              pills sit over plain sky rather than over busy peaks — the
              pills stay legible without needing a backdrop of their own.
              Bottom edge stays
              anchored at the same SKY_BOUNDARY_Y + sc(28) it always was
              (height shrinks by however much got pushed off the top) so the
              grass texture drawn after this still overlaps its base with no
              gap. mountains_crop.png (see its own require() comment) is
              pre-cropped so every column is opaque right to that bottom
              edge, so sc(28) is a comfortable, uniform overlap margin rather
              than a margin racing a specific worst-case dip. */}
          <Image
            source={MOUNTAINS_SRC}
            resizeMode="cover"
            style={{
              position: 'absolute', left: 0, top: hudHeight, width: MAP_W,
              height: Math.max(0, SKY_BOUNDARY_Y + sc(28) - hudHeight), opacity: 0.9,
            }}
          />

          {/* SVG background — tiled vertically. react-native-svg rasterizes
              each <Svg> into a single Android bitmap sized to its own
              width×height, and Canvas has a hard ~100MB-per-bitmap ceiling
              (RecordingCanvas.throwIfCannotDraw). A single MAP_W×MAP_H Svg
              blows past that once the map gets tall enough (it did, at 21
              surahs — "Canvas: trying to draw too large bitmap", crashing
              every open). Splitting into fixed-height tiles, each its own
              <Svg> with a viewBox offset into the same coordinate space,
              keeps every individual bitmap small while every child below
              keeps its original absolute x/y — content outside a tile's
              viewBox is simply clipped, so nothing else here needed to
              change.

              All tiles for the current chapter mount up front — no
              scroll-driven virtualization. That used to matter (tiling alone
              doesn't reduce total memory, and at the old season-based map's
              max size, 21 surahs, MAP_H was ~21800dp: 8 tiles, ~236MB of
              bitmap all at once if fully mounted, at or past the whole app
              heap as a native allocation with no JS exception to catch).
              Now that a chapter is capped at NODES_PER_CHAPTER, MAP_H tops
              out around 2-3 tiles regardless of how many surahs exist — the
              same amount virtualization used to keep resident anyway — so
              mounting them all costs about the same while removing the
              window where a tile scrolled into hadn't mounted yet. */}
          {/* Grass used to be an SVG <Pattern> (see the removed comment this
              replaces) exactly like the road still is below. That mechanism
              rasterizes its child <SvgImage> synchronously into a shader the
              instant a Path needs painting (Brush.java#setupPaint) — if
              grass.jpg isn't ALREADY in Fresco's decoded-bitmap cache at that
              exact moment, nothing gets drawn and the blank result is baked
              into the shader permanently, exposing colors.mapBg (flat green)
              underneath. Every tile mount is a fresh native ImageView with no
              memory of prior cache-warmth, so this raced on every fresh tile,
              worse odds on lower-RAM/slower devices, which is why it showed
              up on a Huawei phone specifically. Plain Image, done below, sidesteps
              this entirely: it decodes grass.jpg once and lets Android's own
              BitmapShader/TileMode.REPEAT do the tiling, the same primitive
              Pattern uses internally, just without the synchronous-bake step
              racing an async decode. This is the same fix already applied to
              SKY_SRC/MOUNTAINS_SRC above ("plain Image doesn't carry the
              remount bug per-tile SvgImages had") — grass was just left on
              the old mechanism at the time because Pattern requires an
              SVG-namespace child, and plain Image isn't one. */}
          {(() => {
            const grassPlainTop = SKY_BOUNDARY_Y + sc(20);
            return Array.from({ length: svgBgTileCount }, (_, i) => i)
              .map(tileIdx => {
                const tileTop = tileIdx * SVG_BG_TILE_H;
                const tileH = Math.min(SVG_BG_TILE_H, MAP_H - tileTop);
                // The torn/jagged sky-grass seam (GRASS_EDGE_D) only ever
                // falls inside tile 0 — it's pinned to SKY_BOUNDARY_Y, near
                // the top of the whole map, not to any per-tile offset.
                // Below grassPlainTop the shape GRASS_EDGE_D traces is
                // already a plain rect (see its own comment), so that's the
                // only sliver that still needs the old Pattern mechanism —
                // and the plain Image below fully covers it regardless, so
                // even a repeat of the old bug here is invisible.
                const grassImgTop = tileIdx === 0 ? grassPlainTop : tileTop;
                const grassImgH = tileTop + tileH - grassImgTop;
                return (
                  <React.Fragment key={`bgtile-${tileIdx}`}>
                    {tileIdx === 0 && (
                      <Svg
                        width={MAP_W}
                        height={tileH}
                        viewBox={`0 ${tileTop} ${MAP_W} ${tileH}`}
                        style={[StyleSheet.absoluteFill, { top: tileTop, height: tileH, overflow: 'hidden' }]}
                      >
                        <Defs>
                          <Pattern id={`grassPattern-${mapInstanceId}-${tileIdx}`} patternUnits="userSpaceOnUse" width={sc(140)} height={sc(140)}>
                            <SvgImage href={GRASS_SRC} x={0} y={0} width={sc(140)} height={sc(140)} preserveAspectRatio="xMidYMid slice" />
                          </Pattern>
                        </Defs>
                        <Path d={GRASS_EDGE_D} fill={`url(#grassPattern-${mapInstanceId}-${tileIdx})`} />
                      </Svg>
                    )}

                    {grassImgH > 0 && (
                      <Image
                        key={`grass-${tileIdx}-${grassRetry[tileIdx] ?? 0}`}
                        source={GRASS_SRC}
                        resizeMode="repeat"
                        style={{ position: 'absolute', left: 0, top: grassImgTop, width: MAP_W, height: grassImgH }}
                        onError={() => {
                          // Capped at 4 retries — on a device this starved
                          // for memory, retrying forever would just keep
                          // competing for the same scarce memory instead of
                          // letting it recover. Give up onto the flat
                          // colors.mapBg fallback rather than hammering it.
                          if ((grassRetry[tileIdx] ?? 0) >= 4) return;
                          // Give the device a moment (GC, whatever else is
                          // competing for memory) rather than retrying
                          // instantly into the same failure.
                          setTimeout(() => {
                            setGrassRetry(prev => ({ ...prev, [tileIdx]: (prev[tileIdx] ?? 0) + 1 }));
                          }, 800);
                        }}
                      />
                    )}

                    {/* Road — brick-textured, carved-in look. Still Pattern-based
                        (a curved stroke isn't a shape a plain Image can fill),
                        so it keeps the same id-scoping guard as before: Defs
                        ids scoped per tile AND per mount (mapInstanceId) since
                        react-native-svg mis-resolves url(#id) references
                        (patterns silently stop painting, falling back to a
                        flat fill) when the same id exists more than once at
                        once, and tileIdx alone isn't enough — it always
                        restarts at 0, so a remount recreates ids identical to
                        the previous mount's. Sliced to this tile's own
                        y-range (pathDForYRange) rather than handing every
                        tile the whole road — passing the full path to every
                        tile was the actual cost, not the tiling itself. */}
                    <Svg
                      width={MAP_W}
                      height={tileH}
                      viewBox={`0 ${tileTop} ${MAP_W} ${tileH}`}
                      style={[StyleSheet.absoluteFill, { top: tileTop, height: tileH, overflow: 'hidden' }]}
                    >
                      <Defs>
                        <Pattern id={`brickPattern-${mapInstanceId}-${tileIdx}`} patternUnits="userSpaceOnUse" width={sc(46)} height={sc(46)}>
                          <SvgImage href={BRICK_SRC} x={0} y={0} width={sc(46)} height={sc(46)} preserveAspectRatio="xMidYMid slice" />
                        </Pattern>
                      </Defs>
                      <Pathway d={pathDForYRange(tileTop, tileTop + tileH)} sc={sc} patternId={`brickPattern-${mapInstanceId}-${tileIdx}`} />
                    </Svg>
                  </React.Fragment>
                );
              });
          })()}
          {/* Static sky clouds — marking the sky before the road begins */}
          {SKY_CLOUDS.map((c, i) => (
            <Image key={`skycloud${i}`} source={CLOUD_SRC} resizeMode="contain" style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h, opacity: 0.9 }} />
          ))}

          {/* Birds flying across the sky photo itself */}
          {SKY_BIRDS.map((b, i) => (
            <Image
              key={`skybird${i}`}
              source={BIRDS_SRC}
              resizeMode="contain"
              style={{
                position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.w / 2,
                opacity: 0.85, transform: [{ scaleX: b.flip ? -1 : 1 }],
              }}
            />
          ))}

          {/* Birds — zone-checked like every other decoration */}
          {DECORATIONS.birds.map((b, i) => (
            <Image
              key={`bird${i}`}
              source={BIRDS_SRC}
              style={{ position: 'absolute', left: b.x, top: b.y, width: sc(96), height: sc(48), opacity: 1.0 }}
              resizeMode="contain"
            />
          ))}

          {/* Season-gate signs — rendered like a node: centered on the path
              (see the on-path x/y computed in buildMapModel), sitting right
              before the new season's first level. Tappable while locked to
              surface a Lumo message; once unlocked it's pure scenery (see
              handleGatePress). Pre-engraved art only exists for the
              season-1 sign so far (s2/s3 predate the 7-season expansion and
              don't match the new season boundaries) — every gate uses that
              same sign as a placeholder until unique per-season art is
              ready. */}
          {DECORATIONS.seasonGates.map((g, i) => {
            return (
              <TouchableOpacity
                key={`gate${i}`}
                style={{ position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h }}
                activeOpacity={0.85}
                onPress={() => void handleGatePress(g.unlocksSeasonIdx)}
              >
                <Image
                  source={SEASON_SIGN_SRCS[g.unlocksSeasonIdx + 1] ?? SEASON_SIGN_SRCS[1]}
                  resizeMode="contain"
                  style={{ width: g.w, height: g.h }}
                />
              </TouchableOpacity>
            );
          })}

          {/* Surah labels — scroll art, positioned a real derived distance
              from each section's first node (mirrors lumaLeft's formula) */}
          {enrichedSections.map(section => {
            const box = SURAH_LABELS[section.surahNum];
            if (!box) return null;
            return (
              <SurahLabel key={`label-${section.surahNum}`} name={section.name} box={box} sc={sc} SL={SL} />
            );
          })}

          {/* Lesson nodes + ayah-range pills — globally numbered across all surahs */}
          {(() => {
            let globalIdx = 0;
            return gatedSections.map(section =>
              section.nodes.map((node, nodeIdx) => {
                // Review ("R") nodes don't consume a number in the sequence —
                // only advance the counter for normal, numbered nodes.
                if (!node.isSpecial) globalIdx++;
                const idx = globalIdx;
                const pill = AYAH_PILLS[`${section.surahNum}_${nodeIdx}`];
                const nodeEstimate = estimateAyahRange(node.levelNum ?? 1, section.ayahCount, node.isSpecial);
                const ayahFrom = node.startAyah ?? nodeEstimate.from;
                const ayahTo = node.endAyah ?? nodeEstimate.to;
                const rangeLabel = formatAyahRange(ayahFrom, ayahTo);
                return (
                  <React.Fragment key={node.id}>
                    <Animated.View
                      style={[
                        { position: 'absolute', left: node.x, top: node.y },
                        shakingNodeId === node.id && {
                          transform: [{
                            translateX: shakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }),
                          }],
                        },
                      ]}
                    >
                    <TouchableOpacity
                      activeOpacity={node.status === 'locked' ? 1 : 0.85}
                      onPress={() => void handleNodePress(section, node)}
                    >
                      <MapNode
                        status={node.status}
                        stars={node.stars}
                        goldAnim={goldAnim}
                        levelNum={idx}
                        isFetching={node.status === 'pending' && fetchingSurah === section.surahNum}
                        isSpecial={node.isSpecial}
                        tagLabel={node.id === firstActiveNode?.id ? (hasAnyProgress ? 'Continue here' : 'Begin here') : undefined}
                        tagPlacement={node.id === firstActiveNode?.id ? nodeTagPlacement(node, section.surahNum) : undefined}
                        S={S}
                      />
                    </TouchableOpacity>
                    </Animated.View>
                    {pill && (
                      <View pointerEvents="none" style={[S.ayahPill, { position: 'absolute', left: pill.x, top: pill.y, width: pill.w, height: pill.h }]}>
                        <Text style={S.ayahPillText} numberOfLines={1} adjustsFontSizeToFit>{rangeLabel}</Text>
                      </View>
                    )}
                  </React.Fragment>
                );
              })
            );
          })()}

          {/* Season-gate tap message — "finish the season" if not yet
              eligible, or an Unlock confirm button once it is. Confirming
              is the only thing that persists the unlock and loads that
              season's data for the first time (see handleUnlockConfirm). */}
          {gateTapped != null && (() => {
            const g = DECORATIONS.seasonGates.find(sg => sg.unlocksSeasonIdx === gateTapped);
            if (!g) return null;
            // gateTapped is the 0-indexed PHASE_GROUPS entry being unlocked
            // (see storage.ts's getUnlockedSeasons comment: "Season 0 is
            // never stored — only explicit user-confirmed unlocks (Season 2,
            // Season 3)..." lives there) — the human-facing number is +1.
            const seasonLabel = `Season ${gateTapped + 1}`;
            const checking = checkingGate === gateTapped;
            const eligible = !checking && isSeasonComplete(gateTapped - 1);
            return (
              <View style={{ position: 'absolute', left: g.x + g.w / 2 - sc(70), top: g.y - sc(90), alignItems: 'center' }}>
                <LumaFloat
                  speech={checking ? 'Checking…' : eligible ? `🎉 ${seasonLabel} complete!` : `Finish ${seasonLabel} to unlock this season!`}
                  S={S}
                  SB={SB}
                  sc={sc}
                />
                {checking ? null : eligible ? (
                  <TouchableOpacity style={S.unlockBtn} onPress={() => void handleUnlockConfirm(gateTapped)}>
                    <Text style={S.unlockBtnText}>Unlock →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={S.unlockDismiss} onPress={() => setGateTapped(null)}>
                    <Text style={S.unlockDismissText}>OK</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}

          {/* Completed-node "repeat the lesson" card — the on-map popout
              described in the perf fix: tapping a gold/completed node no
              longer jumps straight into LessonSession (that's the expensive
              exercise-build fetch). It just shows this, positioned beside the
              tapped node; only its button pays that cost. */}
          {retryNodeId != null && (() => {
            let target: { section: Section; node: SectionNode } | null = null;
            for (const s of gatedSections) {
              const n = s.nodes.find(nn => nn.id === retryNodeId);
              if (n) { target = { section: s, node: n }; break; }
            }
            if (!target) return null;
            const { section, node } = target;
            const targetEstimate = estimateAyahRange(node.levelNum ?? 1, section.ayahCount, node.isSpecial);
            const ayahFrom = node.startAyah ?? targetEstimate.from;
            const ayahTo = node.endAyah ?? targetEstimate.to;
            const { left, top } = actionCardPosition(node);
            return (
              <View style={{ position: 'absolute', left, top, zIndex: 5 }}>
                <LevelActionCard
                  variant="repeat"
                  surahName={section.name}
                  ayahFrom={ayahFrom}
                  ayahTo={ayahTo}
                  onConfirm={() => handleRetryConfirm(section, node)}
                  onDismiss={() => setRetryNodeId(null)}
                  S={S}
                />
              </View>
            );
          })()}

          {/* "Start a new level" card — the non-completed-node counterpart
              above. Position/ayah data was already resolved into startPrompt
              at tap time (see handleNodePress), so this just renders it. */}
          {startPrompt != null && (() => {
            const { section, node, ayahFrom, ayahTo } = startPrompt;
            const { left, top } = actionCardPosition(node);
            return (
              <View style={{ position: 'absolute', left, top, zIndex: 5 }}>
                <LevelActionCard
                  variant="start"
                  surahName={section.name}
                  ayahFrom={ayahFrom}
                  ayahTo={ayahTo}
                  onConfirm={handleStartConfirm}
                  onDismiss={() => setStartPrompt(null)}
                  S={S}
                />
              </View>
            );
          })()}

          {/* Reserved space for a short final chapter (curriculum doesn't
              fill NODES_PER_CHAPTER yet) — see comingSoonY in buildMapModel.
              Centered on the y it computed, same grass/road tiles behind it
              as everywhere else, just no nodes here yet. */}
          {comingSoonY != null && (
            <View style={[S.comingSoonBanner, { top: comingSoonY - sc(20) }]}>
              <Text style={S.comingSoonText}>Coming soon!</Text>
            </View>
          )}

          {/* End of the chapter — both paging signs side by side, parallel to
              where the path itself ends, instead of previous-at-top/
              next-at-bottom. Row is centered and gap-based (not fixed
              left/right offsets) so it re-centers on any screen width. Sits
              inside FOOTER_PAD, clear of the last node's ayah pill. */}
          <View style={{ position: 'absolute', left: 0, right: 0, top: MAP_H - sc(240), alignItems: 'center' }}>
            <Image source={START_SRC} style={{ width: sc(100), height: sc(80) }} resizeMode="contain" />
            {(chapterIdx > 0 || chapterIdx < CHAPTER_COUNT - 1) ? (
              <View style={S.chapterSignRow}>
                {chapterIdx > 0 && (
                  <TouchableOpacity
                    style={S.chapterSignCol}
                    activeOpacity={0.85}
                    onPress={() => goToChapter(chapterIdx - 1, 'bottom')}
                  >
                    <Image
                      source={PREVIOUS_STAGE_SRC}
                      style={{ width: sc(108), height: sc(108) / PREVIOUS_STAGE_ASPECT }}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}
                {chapterIdx < CHAPTER_COUNT - 1 && (
                  <TouchableOpacity
                    style={S.chapterSignCol}
                    activeOpacity={0.85}
                    onPress={() => goToChapter(chapterIdx + 1, 'top')}
                  >
                    <Image
                      source={NEXT_STAGE_SRC}
                      style={{ width: sc(108), height: sc(108) / NEXT_STAGE_ASPECT }}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Text style={S.endText}>More coming soon…</Text>
            )}
          </View>
        </View>
      </Animated.ScrollView>

      <TourOfferModal
        visible={tourOfferVisible}
        onAccept={handleAcceptTour}
        onDecline={handleDeclineTour}
      />

      {frozenPopupVisible && (
        <StreakFrozenModal
          currentStreak={learning?.current_streak ?? 0}
          freezeDaysRemaining={learning?.freeze_days_remaining ?? 0}
          repairRequired={learning?.repair_levels_required ?? 0}
          repairCompleted={learning?.repair_levels_completed ?? 0}
          onDismiss={() => setFrozenPopupVisible(false)}
        />
      )}

      <AuthRequiredModal
        visible={guestPromptVisible}
        title="Create an account"
        body="Guest streak and XP aren't saved. Create a free account to start banking them for real."
        ctaLabel="Create account"
        dismissLabel="Not now"
        onContinue={() => { setGuestPromptVisible(false); navigation.navigate('SignUp'); }}
        onDismiss={() => setGuestPromptVisible(false)}
      />
    </View>
  );
}

