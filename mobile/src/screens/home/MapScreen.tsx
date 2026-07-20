import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, useWindowDimensions, Image, ActivityIndicator, TouchableOpacity,
  ScrollView, RefreshControl, type ImageSourcePropType,
} from 'react-native';
import Svg, {
  Defs, LinearGradient, Stop, Rect, Ellipse, Path, G, Pattern, Image as SvgImage,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import PredictedProgressBar from '../../components/PredictedProgressBar';
import { LoadingRing } from '../../components/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { useLessonStore } from '../../store/lessonStore';
import { learningApi } from '../../api';
import { colors } from '../../theme/colors';
import { groupIntoPhases } from '../../utils/mapPhases';
import { getCachedRecommended, setCachedRecommended, getCachedLevels, getCachedFirstLevel } from '../../services/bootCache';
import { getUnlockedSeasons, unlockSeason } from '../../utils/storage';
import type { SurahLevel } from '../../types/api';
import type { MapNavProp } from '../../navigation/types';

// ── Asset refs (static, so Metro can bundle them) ──────────────────
const TREE_SRCS = [
  require('../../../assets/tree1.png'),
  require('../../../assets/tree2.png'),
  require('../../../assets/tree3.png'),
] as const;
const MOSQUE_SRC   = require('../../../assets/mosque.png');
const BIRDS_SRC    = require('../../../assets/birds.png');
const CLOUD_SRC    = require('../../../assets/clouds.png');
const START_SRC    = require('../../../assets/start.png');
const BRIDGE_SRC   = require('../../../assets/map/bridge.png');
const SCROLL_SRC   = require('../../../assets/map/scroll2.png');
const GRASS_SRC    = require('../../../assets/map/grass.jpg');
const BRICK_SRC    = require('../../../assets/map/bricks.jpg');
const POND_SRC     = require('../../../assets/map/pond.png');
const BUSH_SRC     = require('../../../assets/map/bush.png');
// Pre-engraved signs — the season number is baked into the art itself, one
// file per season, keyed by season number (1-indexed, matching the label on
// the sign) rather than composed at runtime from a blank sign + overlaid text.
const SEASON_SIGN_SRCS: Record<number, ImageSourcePropType> = {
  1: require('../../../assets/map/s1.png'),
  2: require('../../../assets/map/s2.png'),
  3: require('../../../assets/map/s3.png'),
};
// Real aspect ratio of the sign art (186x326). All three files share it.
const SEASON_GATE_ASPECT = 186 / 326;
const SKY_SRC      = require('../../../assets/map/sky.jpg');
const MOUNTAINS_SRC = require('../../../assets/map/mountains.png');
const NODE_SRCS = {
  locked: require('../../../assets/map/node_locked.png'),
  current: require('../../../assets/map/node_current.png'),
  completed: require('../../../assets/map/node_completed.png'),
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
  levels: Array<{ id: string; levelNum: number }>;
  xFractions: number[];  // x position of each level's node as fraction of map width
}

const SECTIONS_DEF: SectionDef[] = [
  {
    // 6 ayahs ÷ 2 = 3 groups: 1-2, 3-4, 5-6
    surahNum: 114, name: 'An-Nas', arabicName: 'الناس', ayahCount: 6,
    levels: [
      { id: '114_g1', levelNum: 1 },
      { id: '114_g2', levelNum: 2 },
      { id: '114_g3', levelNum: 3 },
    ],
    xFractions: [0.55, 0.20, 0.62],
  },
  {
    // 5 ayahs ÷ 2 = 3 groups: 1-2, 3-4, 5
    surahNum: 113, name: 'Al-Falaq', arabicName: 'الفلق', ayahCount: 5,
    levels: [
      { id: '113_g1', levelNum: 1 },
      { id: '113_g2', levelNum: 2 },
      { id: '113_g3', levelNum: 3 },
    ],
    xFractions: [0.35, 0.68, 0.28],
  },
  {
    // 4 ayahs ÷ 2 = 2 groups: 1-2, 3-4
    surahNum: 112, name: 'Al-Ikhlas', arabicName: 'الإخلاص', ayahCount: 4,
    levels: [
      { id: '112_g1', levelNum: 1 },
      { id: '112_g2', levelNum: 2 },
    ],
    xFractions: [0.60, 0.22],
  },
  {
    // 5 ayahs ÷ 2 = 3 groups: 1-2, 3-4, 5
    surahNum: 111, name: 'Al-Masad', arabicName: 'المسد', ayahCount: 5,
    levels: [
      { id: '111_g1', levelNum: 1 },
      { id: '111_g2', levelNum: 2 },
      { id: '111_g3', levelNum: 3 },
    ],
    xFractions: [0.65, 0.28, 0.62],
  },
  {
    // 3 ayahs ÷ 2 = 2 groups: 1-2, 3
    surahNum: 110, name: 'An-Nasr', arabicName: 'النصر', ayahCount: 3,
    levels: [
      { id: '110_g1', levelNum: 1 },
      { id: '110_g2', levelNum: 2 },
    ],
    xFractions: [0.38, 0.72],
  },
  {
    // 6 ayahs ÷ 2 = 3 groups: 1-2, 3-4, 5-6
    surahNum: 109, name: 'Al-Kafirun', arabicName: 'الكافرون', ayahCount: 6,
    levels: [
      { id: '109_g1', levelNum: 1 },
      { id: '109_g2', levelNum: 2 },
      { id: '109_g3', levelNum: 3 },
    ],
    xFractions: [0.22, 0.65, 0.25],
  },
  {
    // 3 ayahs ÷ 2 = 2 groups: 1-2, 3
    surahNum: 108, name: 'Al-Kawthar', arabicName: 'الكوثر', ayahCount: 3,
    levels: [
      { id: '108_g1', levelNum: 1 },
      { id: '108_g2', levelNum: 2 },
    ],
    xFractions: [0.45, 0.72],
  },
];

// Seasons (phases) — pure loading/pacing grouping, not an access gate. Pure
// data derived from SECTIONS_DEF, so it doesn't depend on screen width.
const PHASE_GROUPS: number[][] = groupIntoPhases(SECTIONS_DEF.map(d => d.surahNum));
// Phases double as "seasons" now — surah number -> season index (0,1,2).
const SURAH_TO_SEASON: Record<number, number> = {};
PHASE_GROUPS.forEach((group, idx) => group.forEach(n => { SURAH_TO_SEASON[n] = idx; }));

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

// ── Types for the fully-computed, width-dependent map model ────────
interface DecorMosque  { y: number; x: number }
interface DecorTree    { y: number; x: number; src: (typeof TREE_SRCS)[number] }
interface DecorBird    { y: number; x: number }
interface DecorBridge  { y: number; x: number; w: number; h: number }
interface DecorBush    { y: number; x: number }
interface DecorPond    { y: number; x: number }
interface DecorSeasonGate { x: number; y: number; w: number; h: number; unlocksSeasonIdx: number }
interface ParallaxLayer { puffs: { x: number; y: number; w: number; h: number; opacity: number }[]; speed: number; blur: number }
interface LabelBox { x: number; y: number; w: number; h: number; isLeft: boolean }
interface PillBox { x: number; y: number; w: number; h: number }

interface MapModel {
  MAP_W: number; SCALE: number; sc: (n: number) => number;
  NODE_SIZE: number; NODE_GAP: number; SECTION_EXTRA: number; TOP_MARGIN: number; FOOTER_PAD: number;
  BASE_SECTIONS: Section[]; MAP_H: number; ALL_NODES: SectionNode[];
  PATH_D: string;
  DECORATIONS: { mosques: DecorMosque[]; trees: DecorTree[]; birds: DecorBird[]; bridges: DecorBridge[]; bushes: DecorBush[]; ponds: DecorPond[]; seasonGates: DecorSeasonGate[] };
  PARALLAX_FAR: ParallaxLayer; PARALLAX_MID: ParallaxLayer; PARALLAX_NEAR: ParallaxLayer;
  SKY_BOUNDARY_Y: number;
  GRASS_EDGE_D: string;
  SKY_CLOUDS: { x: number; y: number; w: number; h: number }[];
  SKY_BIRDS: { x: number; y: number; w: number; flip: boolean }[];
  AYAH_PILLS: Record<string, PillBox>;
  SURAH_LABELS: Record<number, LabelBox>;
}

// ── ONE function: real device width in → every pixel of the map's layout
// out. Nothing derived here is a module-level constant anymore — it's all
// recomputed whenever width changes (see useWindowDimensions in the
// component), so split-screen/foldable/rotation resizes actually relayout
// instead of leaving a stale frozen width baked in from first mount.
function buildMapModel(mapW: number): MapModel {
  const BASELINE_W = 393;
  const SCALE = Math.min(1.3, Math.max(0.82, mapW / BASELINE_W));
  const sc = (n: number) => Math.round(n * SCALE);

  const NODE_SIZE     = sc(56);
  const NODE_GAP      = sc(170);
  const SECTION_EXTRA = sc(90);
  const TOP_MARGIN    = sc(220);
  const FOOTER_PAD    = sc(200);
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

  // ── Layout: section defs → pixel positions ──
  let y = TOP_MARGIN;
  const BASE_SECTIONS: Section[] = SECTIONS_DEF.map(def => {
    const nodes: SectionNode[] = def.levels.map((lvl, nIdx) => ({
      id: lvl.id,
      x: Math.round(def.xFractions[nIdx] * mapW - NODE_SIZE / 2),
      y: y + nIdx * NODE_GAP,
      status: 'locked' as NodeStatus,
      stars: 0,
      levelNum: lvl.levelNum,
    }));
    const lastNodeY = y + (def.levels.length - 1) * NODE_GAP;
    y = lastNodeY + NODE_GAP + SECTION_EXTRA;
    return { surahNum: def.surahNum, name: def.name, arabicName: def.arabicName, ayahCount: def.ayahCount, nodes };
  });
  const lastSec = BASE_SECTIONS[BASE_SECTIONS.length - 1];
  const MAP_H = lastSec.nodes[lastSec.nodes.length - 1].y + NODE_SIZE + FOOTER_PAD;
  const ALL_NODES = BASE_SECTIONS.flatMap(s => s.nodes);

  // ── Path string + geometry through all node centres ──
  const PATH_PTS = ALL_NODES.map(n => ({ x: n.x + NODE_SIZE / 2, y: n.y + NODE_SIZE / 2 }));
  let PATH_D = '';
  if (PATH_PTS.length >= 2) {
    PATH_D = `M ${PATH_PTS[0].x} ${PATH_PTS[0].y}`;
    for (let i = 1; i < PATH_PTS.length; i++) {
      const p = PATH_PTS[i - 1], c = PATH_PTS[i];
      const midY = (p.y + c.y) / 2;
      PATH_D += ` C ${p.x} ${midY}, ${c.x} ${midY}, ${c.x} ${c.y}`;
    }
  }

  // PATH_D's segments are cubic Beziers with control points pinned at the
  // same-y midpoint (see the PATH_D loop above), which reduces to
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
        if (
          fits
          && !isBlocked(py, side, h, zones, gap)
          && roadClearAcross(py, py + h, x, x + w, gap)
        ) {
          return { side, x: Math.round(x), y: Math.round(py) };
        }
      }
    }
    return null;
  }

  // ── Shared zone registry — seeded with the ayah pill / surah label /
  // bridge / season-gate arch FIRST (real geometry, computed below), before
  // any tree/mosque/rock/bird/lantern is placed, so nothing can land on them. ──
  const placed: Zone[] = [];

  // Ayah pill — real offset derived from NODE_SIZE (not implicit flow-stacking).
  const PILL_W = sc(80), PILL_H = sc(26);
  const AYAH_PILLS: Record<string, PillBox> = {};
  BASE_SECTIONS.forEach(section => {
    section.nodes.forEach((node, nodeIdx) => {
      const px = Math.max(0, Math.min(mapW - PILL_W, node.x + NODE_SIZE / 2 - PILL_W / 2));
      const py = node.y + NODE_SIZE + sc(6);
      AYAH_PILLS[`${section.surahNum}_${nodeIdx}`] = { x: px, y: py, w: PILL_W, h: PILL_H };
      placed.push({ y: py, side: 'left', height: PILL_H });
      placed.push({ y: py, side: 'right', height: PILL_H });
    });
  });

  // Surah label — real offset derived from firstNode.x, mirroring the
  // formula LumaFloat already used correctly (lumaLeft), not a hardcoded
  // screen-edge constant.
  const LABEL_H = sc(60);
  const SURAH_LABELS: Record<number, LabelBox> = {};
  BASE_SECTIONS.forEach(section => {
    const firstNode = section.nodes[0];
    // Scroll width follows the name's length instead of one fixed size for
    // every surah — "An-Nasr" and "Al-Kafirun" don't need (and don't look
    // right in) the same box.
    const labelW = Math.round(Math.max(sc(95), Math.min(sc(155), sc(58) + section.name.length * sc(7))));
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

  // Season-gate signs — the two biggest landmarks on the map. Computed and
  // placed *before* the lesson-node zones below (and before any
  // mosque/tree/bird/bush/pond) so they get first pick of clear space at
  // each season boundary — they're fixed, critical landmarks, not optional
  // decorations that should lose a zone conflict and silently disappear.
  const secMidYs = BASE_SECTIONS.slice(0, -1).map((sec, i) => {
    const lastY  = sec.nodes[sec.nodes.length - 1].y + NODE_SIZE / 2;
    const firstY = BASE_SECTIONS[i + 1].nodes[0].y + NODE_SIZE / 2;
    return Math.round((lastY + firstY) / 2);
  });

  const SEASON_GATE_H = sc(260); // bumped from 220 (~18% bigger) — more room for the "Season N" text
  const SEASON_GATE_W = Math.round(SEASON_GATE_H * SEASON_GATE_ASPECT);
  const seasonGates: DecorSeasonGate[] = [];
  // Tries full size, then a shrunk size (both fully collision-checked via
  // placeSide — real road clearance AND other decorations). If neither
  // fits, the fallback below still requires real road clearance (mirrors
  // placeSide's own pathNormalAt/CLEARANCE+extra math and roadClearAcross
  // check) — the only thing it's allowed to skip is the other-decoration
  // zone registry (isBlocked), so worst case it sits closer to a tree/bush
  // than ideal, never overlapping the actual road. Only if nothing clears
  // the road at any margin (should be exceedingly rare) does it fall back
  // to a flat offset with no check at all, as an absolute last resort —
  // still never silently dropping one of "the two biggest landmarks on the
  // map" the way a cosmetic decoration is allowed to.
  const placeGate = (midY: number, prefer: 'left' | 'right') => {
    for (const scaleDown of [1, 0.8]) {
      const w = Math.round(SEASON_GATE_W * scaleDown);
      const h = Math.round(SEASON_GATE_H * scaleDown);
      const p = placeSide(midY, w, h, prefer, placed, 10);
      if (p) return { ...p, w, h };
    }
    const w = Math.round(SEASON_GATE_W * 0.8), h = Math.round(SEASON_GATE_H * 0.8);
    for (const side of [prefer, prefer === 'left' ? 'right' : 'left'] as const) {
      const dir = side === 'left' ? -1 : 1;
      for (const extra of [0, sc(16), sc(32), sc(64), sc(96)]) {
        const pathX = pathXAt(midY);
        const { nx, ny } = pathNormalAt(midY);
        const clearance = CLEARANCE + extra;
        const anchorX = pathX + nx * clearance * dir;
        const anchorY = midY + ny * clearance * dir;
        const x = side === 'left' ? anchorX - w : anchorX;
        const py = anchorY - h / 2;
        const fits = side === 'left' ? x >= 0 : x + w <= mapW;
        if (fits && roadClearAcross(py, py + h, x, x + w, 10)) {
          return { side, x: Math.round(x), y: Math.round(py), w, h };
        }
      }
    }
    const pathX = pathXAt(midY);
    const x = prefer === 'left' ? Math.max(0, pathX - CLEARANCE - w) : Math.min(mapW - w, pathX + CLEARANCE);
    return { side: prefer, x: Math.round(x), y: Math.round(midY - h / 2), w, h };
  };
  if (secMidYs.length > 5) {
    // Gate 1 — Season 1 → Season 2 boundary. Prefers 'right', deliberately
    // opposite the bridge's hardcoded 'left' preference (anchored at this
    // same secMidYs[2] boundary below) so the two landmarks land on
    // opposite sides instead of competing for one spot.
    const p1 = placeGate(secMidYs[2] - sc(20), 'right');
    placed.push({ y: p1.y, side: p1.side, height: p1.h });
    seasonGates.push({ x: p1.x, y: p1.y, w: p1.w, h: p1.h, unlocksSeasonIdx: 1 });

    // Gate 2 — Season 2 → Season 3 boundary. No competing landmark here.
    const p2 = placeGate(secMidYs[5], 'left');
    placed.push({ y: p2.y, side: p2.side, height: p2.h });
    seasonGates.push({ x: p2.x, y: p2.y, w: p2.w, h: p2.h, unlocksSeasonIdx: 2 });
  }

  // Lesson nodes themselves — previously never registered here, so nothing
  // stopped a decoration from landing on top of a node as long as it cleared
  // *other decorations*. A node sits on the path's own centerline (not off
  // to one side), so it's registered on BOTH sides with a margin so nothing
  // anchors too close to its y regardless of which side it ends up on.
  ALL_NODES.forEach(node => {
    const zoneH = NODE_SIZE + sc(28);
    const zoneY = node.y - sc(14);
    placed.push({ y: zoneY, side: 'left', height: zoneH });
    placed.push({ y: zoneY, side: 'right', height: zoneH });
  });

  // ── Decorations — every type placed via placeSide, into the zones already
  // seeded above. Priority: mosque > tree > rock > bird > lantern. ──
  const nodeMidYs = ALL_NODES.slice(0, -1).map((n, i) => Math.round((n.y + ALL_NODES[i + 1].y) / 2));

  const mosqueW = sc(72), mosqueH = sc(88);
  const mosques: DecorMosque[] = [];
  secMidYs.forEach((midY, i) => {
    const prefer: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
    const p = placeSide(midY, mosqueW, mosqueH, prefer, placed);
    if (p) { placed.push({ y: p.y, side: p.side, height: mosqueH }); mosques.push({ y: p.y, x: p.x }); }
  });
  // Extra mosque pass along the road itself — more mosques scattered
  // between nodes too, not just at section boundaries.
  nodeMidYs.forEach((midY, i) => {
    if (i % 2 !== 0) return;
    const prefer: 'left' | 'right' = i % 4 === 0 ? 'left' : 'right';
    const p = placeSide(midY - sc(40), mosqueW, mosqueH, prefer, placed, 6);
    if (p) { placed.push({ y: p.y, side: p.side, height: mosqueH }); mosques.push({ y: p.y, x: p.x }); }
  });
  // Third mosque pass — even more of them dotted along the way.
  nodeMidYs.forEach((midY, i) => {
    if (i % 2 === 0) return;
    const prefer: 'left' | 'right' = i % 3 === 0 ? 'right' : 'left';
    const p = placeSide(midY + sc(45), mosqueW, mosqueH, prefer, placed, 6);
    if (p) { placed.push({ y: p.y, side: p.side, height: mosqueH }); mosques.push({ y: p.y, x: p.x }); }
  });

  const treeW = sc(58), treeH = sc(80);
  const trees: DecorTree[] = [];
  nodeMidYs.forEach((midY, i) => {
    const pL = placeSide(midY, treeW, treeH, 'left', placed, 4);
    if (pL) { placed.push({ y: pL.y, side: pL.side, height: treeH }); trees.push({ y: pL.y, x: pL.x, src: TREE_SRCS[i % 3] }); }
    const pR = placeSide(midY + sc(22), treeW, treeH, 'right', placed, 4);
    if (pR) { placed.push({ y: pR.y, side: pR.side, height: treeH }); trees.push({ y: pR.y, x: pR.x, src: TREE_SRCS[(i + 1) % 3] }); }
  });
  // Extra tree pass at section boundaries — denser treeline, still
  // zone-checked so it can never land on a mosque/label/pill/etc.
  secMidYs.forEach((midY, i) => {
    const prefer: 'left' | 'right' = i % 2 === 0 ? 'right' : 'left';
    const p = placeSide(midY + sc(35), treeW, treeH, prefer, placed, 4);
    if (p) { placed.push({ y: p.y, side: p.side, height: treeH }); trees.push({ y: p.y, x: p.x, src: TREE_SRCS[(i + 2) % 3] }); }
  });
  // Third tree pass — even denser treeline along the grass, all still
  // zone-checked so nothing overlaps.
  nodeMidYs.forEach((midY, i) => {
    const prefer: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
    const p = placeSide(midY - sc(38), treeW, treeH, prefer, placed, 4);
    if (p) { placed.push({ y: p.y, side: p.side, height: treeH }); trees.push({ y: p.y, x: p.x, src: TREE_SRCS[i % 3] }); }
  });

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

  // Bridge — a riverside landmark beside the road, not a crossing laid over
  // it. Placed once, near the first season boundary, on whichever side has
  // real room (zone-checked like everything else).
  const bridgeW = sc(120), bridgeH = sc(64);
  const bridges: DecorBridge[] = [];
  if (secMidYs.length > 2) {
    const p = placeSide(secMidYs[2] + sc(50), bridgeW, bridgeH, 'left', placed, 6);
    if (p) { placed.push({ y: p.y, side: p.side, height: bridgeH }); bridges.push({ y: p.y, x: p.x, w: bridgeW, h: bridgeH }); }
  }

  // Bushes/flower patches — low, wide ground accents (matches bush.png's own
  // ~2.6:1 aspect ratio). Placed via the same placeSide + zone registry as
  // everything else, so they land beside the road, never on it.
  const bushW = sc(84), bushH = sc(32);
  const bushes: DecorBush[] = [];
  nodeMidYs.forEach((midY, i) => {
    if (i % 2 !== 0) return;
    const prefer: 'left' | 'right' = i % 4 === 0 ? 'left' : 'right';
    const p = placeSide(midY - sc(10), bushW, bushH, prefer, placed, 4);
    if (p) { placed.push({ y: p.y, side: p.side, height: bushH }); bushes.push({ y: p.y, x: p.x }); }
  });
  secMidYs.forEach((midY, i) => {
    const prefer: 'left' | 'right' = i % 2 === 0 ? 'right' : 'left';
    const p = placeSide(midY - sc(25), bushW, bushH, prefer, placed, 4);
    if (p) { placed.push({ y: p.y, side: p.side, height: bushH }); bushes.push({ y: p.y, x: p.x }); }
  });

  // Ponds — sparser than bushes/trees, one every couple of section
  // boundaries, same zone-checked placement (independent of the single
  // pond already tied to the bridge above).
  const pondW = sc(90), pondH = sc(48);
  const ponds: DecorPond[] = [];
  secMidYs.forEach((midY, i) => {
    if (i % 2 !== 0) return;
    const prefer: 'left' | 'right' = i % 4 === 0 ? 'left' : 'right';
    const p = placeSide(midY + sc(15), pondW, pondH, prefer, placed, 6);
    if (p) { placed.push({ y: p.y, side: p.side, height: pondH }); ponds.push({ y: p.y, x: p.x }); }
  });

  // ── Ground color boundary — sky ends, ground begins. Shared by the
  // gradient, the grass texture wash, and the static sky-cloud strip so none
  // of them can drift out of sync with each other. Extended down to roughly
  // the first level's node so the night sky reads for longer before the
  // ground takes over. ──
  const SKY_BOUNDARY_Y = Math.round(TOP_MARGIN + NODE_SIZE * 0.35);

  // Jagged grass edge — a torn/uneven line instead of a dead-flat cut, as if
  // the grass texture were cut into the sky rather than pasted under it.
  // Deterministic (hash-seeded), so it doesn't reshuffle on re-render.
  const edgeStep = sc(16), edgeAmp = sc(9);
  let GRASS_EDGE_D = `M 0 ${Math.round(SKY_BOUNDARY_Y + (hash(0) - 0.5) * edgeAmp * 2)}`;
  {
    let seed = 1;
    for (let x = edgeStep; x < mapW; x += edgeStep) {
      const ey = SKY_BOUNDARY_Y + (hash(seed) - 0.5) * edgeAmp * 2;
      GRASS_EDGE_D += ` L ${Math.round(x)} ${Math.round(ey)}`;
      seed++;
    }
  }
  GRASS_EDGE_D += ` L ${mapW} ${SKY_BOUNDARY_Y} L ${mapW} ${MAP_H} L 0 ${MAP_H} Z`;

  // More clouds scattered across the sky band itself (not just 2 under the
  // Bismillah card), varied size/position so the sky doesn't look empty.
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
  function buildParallaxLayer(spacingY: number, w: number, h: number, baseOpacity: number, speed: number, blur: number): ParallaxLayer {
    const puffs: ParallaxLayer['puffs'] = [];
    let i = 0;
    for (let py = -h; py < MAP_H + h; py += spacingY) {
      const px = Math.round((hash(i) * mapW * 1.4) - mapW * 0.2);
      puffs.push({ x: px, y: Math.round(py), w, h, opacity: baseOpacity + hash(i + 50) * 0.15 });
      i++;
    }
    return { puffs, speed, blur };
  }
  // Sparser than before — these used to crowd the road itself; now just a
  // light ambient touch instead of a wall of clouds drifting over the path.
  const PARALLAX_FAR  = buildParallaxLayer(sc(680), sc(90),  sc(48), 0.14, 0.5, 0);
  const PARALLAX_MID  = buildParallaxLayer(sc(900), sc(130), sc(66), 0.16, 1.0, 0);
  const PARALLAX_NEAR = buildParallaxLayer(sc(1150), sc(190), sc(96), 0.15, 1.6, 6);

  return {
    MAP_W: mapW, SCALE, sc,
    NODE_SIZE, NODE_GAP, SECTION_EXTRA, TOP_MARGIN, FOOTER_PAD,
    BASE_SECTIONS, MAP_H, ALL_NODES,
    PATH_D,
    DECORATIONS: { mosques, trees, birds, bridges, bushes, ponds, seasonGates },
    PARALLAX_FAR, PARALLAX_MID, PARALLAX_NEAR,
    SKY_BOUNDARY_Y, GRASS_EDGE_D, SKY_CLOUDS, SKY_BIRDS,
    AYAH_PILLS, SURAH_LABELS,
  };
}

// ── Styles that depend on the model's `sc()` — rebuilt via useMemo whenever
// the model changes (i.e. whenever screen width changes). ──
function makeStyles(M: MapModel) {
  const { sc, NODE_SIZE } = M;
  const S = StyleSheet.create({
    // Ground green, not sky blue — this is the fallback fill for whatever
    // isn't covered by the sky backdrop or the map's own content (e.g.
    // bottom overscroll bounce). It should never read as "the sky leaking
    // through at the bottom."
    container: { flex: 1, backgroundColor: colors.mapBg },
    hud: { backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: sc(16), paddingVertical: sc(6) },
    hudRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    hudPill: {
      flexDirection: 'row', alignItems: 'center', gap: sc(4),
      backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: sc(20),
      paddingHorizontal: sc(10), paddingVertical: sc(5),
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 3,
    },
    hudVal: { fontFamily: 'Nunito_700Bold', fontSize: sc(12), color: '#DC2626' },
    hudStreakEmoji: { fontSize: sc(16) },
    bismillahCard: {
      marginHorizontal: sc(12), marginTop: sc(4), marginBottom: sc(6),
      paddingHorizontal: sc(20), paddingVertical: sc(14),
      backgroundColor: 'rgba(4,20,10,0.93)', borderRadius: sc(18), alignItems: 'center',
      borderWidth: 1.5, borderColor: 'rgba(224,188,78,0.45)',
      shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.55, shadowRadius: 10, elevation: 8,
    },
    bismillahText: { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: sc(30), color: '#E0BC4E', textAlign: 'center', lineHeight: sc(46) },
    bismillahSub:  { fontFamily: 'Nunito_400Regular', fontSize: sc(11), color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: sc(2) },
    loadingOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(42,140,90,0.72)', zIndex: 20,
    },
    node: { width: NODE_SIZE, height: NODE_SIZE, alignItems: 'center', justifyContent: 'center' },
    nodeImg: { position: 'absolute', width: NODE_SIZE, height: NODE_SIZE },
    nodeShadow: {
      position: 'absolute', bottom: -sc(4), width: NODE_SIZE * 0.8, height: sc(10), borderRadius: sc(6),
      backgroundColor: 'rgba(0,0,0,0.25)', left: NODE_SIZE * 0.1,
    },
    pulseRing: { position: 'absolute', width: NODE_SIZE + sc(20), height: NODE_SIZE + sc(20), borderRadius: (NODE_SIZE + sc(20)) / 2, borderWidth: 3, borderColor: '#37A168' },
    nodeNumber: { fontFamily: 'Nunito_700Bold', fontSize: sc(20), color: 'white', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    lockIcon: { fontSize: sc(18) },
    nodeWrapper: { alignItems: 'center' },
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
    lumaGlow: {
      width: sc(72), height: sc(72), borderRadius: sc(36),
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#fff', shadowOpacity: 0.6, shadowRadius: 8, elevation: 5,
    },
    lumaImg: { width: sc(66), height: sc(66) },
    endText: { fontFamily: 'Nunito_700Bold', fontSize: sc(11), color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: sc(4) },
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
function SpeechBubble({ text, SB }: { text: string; SB: Styles['SB'] }) {
  return (
    <View style={SB.wrapper}>
      <View style={SB.bubble}>
        <Text style={SB.text}>{text}</Text>
      </View>
      <View style={SB.tail} />
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
function Pathway({ d, sc }: { d: string; sc: (n: number) => number }) {
  return (
    <G>
      {/* Beveled undercoat so the road reads as carved into the ground —
          kept light so it doesn't read as a heavy shadow. */}
      <Path d={d} stroke="rgba(60,38,8,0.14)" strokeWidth={sc(64)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={d} stroke="rgba(60,38,8,0.18)" strokeWidth={sc(50)} fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(0, ${sc(2)})`} />
      {/* Brick texture — the actual walkable surface */}
      <Path d={d} stroke="url(#brickPattern)" strokeWidth={sc(40)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={d} stroke="rgba(20,10,4,0.14)" strokeWidth={sc(3)} fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(0, ${sc(2)})`} />
      {/* Thin top-edge highlight for a subtle 3D pop */}
      <Path d={d} stroke="rgba(255,248,220,0.32)" strokeWidth={sc(3)} fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(0, ${-sc(1)})`} />
    </G>
  );
}

// ── Map node — one visual shell for every non-completed/non-current status.
// The ONLY differentiator for a real locked gate is the lock icon; nothing
// is dimmed/faded anymore (dimming previously read as "broken", not "locked"). ──
function MapNode({ status, stars, pulseAnim, goldAnim, levelNum, isFetching, S }: {
  status: NodeStatus; stars: number;
  pulseAnim: Animated.Value; goldAnim: Animated.Value;
  levelNum: number; isFetching?: boolean; S: Styles['S'];
}) {
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const goldScale  = goldAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const nodeImgSrc = status === 'completed' ? NODE_SRCS.completed : status === 'current' ? NODE_SRCS.current : NODE_SRCS.locked;

  return (
    <View style={S.nodeWrapper}>
      <View style={S.nodeShadow} />
      <Animated.View style={[
        S.node,
        status === 'completed' && { transform: [{ scale: goldScale }] },
        status === 'current' && { transform: [{ scale: pulseScale }] },
      ]}>
        {status === 'current' && (
          <Animated.View style={[S.pulseRing, {
            transform: [{ scale: pulseScale }],
            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          }]} />
        )}
        <Image source={nodeImgSrc} resizeMode="contain" style={S.nodeImg} />
        {status === 'locked' ? (
          <Text style={S.lockIcon}>🔒</Text>
        ) : status === 'pending' && isFetching ? (
          <ActivityIndicator size="small" color="#5A3A00" />
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

// ── Luma mascot ───────────────────────────────────────────────────
function LumaFloat({ style, speech, floatAnim, S, SB }: { style?: object; speech?: string; floatAnim: Animated.Value; S: Styles['S']; SB: Styles['SB'] }) {
  const ty = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  return (
    <View style={[{ alignItems: 'center' }, style]}>
      {speech && <SpeechBubble text={speech} SB={SB} />}
      <View style={S.lumaGlow}>
        <Animated.Image
          source={require('../../../assets/images/lumo_transparent.png')}
          style={[S.lumaImg, { transform: [{ translateY: ty }] }]}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────
export default function MapScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { learning, refreshLearning } = useAuthStore();
  const { width, height } = useWindowDimensions();
  const M = useMemo(() => {
    console.time('[MAP] buildMapModel');
    const result = buildMapModel(width);
    console.timeEnd('[MAP] buildMapModel');
    return result;
  }, [width]);
  const styles = useMemo(() => makeStyles(M), [M]);
  const { S, SL, SB } = styles;
  const {
    MAP_W, MAP_H, sc, NODE_SIZE, TOP_MARGIN, BASE_SECTIONS, DECORATIONS,
    PARALLAX_FAR, PARALLAX_MID, PARALLAX_NEAR,
    SKY_BOUNDARY_Y, GRASS_EDGE_D, SKY_CLOUDS, SKY_BIRDS, AYAH_PILLS, SURAH_LABELS, PATH_D,
  } = M;

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

  // If learning is still null when this screen becomes active (hydrate's
  // retries exhausted, or a stale session), nudge one refresh rather than
  // leaving the HUD stuck on the "not loaded" placeholder indefinitely.
  // Self-limiting: learning is only ever nulled at logout.
  useEffect(() => {
    if (!learning) void refreshLearning({ force: true });
  }, [learning, refreshLearning]);

  // Backend has no explicit level-number/order field on SurahLevel — nodes
  // are indexed by raw array position (see enrichedSections below), so sort
  // defensively by start_ayah instead of trusting the response order.
  const sortedLevels = (levels: SurahLevel[]) => levels.slice().sort((a, b) => a.start_ayah - b.start_ayah);

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

      const startTime = Date.now();
      await Promise.all([currentSurahFetch, fetchPhase(0, currentSurah)]);
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
      // handleUnlockConfirm below).
      for (let i = 1; i < PHASE_GROUPS.length; i++) {
        if (cancelled) return;
        if (!unlockedSet.has(i)) continue;
        await new Promise(res => setTimeout(res, 700));
        if (cancelled) return;
        await fetchPhase(i, currentSurah);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Re-fetch the current surah's levels every time the map regains focus
  // (skip the very first focus — the mount effect above already covers it).
  // MapScreen sits underneath LessonStart/LessonSession/LessonComplete in the
  // same native stack, so it never remounts between lessons; without this,
  // finishing a lesson invalidates the shared bootCache (see
  // lessonStore.completeSession) but this screen's own `fullLevels` state —
  // already populated before the lesson — never gets told to reload, so the
  // map kept showing pre-completion statuses indefinitely.
  const isFirstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) { isFirstFocusRef.current = false; return; }
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

        // The surah the user just finished a lesson in may no longer be
        // `currentSurah` above (finishing a surah's last level advances the
        // "recommended next" pointer to the next surah) — without this, that
        // just-finished surah's node statuses never get refreshed and its
        // last node stays stuck non-golden with the next node stuck locked.
        const completedSurah = useLessonStore.getState().lastCompletedSurah;
        if (completedSurah != null && completedSurah !== currentSurah && !cancelled) {
          try {
            const completedLevels = await learningApi.levels(completedSurah);
            if (!cancelled) setFullLevels(prev => ({ ...prev, [completedSurah]: sortedLevels(completedLevels) }));
            useLessonStore.getState().clearLastCompletedSurah();
          } catch (e) { console.warn('[MapScreen] completed-surah refresh failed:', e); }
        } else if (completedSurah != null) {
          useLessonStore.getState().clearLastCompletedSurah();
        }
      })();
      return () => { cancelled = true; };
    }, [learning]),
  );

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
          return { ...node, id: group.lesson_group_id, status: stageToNodeStatus(group.status), stars: group.stars ?? 0, startAyah: group.start_ayah, endAyah: group.end_ayah, resolved: true };
        }
        if (nodeIdx === 0 && first) {
          return { ...node, id: first.lesson_group_id, status: stageToNodeStatus(first.status), stars: first.stars ?? 0, startAyah: first.start_ayah, endAyah: first.end_ayah, resolved: true };
        }
        if (nodeIdx === 0) {
          // First level of a surah is never actually locked server-side —
          // just not confirmed yet. Tappable; see handleNodePress.
          return { ...node, status: 'pending' as NodeStatus, resolved: false };
        }
        return { ...node, resolved: false }; // stays computeLayout's default 'locked' — a real gate
      }),
    };
  });

  async function handleNodePress(section: Section, node: SectionNode) {
    if (node.status === 'locked') return; // real gate — previous level not completed
    if (node.status === 'pending') {
      const lvl = await fetchFirstLevelNow(section.surahNum);
      if (!lvl) return; // fetch failed — stay put rather than navigating with a bad id
      navigation.navigate('LessonSession', { groupId: lvl.lesson_group_id, surahName: section.name, surahNumber: section.surahNum });
      return;
    }
    navigation.navigate('LessonSession', { groupId: node.id, surahName: section.name, surahNumber: section.surahNum });
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
    firstActiveNode = allEnrichedNodes.find(n => n.surahNum === recommended.surah_number);
  }

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const goldAnim  = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scrollY   = useRef(new Animated.Value(0)).current;
  const onScroll  = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true },
  );

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 900,  useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 900,  useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(goldAnim,  { toValue: 1, duration: 1400, useNativeDriver: true }),
      Animated.timing(goldAnim,  { toValue: 0, duration: 1400, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 1300, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 1300, useNativeDriver: true }),
    ])).start();
  }, []);

  // Luma: beside the first active node, always on the opposite side from
  // that surah's scroll label (they'd otherwise compete for the same side).
  const scrollIsLeft = firstActiveNode ? SURAH_LABELS[firstActiveNode.surahNum]?.isLeft ?? (firstActiveNode.x > MAP_W / 2) : false;
  const lumaLeft = firstActiveNode
    ? (!scrollIsLeft
        ? Math.max(0, firstActiveNode.x - sc(112))
        : firstActiveNode.x + NODE_SIZE + sc(6))
    : sc(4);
  const lumaTop   = firstActiveNode ? firstActiveNode.y - sc(36) : sc(80);
  const lumaSpeech = firstActiveNode?.status === 'current'
    ? "Ready for today's lesson? 💪"
    : 'Begin here! ✨';

  // Keep the viewport following Lumo: on first load (opening the map fresh)
  // and again any time firstActiveNode moves to a different node (finishing
  // a level advances the recommendation to N+1, a pull-to-refresh may also
  // reveal a new node), scroll so that node is in view instead of leaving
  // the user to hunt for it starting from the very top of the map.
  useEffect(() => {
    if (loadingPaths || !firstActiveNode) return;
    if (autoScrolledNodeIdRef.current === firstActiveNode.id) return;
    autoScrolledNodeIdRef.current = firstActiveNode.id;
    const targetY = Math.max(0, firstActiveNode.y - height / 2);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    });
  }, [firstActiveNode?.id, loadingPaths, height]);

  const skyPct = Math.min(95, (SKY_BOUNDARY_Y / MAP_H) * 100);

  return (
    <View style={S.container}>
      {/* Sky backdrop — fixed behind the HUD and the Bismillah card so the
          sky reads as one continuous surface from the very top of the
          screen, instead of cutting from a flat color to the photo sky only
          once the map canvas begins. Bounded height (not the whole
          container), so scrolling past it correctly reveals the green
          container fallback rather than sky bleeding into the ground. */}
      <Image source={SKY_SRC} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: sc(320) }} />

      {/* HUD — streak (emoji) top-left, XP top-right. Hearts hidden on the
          map for now (still shown in-lesson). */}
      <View style={[S.hud, { paddingTop: insets.top + sc(4) }]}>
        <View style={S.hudRow}>
          <View style={S.hudPill}>
            <Text style={S.hudStreakEmoji}>🔥</Text>
            <Text style={[S.hudVal, { color: '#EA580C' }]}>{learning ? learning.current_streak : '—'}</Text>
          </View>
          <View style={S.hudPill}>
            <Text>⚡</Text>
            <Text style={[S.hudVal, { color: '#2A7D4F' }]}>{learning ? `${learning.xp_total} XP` : '— XP'}</Text>
          </View>
        </View>
      </View>

      {(loadingPaths || refreshing) && (
        <View style={S.loadingOverlay} pointerEvents="none">
          <LoadingRing size={64} color="#fff" />
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
        {/* Bismillah card */}
        <View style={S.bismillahCard}>
          <Text style={S.bismillahText}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          <Text style={S.bismillahSub}>In the Name of Allah, the Most Gracious, the Most Merciful</Text>
        </View>

        {/* Map canvas — height computed from layout, not hardcoded */}
        <View style={{ width: MAP_W, height: MAP_H, position: 'relative', overflow: 'hidden' }}>

          {/* SVG background */}
          <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#4FB3E8" />
                <Stop offset={`${skyPct}%`} stopColor="#8ED2F0" />
                <Stop offset={`${Math.min(98, skyPct + 3)}%`} stopColor={colors.mapBg} />
                <Stop offset="100%" stopColor={colors.mapBg} />
              </LinearGradient>
              <Pattern id="grassPattern" patternUnits="userSpaceOnUse" width={sc(140)} height={sc(140)}>
                <SvgImage href={GRASS_SRC} x={0} y={0} width={sc(140)} height={sc(140)} preserveAspectRatio="xMidYMid slice" />
              </Pattern>
              <Pattern id="brickPattern" patternUnits="userSpaceOnUse" width={sc(46)} height={sc(46)}>
                <SvgImage href={BRICK_SRC} x={0} y={0} width={sc(46)} height={sc(46)} preserveAspectRatio="xMidYMid slice" />
              </Pattern>
            </Defs>
            <Rect width={MAP_W} height={MAP_H} fill="url(#bg)" />
            {/* Real sky photo — fills the sky band; the jagged grass edge
                below overlaps its bottom edge so the seam isn't a hard line */}
            <SvgImage
              href={SKY_SRC} x={0} y={0} width={MAP_W} height={SKY_BOUNDARY_Y + sc(24)}
              preserveAspectRatio="xMidYMid slice"
            />

            {/* Distant mountain range on the horizon. Runs from the very top
                of the canvas down well past SKY_BOUNDARY_Y so the grass
                texture (drawn after this, below) overlaps its base with no
                gap of bare sky between them. The jagged grass edge oscillates
                ±sc(9) around SKY_BOUNDARY_Y (see GRASS_EDGE_D below), and
                mountains.png itself has only a thin ground strip baked into
                its own bottom edge — sc(20) left just ~11px of guaranteed
                overlap in the worst case, thin enough to read as a sliver of
                bare sky on some widths/scales. sc(40) gives real headroom. */}
            <SvgImage
              href={MOUNTAINS_SRC} x={0} y={0} width={MAP_W} height={SKY_BOUNDARY_Y + sc(40)}
              preserveAspectRatio="xMidYMid slice"
              opacity={0.9}
            />

            {/* Grass texture wash — a jagged/torn edge (not a flat cut) where
                it meets the sky. Fully opaque — this is the actual ground,
                not a faded overlay. */}
            <Path d={GRASS_EDGE_D} fill="url(#grassPattern)" />

            {/* Road path — brick-textured, carved-in look */}
            <Pathway d={PATH_D} sc={sc} />

            {/* Ground shadows under grounded decorations */}
            {DECORATIONS.trees.map((t, i) => (
              <Ellipse key={`tsh${i}`} cx={t.x + sc(29)} cy={t.y + sc(74)} rx={sc(20)} ry={sc(6)} fill="rgba(0,0,0,0.22)" />
            ))}
            {DECORATIONS.mosques.map((m, i) => (
              <Ellipse key={`msh${i}`} cx={m.x + sc(36)} cy={m.y + sc(82)} rx={sc(30)} ry={sc(7)} fill="rgba(0,0,0,0.22)" />
            ))}
          </Svg>

          {/* Static sky clouds — right below the Bismillah card, marking the
              sky before the road begins */}
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

          {/* Trees — x derived from pathXAt, zone-checked */}
          {DECORATIONS.trees.map((t, i) => (
            <Image
              key={`tree${i}`}
              source={t.src}
              style={{ position: 'absolute', left: t.x, top: t.y, width: sc(58), height: sc(80), opacity: 0.78 + (i % 3) * 0.06 }}
              resizeMode="contain"
            />
          ))}

          {/* Bushes/flower patches — low ground accents, zone-checked beside the road */}
          {DECORATIONS.bushes.map((b, i) => (
            <Image
              key={`bush${i}`}
              source={BUSH_SRC}
              style={{ position: 'absolute', left: b.x, top: b.y, width: sc(84), height: sc(32), opacity: 0.85 }}
              resizeMode="contain"
            />
          ))}

          {/* Mosques */}
          {DECORATIONS.mosques.map((m, i) => (
            <Image
              key={`mosque${i}`}
              source={MOSQUE_SRC}
              style={{ position: 'absolute', left: m.x, top: m.y, width: sc(72), height: sc(88), opacity: 0.82 - i * 0.04 }}
              resizeMode="contain"
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

          {/* Bridge + pond — riverside decoration beside the road, not across it */}
          {DECORATIONS.bridges.map((br, i) => (
            <React.Fragment key={`bridge${i}`}>
              <Image
                source={POND_SRC} resizeMode="contain"
                style={{ position: 'absolute', left: br.x - br.w * 0.15, top: br.y + br.h * 0.35, width: br.w * 1.3, height: br.h * 0.75 }}
              />
              <Image source={BRIDGE_SRC} resizeMode="contain" style={{ position: 'absolute', left: br.x, top: br.y, width: br.w, height: br.h }} />
            </React.Fragment>
          ))}

          {/* Standalone ponds — scattered beside the road, zone-checked like
              everything else (independent of the one pond paired with the bridge above) */}
          {DECORATIONS.ponds.map((p, i) => (
            <Image
              key={`pond${i}`}
              source={POND_SRC}
              style={{ position: 'absolute', left: p.x, top: p.y, width: sc(90), height: sc(48), opacity: 0.9 }}
              resizeMode="contain"
            />
          ))}

          {/* Season-gate signs — huge landmarks, zone-checked beside the
              road like everything else. Tappable while locked to surface a
              Lumo message; the season number is baked into the art itself
              (see SEASON_SIGN_SRCS), so no overlaid text is needed. */}
          {DECORATIONS.seasonGates.map((g, i) => {
            const seasonNum = g.unlocksSeasonIdx + 1;
            return (
              <TouchableOpacity
                key={`gate${i}`}
                style={{ position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h }}
                activeOpacity={0.85}
                onPress={() => void handleGatePress(g.unlocksSeasonIdx)}
              >
                <Image source={SEASON_SIGN_SRCS[seasonNum]} resizeMode="contain" style={{ width: g.w, height: g.h }} />
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
                globalIdx++;
                const idx = globalIdx;
                const pill = AYAH_PILLS[`${section.surahNum}_${nodeIdx}`];
                const ayahFrom = node.startAyah ?? ((node.levelNum ?? 1) - 1) * 2 + 1;
                const ayahTo = node.endAyah ?? Math.min((node.levelNum ?? 1) * 2, section.ayahCount);
                const rangeLabel = ayahFrom === ayahTo ? `Ayah ${ayahFrom}` : `Ayahs ${ayahFrom}–${ayahTo}`;
                return (
                  <React.Fragment key={node.id}>
                    <TouchableOpacity
                      style={{ position: 'absolute', left: node.x, top: node.y }}
                      activeOpacity={node.status === 'locked' ? 1 : 0.85}
                      onPress={() => void handleNodePress(section, node)}
                    >
                      <MapNode
                        status={node.status === 'current' && node.id !== firstActiveNode?.id ? 'available' : node.status}
                        stars={node.stars}
                        pulseAnim={pulseAnim}
                        goldAnim={goldAnim}
                        levelNum={idx}
                        isFetching={node.status === 'pending' && fetchingSurah === section.surahNum}
                        S={S}
                      />
                    </TouchableOpacity>
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

          {/* Ambient parallax cloud layers — 3 depths reacting to scroll */}
          {[PARALLAX_FAR, PARALLAX_MID, PARALLAX_NEAR].map((layer, li) => {
            const translateY = scrollY.interpolate({
              inputRange: [0, MAP_H || 1],
              outputRange: [0, MAP_H * (1 - layer.speed)],
              extrapolate: 'clamp',
            });
            const depthOpacity = scrollY.interpolate({
              inputRange: [0, 500, 1200],
              outputRange: li === 2 ? [0.5, 0.85, 1] : li === 0 ? [1, 0.6, 0.25] : [0.8, 0.8, 0.8],
              extrapolate: 'clamp',
            });
            const depthScale = scrollY.interpolate({
              inputRange: [0, 1200],
              outputRange: li === 2 ? [1, 1.25] : li === 0 ? [1, 0.85] : [1, 1],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View key={`plx${li}`} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: MAP_W, height: MAP_H, transform: [{ translateY }], zIndex: 1 }}>
                {layer.puffs.map((p, i) => (
                  <Animated.Image
                    key={i}
                    source={CLOUD_SRC}
                    resizeMode="contain"
                    blurRadius={layer.blur}
                    style={{
                      position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h,
                      opacity: Animated.multiply(depthOpacity, p.opacity),
                      transform: [{ scale: depthScale }],
                    }}
                  />
                ))}
              </Animated.View>
            );
          })}

          {/* Luma — beside the active node, x derived from node position */}
          {firstActiveNode && (
            <LumaFloat
              style={{ position: 'absolute', left: lumaLeft, top: lumaTop }}
              speech={lumaSpeech}
              floatAnim={floatAnim}
              S={S}
              SB={SB}
            />
          )}

          {/* Season-gate tap message — "finish the season" if not yet
              eligible, or an Unlock confirm button once it is. Confirming
              is the only thing that persists the unlock and loads that
              season's data for the first time (see handleUnlockConfirm). */}
          {gateTapped != null && (() => {
            const g = DECORATIONS.seasonGates.find(sg => sg.unlocksSeasonIdx === gateTapped);
            if (!g) return null;
            const seasonLabel = `Season ${gateTapped}`;
            const checking = checkingGate === gateTapped;
            const eligible = !checking && isSeasonComplete(gateTapped - 1);
            return (
              <View style={{ position: 'absolute', left: g.x + g.w / 2 - sc(70), top: g.y - sc(90), alignItems: 'center' }}>
                <LumaFloat
                  speech={checking ? 'Checking…' : eligible ? `🎉 ${seasonLabel} complete!` : `Finish ${seasonLabel} to unlock this season!`}
                  floatAnim={floatAnim}
                  S={S}
                  SB={SB}
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

          {/* Journey end — start.png banner */}
          <View style={{ position: 'absolute', left: MAP_W / 2 - sc(50), top: MAP_H - sc(130), alignItems: 'center' }}>
            <Image source={START_SRC} style={{ width: sc(100), height: sc(80) }} resizeMode="contain" />
            <Text style={S.endText}>More coming soon…</Text>
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

