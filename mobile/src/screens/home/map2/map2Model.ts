import { ALL_FLAT_LEVELS, type NodeStatus, type Section, type SectionNode } from '../map/mapModel';
import { FIGMA_W } from './map2Theme';

// One continuous map: every level of the Quran (An-Nas at the bottom, climbing
// to Al-Fatihah) as a single scroll. Positions are plain numbers for all
// levels; the screen only builds the bands near the viewport (see bandContent).

export interface Map2NodeData extends SectionNode {
  // Global index, 0 = An-Nas level 1 at the very bottom of the map.
  slot: number;
}
export interface Map2Section extends Section {
  nodes: Map2NodeData[];
}

export const MAP2_SECTIONS: Map2Section[] = (() => {
  const sections: Map2Section[] = [];
  let current: Map2Section | null = null;
  ALL_FLAT_LEVELS.forEach((flat, slot) => {
    if (!current || current.surahNum !== flat.surahNum) {
      current = { surahNum: flat.surahNum, name: flat.name, arabicName: flat.arabicName, ayahCount: flat.ayahCount, nodes: [] };
      sections.push(current);
    }
    current.nodes.push({
      id: flat.level.id,
      x: 0,
      y: 0,
      status: 'locked' as NodeStatus,
      stars: 0,
      levelNum: flat.level.levelNum,
      surahLevelIdx: flat.surahLevelIdx,
      isSpecial: flat.level.isSpecial,
      slot,
    });
  });
  return sections;
})();
export const SLOT_COUNT = ALL_FLAT_LEVELS.length;
// `${surahNum}:${surahLevelIdx}` -> slot
export const SLOT_OF: Record<string, number> = {};
export const SLOT_SURAH = new Int16Array(SLOT_COUNT);
ALL_FLAT_LEVELS.forEach((flat, slot) => {
  SLOT_OF[`${flat.surahNum}:${flat.surahLevelIdx}`] = slot;
  SLOT_SURAH[slot] = flat.surahNum;
});

// ── Figma geometry (440pt frame) ────────────────────────────────────
// Node centre x for 16 consecutive nodes, read off the Figma frame bottom-up.
const X_CYCLE = [225, 276, 287, 286, 241, 201, 171, 196, 241, 274, 292, 284, 214, 169, 144, 169];
const GAP = 90;
// The Figma frame leaves 119pt above the START node (ring + label) instead of ~90.
const GAP_ABOVE_CURRENT = 119;
const NODE_W = 70;
const NODE_FACE_H = 57;
const NODE_LIP = 8;
const DASH_LEN = 22; // 16pt dash + 3pt square cap at each end
const DASH_PERIOD = 32;
const DASH_THICK = 6;
const BOARD_W = 130.443;
const BOARD_H = 91.266;
const LUMO_W = 84;
const LUMO_ASPECT = 569 / 590;
// Band height in Figma points: about 1.7 screens, so 2 or 3 bands cover the view.
const BAND_PT = 1600;

export type DecorKind = 'grassRock' | 'grass' | 'duneA' | 'duneB' | 'dunePills' | 'duneWide';
const DECOR_SIZE: Record<DecorKind, [number, number]> = {
  grassRock: [73, 43.563],
  grass: [34, 19.0665],
  duneA: [162.251, 50.7979],
  duneB: [162.251, 50.1348],
  dunePills: [78.2861, 16.8896],
  duneWide: [213.876, 33.0742],
};
// Decorations from the Figma frame, keyed to the node they sit beside
// (k = slot % 16): frame x of the art's left edge, top relative to that
// node's centre, and width when the frame scaled the art.
const DECOR_CYCLE: { k: number; kind: DecorKind; x: number; dy: number; w?: number; flip?: boolean }[] = [
  { k: 0, kind: 'dunePills', x: 378, dy: -15, flip: true },
  { k: 0, kind: 'duneWide', x: 356, dy: 27 },
  { k: 0, kind: 'grassRock', x: 313, dy: -31, w: 65 },
  { k: 0, kind: 'dunePills', x: -29, dy: -29, flip: true },
  { k: 2, kind: 'grassRock', x: 85, dy: -25, w: 65 },
  { k: 4, kind: 'duneB', x: 57, dy: 24 },
  { k: 5, kind: 'grassRock', x: 263, dy: 3 },
  { k: 7, kind: 'grassRock', x: -49, dy: 28 },
  { k: 8, kind: 'dunePills', x: 299, dy: 22, flip: true },
  { k: 9, kind: 'grassRock', x: 115, dy: -38, w: 65 },
  { k: 10, kind: 'duneA', x: -50, dy: -1 },
  { k: 11, kind: 'duneA', x: 223, dy: 24 },
  { k: 11, kind: 'grassRock', x: 343, dy: 37, w: 65 },
  { k: 12, kind: 'dunePills', x: 382, dy: 47, flip: true },
  { k: 12, kind: 'grassRock', x: 18, dy: -13 },
  { k: 14, kind: 'duneA', x: 258, dy: 27 },
  { k: 15, kind: 'dunePills', x: 54, dy: 29, flip: true },
  { k: 15, kind: 'grass', x: 49, dy: -25 },
];

interface Box { x: number; y: number; w: number; h: number }
export interface Dash { x: number; y: number; angle: number }
export interface Decor extends Box { key: string; kind: DecorKind; flip: boolean }
export interface Board {
  surahNum: number; name: string; firstSlot: number;
  // Centre of the rotated board.
  cx: number; cy: number;
  side: 'left' | 'right';
}
export interface Map2Layout {
  s: number;
  mapW: number;
  contentH: number;
  nodeW: number;
  nodeFaceH: number;
  cx: Float64Array;
  cy: Float64Array;
  dashLen: number;
  dashThick: number;
  boardW: number;
  boardH: number;
  boards: Board[];
  lumo: Box;
  bandH: number;
  bandCount: number;
  baseY: number;
}

interface LayoutInput {
  width: number;
  headerH: number;
  bottomBarH: number;
  activeSlot: number | null;
}

const cycleX = (i: number) => X_CYCLE[((i % 16) + 16) % 16];
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function buildMap2Layout({ width, headerH, bottomBarH, activeSlot }: LayoutInput): Map2Layout {
  const s = width / FIGMA_W;
  const n = SLOT_COUNT;
  const cx = new Float64Array(n);
  const cy = new Float64Array(n);
  // Room under the first node for Lumo and its star row, plus the bottom bar.
  const bottomPad = bottomBarH + 90 * s;
  const topPad = headerH + 80 * s;
  let rel = 0;
  const rels = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    rel -= (i - 1 === activeSlot ? GAP_ABOVE_CURRENT : GAP) * s;
    rels[i] = rel;
  }
  const contentH = topPad - rel + bottomPad;
  const baseY = contentH - bottomPad;
  for (let i = 0; i < n; i++) {
    cx[i] = cycleX(i) * s;
    cy[i] = baseY + rels[i];
  }

  const nodeBox = (i: number): Box => ({
    x: cx[i] - (NODE_W / 2 + 6) * s, y: cy[i] - (NODE_FACE_H / 2 + 6) * s,
    w: (NODE_W + 12) * s, h: (NODE_FACE_H + NODE_LIP + 40) * s,
  });

  // Room a node's tag takes above it (about 100 x 30pt), `lift` points above the node top.
  const labelBox = (i: number, lift = 4): Box => ({
    x: cx[i] - 52 * s, y: cy[i] - (NODE_FACE_H / 2 + lift + 30) * s, w: 104 * s, h: 30 * s,
  });

  // Lumo stands on the sand left of the very first level.
  const lumoW = LUMO_W * s;
  const lumoH = lumoW * LUMO_ASPECT;
  const lumo: Box = {
    x: cx[0] - (NODE_W / 2 + 10) * s - lumoW,
    y: cy[0] + (NODE_FACE_H / 2 + NODE_LIP) * s - lumoH,
    w: lumoW,
    h: lumoH,
  };

  const boardW = BOARD_W * s;
  const boardH = BOARD_H * s;
  const half = boardW / 2 + 6 * s;
  const offset = (51 + BOARD_W / 2) * s;
  const boards: Board[] = [];
  const boardBoxes: Box[] = [];
  for (const sec of MAP2_SECTIONS) {
    const f = sec.nodes[0].slot;
    const near: Box[] = [];
    for (let j = Math.max(0, f - 3); j <= Math.min(n - 1, f + 3); j++) near.push(nodeBox(j));
    if (f < 4) near.push(lumo);
    // The "JUMP HERE?" tag above this surah's first level, and START + ring
    // when the active level is close by.
    near.push(labelBox(f));
    if (activeSlot != null && Math.abs(activeSlot - f) <= 3) {
      near.push(labelBox(activeSlot, 15), { x: cx[activeSlot] - 49 * s, y: cy[activeSlot] - 41.5 * s, w: 98 * s, h: 98 * s });
    }
    const recent = boardBoxes.slice(-2);
    // Figma spot first (opposite the node's lean, slightly above it), then the
    // other side and small vertical nudges, until it clears nodes and boards.
    const preferred: 'left' | 'right' = cycleX(f) > FIGMA_W / 2 ? 'left' : 'right';
    const other: 'left' | 'right' = preferred === 'left' ? 'right' : 'left';
    const spots = [preferred, other].flatMap(side => [
      { side, x: side === 'right' ? cx[f] + offset : cx[f] - offset },
      { side, x: side === 'right' ? width - half : half },
    ]);
    let best: { side: 'left' | 'right'; cx: number; cy: number; box: Box; hits: number } | null = null;
    search: for (const dy of [-18, 0, -36, 14, -54, -80, -105, -130]) {
      for (const spot of spots) {
        const bx = Math.min(width - half, Math.max(half, spot.x));
        const by = cy[f] + dy * s;
        const box = { x: bx - boardW / 2, y: by - boardH / 2, w: boardW, h: boardH };
        const hits = near.filter(b => overlaps(box, b)).length + recent.filter(b => overlaps(box, b)).length;
        if (!best || hits < best.hits) best = { side: spot.side, cx: bx, cy: by, box, hits };
        if (hits === 0) break search;
      }
    }
    if (!best) continue;
    boards.push({ surahNum: sec.surahNum, name: sec.name, firstSlot: f, cx: best.cx, cy: best.cy, side: best.side });
    boardBoxes.push(best.box);
  }

  const bandH = BAND_PT * s;
  return {
    s, mapW: width, contentH, nodeW: NODE_W * s, nodeFaceH: NODE_FACE_H * s, cx, cy,
    dashLen: DASH_LEN * s, dashThick: DASH_THICK * s, boardW, boardH, boards, lumo,
    bandH, bandCount: Math.ceil(contentH / bandH), baseY,
  };
}

// ── Per-band content, built only for bands the list actually renders ──

export interface BandContent {
  top: number;
  height: number;
  // Slots whose node centre falls in this band, inclusive range (empty when from > to).
  from: number;
  to: number;
  dashes: Dash[];
  decor: Decor[];
  boards: Board[];
  hasLumo: boolean;
}

// Index of the first slot whose centre is at or above y (cy falls as slot grows).
function firstSlotAtOrAbove(L: Map2Layout, y: number): number {
  let lo = 0, hi = SLOT_COUNT - 1, r = SLOT_COUNT;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (L.cy[m] <= y) { r = m; hi = m - 1; } else lo = m + 1;
  }
  return r;
}

function pathPoint(L: Map2Layout, i: number): { x: number; y: number } {
  if (i >= 0 && i < SLOT_COUNT) return { x: L.cx[i], y: L.cy[i] };
  if (i < 0) return { x: cycleX(i) * L.s, y: L.baseY - i * GAP * L.s };
  return { x: cycleX(i) * L.s, y: L.cy[SLOT_COUNT - 1] - (i - SLOT_COUNT + 1) * GAP * L.s };
}

// Dashes for the curve from node i to node i+1. Each segment starts half a
// dash after its node (under the node, so the seam never shows), which keeps
// a segment's dashes identical whichever band builds them.
function segmentDashes(L: Map2Layout, i: number): Dash[] {
  const p0 = pathPoint(L, i - 1), p1 = pathPoint(L, i), p2 = pathPoint(L, i + 1), p3 = pathPoint(L, i + 2);
  const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
  const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
  const steps = 24;
  let prev = p1;
  let walked = 0;
  let next = (DASH_LEN * L.s) / 2;
  const period = DASH_PERIOD * L.s;
  const out: Dash[] = [];
  for (let j = 1; j <= steps; j++) {
    const t = j / steps, u = 1 - t;
    const cur = {
      x: u * u * u * p1.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p2.x,
      y: u * u * u * p1.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p2.y,
    };
    const seg = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    while (seg > 0 && walked + seg >= next) {
      const f = (next - walked) / seg;
      out.push({ x: prev.x + (cur.x - prev.x) * f, y: prev.y + (cur.y - prev.y) * f, angle: (Math.atan2(cur.y - prev.y, cur.x - prev.x) * 180) / Math.PI });
      next += period;
    }
    walked += seg;
    prev = cur;
  }
  return out;
}

// Slots whose node centre falls in the band, as [from, to] (empty when from > to).
export function bandSlotRange(L: Map2Layout, band: number): [number, number] {
  const top = band * L.bandH;
  const bottom = Math.min(L.contentH, top + L.bandH);
  // cy falls as slot grows: the band's lowest slot is the first one above its bottom edge.
  return [firstSlotAtOrAbove(L, bottom - 0.001), firstSlotAtOrAbove(L, top - 0.001) - 1];
}

export function bandContent(L: Map2Layout, band: number): BandContent {
  const top = band * L.bandH;
  const height = Math.min(L.bandH, L.contentH - top);
  const bottom = top + height;
  const [from, to] = bandSlotRange(L, band);

  const dashes: Dash[] = [];
  // The path starts at the very first level; nothing runs below it.
  const segFrom = from === 0 ? 0 : from - 1;
  const segTo = to === SLOT_COUNT - 1 ? SLOT_COUNT + 8 : to + 1;
  for (let i = segFrom; i <= segTo; i++) {
    for (const d of segmentDashes(L, i)) if (d.y >= top && d.y < bottom) dashes.push(d);
  }

  const s = L.s;
  const nodeBox = (i: number): Box => ({
    x: L.cx[i] - (NODE_W / 2 + 6) * s, y: L.cy[i] - (NODE_FACE_H / 2 + 6) * s,
    w: (NODE_W + 12) * s, h: (NODE_FACE_H + NODE_LIP + 40) * s,
  });
  const nearBoards = L.boards.filter(b => b.cy > top - 400 * s && b.cy < bottom + 400 * s);
  const boardBoxes = nearBoards.map(b => ({ x: b.cx - L.boardW / 2, y: b.cy - L.boardH / 2, w: L.boardW, h: L.boardH }));
  const decor: Decor[] = [];
  for (let i = from; i <= to; i++) {
    const k = i % 16;
    for (const d of DECOR_CYCLE) {
      if (d.k !== k) continue;
      const [nw, nh] = DECOR_SIZE[d.kind];
      const w = (d.w ?? nw) * s;
      const box = { x: d.x * s, y: L.cy[i] + d.dy * s, w, h: w * (nh / nw) };
      if (boardBoxes.some(b => overlaps(box, b))) continue;
      if (i < 4 && overlaps(box, L.lumo)) continue;
      if (d.kind === 'grassRock' || d.kind === 'grass') {
        let hit = false;
        for (let j = Math.max(0, i - 3); j <= Math.min(SLOT_COUNT - 1, i + 3) && !hit; j++) hit = overlaps(box, nodeBox(j));
        if (hit) continue;
      }
      decor.push({ key: `${i}:${d.kind}:${d.x}`, kind: d.kind, ...box, flip: !!d.flip });
    }
  }

  const lumoMidY = L.lumo.y + L.lumo.h / 2;
  return {
    top,
    height,
    from,
    to,
    dashes,
    decor,
    boards: L.boards.filter(b => b.cy >= top && b.cy < bottom),
    hasLumo: lumoMidY >= top && lumoMidY < bottom,
  };
}

export function bandOfY(L: Map2Layout, y: number): number {
  return Math.max(0, Math.min(L.bandCount - 1, Math.floor(y / L.bandH)));
}
