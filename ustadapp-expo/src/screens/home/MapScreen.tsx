import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Image,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Ellipse, Path, Circle, G } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { lessonsApi } from '../../api';
import { useArabicFont } from '../../utils/arabicFont';
import { colors } from '../../theme/colors';
import type { SurahPath } from '../../types/api';
import type { MapNavProp } from '../../navigation/types';

const { width: SCREEN_W } = Dimensions.get('window');
const MAP_W    = SCREEN_W;
const NODE_SIZE = 56;

// ── Layout parameters ─────────────────────────────────────────────
// Tune these numbers; never touch node pixel coords again.
const NODE_GAP      = 170;  // px between consecutive nodes
const SECTION_EXTRA  = 90;  // additional px at each section boundary
const TOP_MARGIN     = 145;
const FOOTER_PAD     = 200;
const PATH_MARGIN    =   6;  // min gap between path edge and a decoration

// ── Asset refs (static, so Metro can bundle them) ─────────────────
const TREE_SRCS = [
  require('../../../assets/tree1.png'),
  require('../../../assets/tree2.png'),
] as const;
const MOSQUE_SRC   = require('../../../assets/mosque.png');
const BIRDS_SRC    = require('../../../assets/birds.png');
const CLOUD_SRC    = require('../../../assets/clouds.png');
const LANTERN_SRC  = require('../../../assets/map4.png');
const START_SRC    = require('../../../assets/start.png');
const LOTTIE_SRCS = [
  require('../../../assets/animations/map1.json'),
  require('../../../assets/animations/map2.json'),
  require('../../../assets/animations/map3.json'),
] as const;

// ── Types ─────────────────────────────────────────────────────────
interface Props { navigation: MapNavProp }
type NodeStatus = 'completed' | 'current' | 'available' | 'locked';

interface SectionNode {
  id: string; x: number; y: number;
  status: NodeStatus; stars: number; levelNum: number;
  startAyah?: number; endAyah?: number;
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
  xFractions: number[];  // x position of each level's node as fraction of MAP_W
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

// ── ONE layout function: converts section defs → pixel positions ───
function computeLayout(defs: SectionDef[], mapW: number): { sections: Section[]; mapHeight: number } {
  let y = TOP_MARGIN;
  const sections: Section[] = defs.map(def => {
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
  const lastSec = sections[sections.length - 1];
  const mapHeight = lastSec.nodes[lastSec.nodes.length - 1].y + NODE_SIZE + FOOTER_PAD;
  return { sections, mapHeight };
}

// ── Computed layout — single source of truth for ALL positions ─────
const { sections: BASE_SECTIONS, mapHeight: MAP_H } = computeLayout(SECTIONS_DEF, MAP_W);
const ALL_NODES = BASE_SECTIONS.flatMap(s => s.nodes);

// ── Path string through all node centres ──────────────────────────
function buildPath(nodes: SectionNode[]): string {
  const pts = nodes.map(n => ({ x: n.x + NODE_SIZE / 2, y: n.y + NODE_SIZE / 2 }));
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    const midY = (p.y + c.y) / 2;
    d += ` C ${p.x} ${midY}, ${c.x} ${midY}, ${c.x} ${c.y}`;
  }
  return d;
}
const PATH_D = buildPath(ALL_NODES);

// ── Path x interpolation — the spine all decorations anchor to ────
// Returns the path's x-centre at any y by linearly interpolating between
// adjacent node centres. All decoration x positions are derived from this.
function pathXAt(y: number): number {
  const pts = ALL_NODES.map(n => ({ x: n.x + NODE_SIZE / 2, y: n.y + NODE_SIZE / 2 }));
  if (y <= pts[0].y) return pts[0].x;
  if (y >= pts[pts.length - 1].y) return pts[pts.length - 1].x;
  for (let i = 0; i < pts.length - 1; i++) {
    if (y >= pts[i].y && y < pts[i + 1].y) {
      const t = (y - pts[i].y) / (pts[i + 1].y - pts[i].y);
      return Math.round(pts[i].x + t * (pts[i + 1].x - pts[i].x));
    }
  }
  return Math.round(MAP_W / 2);
}

// Convert (pathX, side, decorationWidth) → absolute left edge for the decoration.
// Left-side items sit just to the left of the path; right-side items sit just to the right.
function decorLeft(pathX: number, side: 'left' | 'right', decorW: number, margin = PATH_MARGIN): number {
  if (side === 'left') return Math.max(0, pathX - decorW - margin);
  return Math.min(MAP_W - decorW, pathX + NODE_SIZE + margin);
}

// ── Shared zone registry ───────────────────────────────────────────
// Prevents two decoration types from occupying the same (y-band, side) slot.
// All decoration types are placed through this in priority order.
interface Zone { y: number; side: 'left' | 'right'; height: number }

function isBlocked(y: number, side: 'left' | 'right', h: number, zones: Zone[], gap = 8): boolean {
  return zones.some(z => z.side === side && Math.abs(z.y - y) < (z.height + h) / 2 + gap);
}

function pickEvenly<T>(arr: T[], count: number): T[] {
  if (arr.length <= count) return arr;
  return Array.from({ length: count }, (_, i) =>
    arr[Math.round(i * (arr.length - 1) / Math.max(count - 1, 1))],
  );
}

// ── Build all decoration positions from the computed layout ────────
// Priority: lottie > mosque > trees > birds
// Each type checks `placed[]` before claiming a slot — no two types share a zone.
interface DecorLottie   { y: number; x: number; source: (typeof LOTTIE_SRCS)[number] }
interface DecorMosque   { y: number; x: number }
interface DecorTree     { y: number; x: number; src: (typeof TREE_SRCS)[number] }
interface DecorBird     { y: number; x: number }
interface DecorLantern  { y: number; x: number }

function buildDecorations(): { lotties: DecorLottie[]; mosques: DecorMosque[]; trees: DecorTree[]; birds: DecorBird[]; lanterns: DecorLantern[] } {
  const placed: Zone[] = [];

  // Midpoint y between each consecutive node pair
  const nodeMidYs = ALL_NODES.slice(0, -1).map((n, i) =>
    Math.round((n.y + ALL_NODES[i + 1].y) / 2),
  );

  // Midpoint y of each section boundary gap
  const secMidYs = BASE_SECTIONS.slice(0, -1).map((sec, i) => {
    const lastY  = sec.nodes[sec.nodes.length - 1].y + NODE_SIZE / 2;
    const firstY = BASE_SECTIONS[i + 1].nodes[0].y + NODE_SIZE / 2;
    return Math.round((lastY + firstY) / 2);
  });

  // 1. Lottie — pick 3 evenly from section boundary midpoints (highest priority)
  const lotties: DecorLottie[] = [];
  const lottieH = 82, lottieW = 110;
  pickEvenly(secMidYs, Math.min(3, secMidYs.length)).forEach((midY, i) => {
    const y    = midY - lottieH / 2;
    const side: 'left' | 'right' = i % 2 === 0 ? 'right' : 'left';
    if (!isBlocked(y, side, lottieH, placed)) {
      placed.push({ y, side, height: lottieH });
      lotties.push({ y, x: decorLeft(pathXAt(midY), side, lottieW), source: LOTTIE_SRCS[i % 3] });
    }
  });

  // 2. Mosques — one per section boundary, preferring the opposite side from the lottie
  const mosques: DecorMosque[] = [];
  const mosqueH = 88, mosqueW = 72;
  secMidYs.forEach((midY, i) => {
    const y = midY - mosqueH / 2;
    const prefer: 'left' | 'right'   = i % 2 === 0 ? 'left' : 'right';
    const fallback: 'left' | 'right' = prefer === 'left' ? 'right' : 'left';
    for (const side of [prefer, fallback] as const) {
      if (!isBlocked(y, side, mosqueH, placed)) {
        placed.push({ y, side, height: mosqueH });
        mosques.push({ y, x: decorLeft(pathXAt(midY), side, mosqueW) });
        break;
      }
    }
  });

  // 3. Trees — one left + one right per node gap where possible
  const trees: DecorTree[] = [];
  const treeH = 80, treeW = 58;
  nodeMidYs.forEach((midY, i) => {
    const yL = midY - treeH / 2;
    if (!isBlocked(yL, 'left', treeH, placed, 4)) {
      placed.push({ y: yL, side: 'left', height: treeH });
      trees.push({ y: yL, x: decorLeft(pathXAt(midY), 'left', treeW, 4), src: TREE_SRCS[i % 2] });
    }
    const yR = midY - treeH / 2 + 22;  // slight vertical offset so pairs aren't mirrored
    if (!isBlocked(yR, 'right', treeH, placed, 4)) {
      placed.push({ y: yR, side: 'right', height: treeH });
      trees.push({ y: yR, x: decorLeft(pathXAt(midY + 22), 'right', treeW, 4), src: TREE_SRCS[(i + 1) % 2] });
    }
  });

  // 4. Birds — one per section boundary, alternating sides, no zone check (they float freely)
  const birds: DecorBird[] = [];
  const birdH = 48, birdW = 96;
  secMidYs.forEach((midY, i) => {
    const y = midY - birdH / 2 - 20; // slightly above other decor so they feel airborne
    const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
    birds.push({ y, x: decorLeft(pathXAt(midY), side, birdW, 8) });
  });

  // 5. Lanterns (map4.png) — one per section boundary, opposite side from bird
  const lanterns: DecorLantern[] = [];
  const lanternH = 60, lanternW = 36;
  secMidYs.forEach((midY, i) => {
    const y = midY - lanternH / 2 + 10; // slightly below midpoint
    const side: 'left' | 'right' = i % 2 === 0 ? 'right' : 'left'; // opposite side from bird
    lanterns.push({ y, x: decorLeft(pathXAt(midY), side, lanternW, 2) });
  });

  return { lotties, mosques, trees, birds, lanterns };
}

const DECORATIONS = buildDecorations();

// Two cloud strips only at the very top of the map — not scattered lower.
interface CloudDecor { y: number; x: number; w: number; h: number; opacity: number }
function buildClouds(): CloudDecor[] {
  // y: 0 keeps the full cloud image within the visible scrollable area —
  // y: -10 was clipping the top edge of both images.
  return [
    { y: 0, x: 0,            w: MAP_W * 0.55, h: 50, opacity: 0.85 },
    { y: 0, x: MAP_W * 0.45, w: MAP_W * 0.55, h: 46, opacity: 0.75 },
  ];
}
const CLOUDS = buildClouds();

// ── Status helper ─────────────────────────────────────────────────
function stageToNodeStatus(s: string): NodeStatus {
  if (s === 'completed') return 'completed';
  if (s === 'in_progress') return 'current';
  if (s === 'available') return 'available';
  return 'locked';
}

// ── Surah name label ──────────────────────────────────────────────
function SurahLabel({ arabicName, name, isLeft }: { arabicName: string; name: string; isLeft: boolean }) {
  const arabicFont = useArabicFont();
  return (
    <View style={{ alignItems: isLeft ? 'flex-start' : 'flex-end' }}>
      <Text style={[SL.arabic, { fontFamily: arabicFont.fontFamily, fontSize: Math.round(26 * arabicFont.scale) }]}>{arabicName}</Text>
      <Text style={SL.english}>{name}</Text>
    </View>
  );
}
const SL = StyleSheet.create({
  arabic: {
    fontFamily: 'NotoNaskhArabic_700Bold', fontSize: 26, color: '#E0BC4E',
    textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  english: {
    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: '#FFE87A', letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.65)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
    marginTop: 2,
  },
});

// ── Speech bubble — pure CSS, sizes to text content ───────────────
function SpeechBubble({ text }: { text: string }) {
  return (
    <View style={SB.wrapper}>
      <View style={SB.bubble}>
        <Text style={SB.text}>{text}</Text>
      </View>
      <View style={SB.tail} />
    </View>
  );
}
const SB = StyleSheet.create({
  wrapper: { alignItems: 'center', marginBottom: 2 },
  bubble: {
    backgroundColor: 'white', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, maxWidth: 160,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4,
  },
  text: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: '#374151', textAlign: 'center', lineHeight: 14 },
  tail: {
    width: 0, height: 0,
    borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'white',
  },
});

// ── Map node ──────────────────────────────────────────────────────
function MapNode({ status, stars, pulseAnim, goldAnim, levelNum, ayahFrom, ayahTo }: {
  status: NodeStatus; stars: number;
  pulseAnim: Animated.Value; goldAnim: Animated.Value;
  levelNum: number; ayahFrom: number; ayahTo: number;
}) {
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const goldScale  = goldAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const rangeLabel = ayahFrom === ayahTo ? `Ayah ${ayahFrom}` : `Ayahs ${ayahFrom}–${ayahTo}`;

  if (status === 'completed') return (
    <View style={S.nodeWrapper}>
      <Animated.View style={[S.node, S.nodeCompleted, { transform: [{ scale: goldScale }] }]}>
        <Text style={S.nodeNumber}>{levelNum}</Text>
        {stars > 0 && <View style={S.starsBadge}><Text style={S.starsText}>{'★'.repeat(stars)}</Text></View>}
      </Animated.View>
      <Text style={S.rangeLabel}>{rangeLabel}</Text>
    </View>
  );
  if (status === 'current') return (
    <View style={S.nodeWrapper}>
      <Animated.View style={[S.node, S.nodeCurrent, { transform: [{ scale: pulseScale }] }]}>
        <Animated.View style={[S.pulseRing, {
          transform: [{ scale: pulseScale }],
          opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
        }]} />
        <Text style={S.nodeNumber}>{levelNum}</Text>
      </Animated.View>
      <Text style={S.rangeLabel}>{rangeLabel}</Text>
    </View>
  );
  if (status === 'available') return (
    <View style={S.nodeWrapper}>
      <View style={[S.node, S.nodeGrey]}>
        <Text style={S.nodeNumber}>{levelNum}</Text>
      </View>
      <Text style={S.rangeLabel}>{rangeLabel}</Text>
    </View>
  );
  return (
    <View style={S.nodeWrapper}>
      <View style={[S.node, S.nodeGrey, { opacity: 0.55 }]}>
        <Text style={[S.nodeNumber, { opacity: 0.6 }]}>{levelNum}</Text>
      </View>
      <Text style={[S.rangeLabel, { color: 'rgba(255,255,255,0.35)' }]}>{rangeLabel}</Text>
    </View>
  );
}

// ── Luma mascot ───────────────────────────────────────────────────
function LumaFloat({ style, speech, floatAnim }: { style?: object; speech?: string; floatAnim: Animated.Value }) {
  const ty = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  return (
    <View style={[{ alignItems: 'center' }, style]}>
      {speech && <SpeechBubble text={speech} />}
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
  const { learning } = useAuthStore();
  const [paths, setPaths]          = useState<Record<number, SurahPath>>({});
  const [loadingPaths, setLoading] = useState(true);

  useEffect(() => {
    const nums = SECTIONS_DEF.map(d => d.surahNum);
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.allSettled(nums.map(n => lessonsApi.surahPath(n).then(p => ({ n, p }))));
        if (cancelled) return;
        const map: Record<number, SurahPath> = {};
        for (const r of results) if (r.status === 'fulfilled') map[r.value.n] = r.value.p;
        setPaths(map);
      } catch { /* offline */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Enrich base layout with live backend statuses and real ayah ranges
  const enrichedSections = BASE_SECTIONS.map(section => {
    const path = paths[section.surahNum];
    if (!path) return section;
    const groups = Array.isArray(path.groups) ? path.groups : [];
    return {
      ...section,
      nodes: section.nodes.map(node => {
        const group = groups.find(g => g.lesson_group_id === node.id);
        if (!group) return node;
        return { ...node, status: stageToNodeStatus(group.status), stars: group.stars ?? 0, startAyah: group.start_ayah, endAyah: group.end_ayah };
      }),
    };
  });

  const allEnrichedNodes = enrichedSections.flatMap(s => s.nodes);
  const firstActiveNode  = allEnrichedNodes.find(n => n.status === 'current' || n.status === 'available');

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const goldAnim  = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

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

  // Luma: beside the first active node, x derived from node position
  const lumaLeft = firstActiveNode
    ? (firstActiveNode.x > MAP_W / 2
        ? Math.max(0, firstActiveNode.x - 112)
        : firstActiveNode.x + NODE_SIZE + 6)
    : 4;
  const lumaTop   = firstActiveNode ? firstActiveNode.y - 36 : 80;
  const lumaSpeech = firstActiveNode?.status === 'current'
    ? "Ready for today's lesson? 💪"
    : 'Begin here! ✨';

  return (
    <View style={S.container}>
      {/* HUD */}
      <View style={[S.hud, { paddingTop: insets.top + 4 }]}>
        <View style={S.hudRow}>
          <View style={S.hudPill}><Text>❤️</Text><Text style={S.hudVal}>{learning?.hearts_remaining ?? 5}</Text></View>
          <View style={S.hudPill}><Text>🔥</Text><Text style={[S.hudVal, { color: '#EA580C' }]}>{learning?.current_streak ?? 0}</Text></View>
          <View style={S.hudPill}><Text>⚡</Text><Text style={[S.hudVal, { color: '#2A7D4F' }]}>{learning?.xp_total ?? 0}</Text></View>
        </View>
      </View>

      {loadingPaths && (
        <View style={S.loadingOverlay} pointerEvents="none">
          <LottieView source={require('../../../assets/animations/loading.json')} autoPlay loop style={{ width: 130, height: 130 }} />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Quest banner */}
        <TouchableOpacity style={S.questBanner} onPress={() => navigation.navigate('DailyQuest')} activeOpacity={0.9}>
          <Text style={{ fontSize: 15 }}>⭐</Text>
          <Text style={S.questLabel}>Daily Quests</Text>
          <View style={S.questBadge}><Text style={S.questBadgeText}>2 / 3 Done</Text></View>
          <Text style={{ fontSize: 16, color: '#5A3A00' }}>›</Text>
        </TouchableOpacity>

        {/* Bismillah card */}
        <View style={S.bismillahCard}>
          <Text style={S.bismillahText}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          <Text style={S.bismillahSub}>In the Name of Allah, the Most Gracious, the Most Merciful</Text>
        </View>

        {/* Map canvas — height computed from layout, not hardcoded */}
        <View style={{ width: MAP_W, height: MAP_H, position: 'relative' }}>

          {/* SVG background */}
          <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 393 ${MAP_H}`} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%"   stopColor="#7EC8E3" />
                <Stop offset="8%"   stopColor="#9EDBA8" />
                <Stop offset="30%"  stopColor="#5AB06A" />
                <Stop offset="65%"  stopColor="#4A9A58" />
                <Stop offset="100%" stopColor="#3A8048" />
              </LinearGradient>
              <LinearGradient id="pathGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%"   stopColor="#B8903A" />
                <Stop offset="40%"  stopColor="#E8C870" />
                <Stop offset="60%"  stopColor="#E8C870" />
                <Stop offset="100%" stopColor="#B8903A" />
              </LinearGradient>
            </Defs>
            <Rect width="393" height={MAP_H} fill="url(#bg)" />

            {/* Stars */}
            {([[55,55],[180,40],[310,60],[130,48],[260,35]] as [number,number][]).map(([cx,cy],i) => (
              <Circle key={`st${i}`} cx={cx} cy={cy} r={1.5} fill="white" opacity={0.6} />
            ))}

            {/* River — proportional to MAP_H */}
            <Path
              d={`M362 ${TOP_MARGIN} Q378 ${MAP_H*0.25} 355 ${MAP_H*0.42} Q340 ${MAP_H*0.55} 368 ${MAP_H*0.68} Q382 ${MAP_H*0.80} 360 ${MAP_H}`}
              stroke="#6BC8E8" strokeWidth="18" fill="none" opacity="0.32" strokeLinecap="round"
            />
            <Path
              d={`M362 ${TOP_MARGIN} Q378 ${MAP_H*0.25} 355 ${MAP_H*0.42} Q340 ${MAP_H*0.55} 368 ${MAP_H*0.68} Q382 ${MAP_H*0.80} 360 ${MAP_H}`}
              stroke="#A8E4F8" strokeWidth="8"  fill="none" opacity="0.28" strokeLinecap="round"
            />

            {/* Road path */}
            <Path d={PATH_D} stroke="rgba(232,200,112,0.09)" strokeWidth="62" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={PATH_D} stroke="rgba(232,200,112,0.15)" strokeWidth="40" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={PATH_D} stroke="rgba(80,50,10,0.35)"    strokeWidth="24" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={PATH_D} stroke="url(#pathGrad)"          strokeWidth="16" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={PATH_D} stroke="rgba(255,248,200,0.55)"  strokeWidth="6"  fill="none" strokeLinecap="round" strokeLinejoin="round" />

            {/* Flowers: flanking the path at each node gap midpoint */}
            {ALL_NODES.slice(0, -1).map((n, i) => {
              const midY = Math.round((n.y + ALL_NODES[i + 1].y) / 2);
              const px   = pathXAt(midY);
              return (
                <G key={`fl${i}`}>
                  <Circle cx={Math.max(8, px - 40)} cy={midY}      r={4} fill={i%3===0?'#FF6B8A':i%3===1?'#FFD700':'#FF9F47'} opacity="0.70" />
                  <Circle cx={Math.min(385, px + 50)} cy={midY + 14} r={3} fill={i%3===0?'#FFD700':'#FF6B8A'} opacity="0.60" />
                </G>
              );
            })}

            {/* Cloud wisps at section boundary midpoints */}
            {BASE_SECTIONS.slice(0, -1).map((sec, i) => {
              const lastY  = sec.nodes[sec.nodes.length - 1].y + NODE_SIZE / 2;
              const firstY = BASE_SECTIONS[i + 1].nodes[0].y + NODE_SIZE / 2;
              const midY   = (lastY + firstY) / 2;
              const px     = pathXAt(midY);
              return (
                <Ellipse
                  key={`wisp${i}`}
                  cx={i % 2 === 0 ? Math.max(42, px - 80) : Math.min(351, px + 80)}
                  cy={midY}
                  rx={42} ry={14}
                  fill="white" opacity={0.15 - i * 0.01}
                />
              );
            })}
          </Svg>

          {/* Multiple small clouds scattered across the map */}
          {CLOUDS.map((c, i) => (
            <Image
              key={`cloud${i}`}
              source={CLOUD_SRC}
              style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h, opacity: c.opacity }}
              resizeMode="cover"
            />
          ))}

          {/* Trees — x derived from pathXAt, zone-checked */}
          {DECORATIONS.trees.map((t, i) => (
            <Image
              key={`tree${i}`}
              source={t.src}
              style={{ position: 'absolute', left: t.x, top: t.y, width: 58, height: 80, opacity: 0.78 + (i % 3) * 0.06 }}
              resizeMode="contain"
            />
          ))}

          {/* Mosques — x derived from pathXAt, zone-checked (never overlaps Lottie) */}
          {DECORATIONS.mosques.map((m, i) => (
            <Image
              key={`mosque${i}`}
              source={MOSQUE_SRC}
              style={{ position: 'absolute', left: m.x, top: m.y, width: 72, height: 88, opacity: 0.82 - i * 0.04 }}
              resizeMode="contain"
            />
          ))}

          {/* Birds — x derived from pathXAt, clearly visible near road */}
          {DECORATIONS.birds.map((b, i) => (
            <Image
              key={`bird${i}`}
              source={BIRDS_SRC}
              style={{ position: 'absolute', left: b.x, top: b.y, width: 160, height: 80, opacity: 1.0 }}
              resizeMode="contain"
            />
          ))}

          {/* Lanterns (map4.png) — one per section boundary */}
          {DECORATIONS.lanterns.map((l, i) => (
            <Image
              key={`lantern${i}`}
              source={LANTERN_SRC}
              style={{ position: 'absolute', left: l.x, top: l.y, width: 52, height: 86, opacity: 0.90 - i * 0.04 }}
              resizeMode="contain"
            />
          ))}

          {/* Surah labels — y from firstNode.y, x from section side */}
          {enrichedSections.map((section, sIdx) => {
            const isLeft    = sIdx % 2 === 0;
            const firstNode = section.nodes[0];
            return (
              <View
                key={`label-${section.surahNum}`}
                style={{
                  position: 'absolute',
                  top:   firstNode.y + NODE_SIZE / 2 - 20,
                  left:  isLeft ? 4 : undefined,
                  right: isLeft ? undefined : 4,
                  zIndex: 5,
                }}
              >
                <SurahLabel arabicName={section.arabicName} name={section.name} isLeft={isLeft} />
              </View>
            );
          })}

          {/* Lottie animations — x derived from pathXAt, zone-checked */}
          {DECORATIONS.lotties.map((lt, i) => (
            <LottieView
              key={`lottie${i}`}
              source={lt.source}
              autoPlay loop
              style={{ position: 'absolute', left: lt.x, top: lt.y, width: 110, height: 82 }}
            />
          ))}

          {/* Lesson nodes — globally numbered across all surahs */}
          {(() => {
            let globalIdx = 0;
            return enrichedSections.map(section =>
              section.nodes.map(node => {
                globalIdx++;
                const idx = globalIdx;
                return (
                  <TouchableOpacity
                    key={node.id}
                    style={{ position: 'absolute', left: node.x, top: node.y }}
                    activeOpacity={node.status === 'locked' ? 1 : 0.85}
                    onPress={() => {
                      if (node.status === 'locked') return;
                      navigation.navigate('LessonStart', { groupId: node.id, surahName: section.name, surahNumber: section.surahNum });
                    }}
                  >
                    <MapNode
                      status={node.status}
                      stars={node.stars}
                      pulseAnim={pulseAnim}
                      goldAnim={goldAnim}
                      levelNum={idx}
                      ayahFrom={node.startAyah ?? ((node.levelNum ?? 1) - 1) * 3 + 1}
                      ayahTo={node.endAyah ?? Math.min((node.levelNum ?? 1) * 3, section.ayahCount)}
                    />
                  </TouchableOpacity>
                );
              })
            );
          })()}

          {/* Luma — beside the active node, x derived from node position */}
          {firstActiveNode && (
            <LumaFloat
              style={{ position: 'absolute', left: lumaLeft, top: lumaTop }}
              speech={lumaSpeech}
              floatAnim={floatAnim}
            />
          )}

          {/* Journey end — start.png banner */}
          <View style={{ position: 'absolute', left: MAP_W / 2 - 50, top: MAP_H - 130, alignItems: 'center' }}>
            <Image source={START_SRC} style={{ width: 100, height: 80 }} resizeMode="contain" />
            <Text style={S.endText}>More coming soon…</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#7EC8E3' },
  hud: { backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 16, paddingVertical: 6 },
  hudRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  hudPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 3,
  },
  hudVal: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: '#DC2626' },
  avatarBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center',
    marginLeft: 'auto',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  questBanner: {
    marginHorizontal: 12, marginBottom: 4, marginTop: 4,
    backgroundColor: '#C4A84C', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 9,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#C4A84C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  questLabel:     { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: '#5A3A00', flex: 1 },
  questBadge:     { backgroundColor: 'rgba(90,58,0,0.15)', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 2 },
  questBadgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#5A3A00' },
  bismillahCard: {
    marginHorizontal: 12, marginTop: 4, marginBottom: 6,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: 'rgba(4,20,10,0.93)', borderRadius: 18, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(224,188,78,0.45)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.55, shadowRadius: 10, elevation: 8,
  },
  bismillahText: { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 30, color: '#E0BC4E', textAlign: 'center', lineHeight: 46 },
  bismillahSub:  { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 2 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(42,140,90,0.72)', zIndex: 20,
  },
  node: { width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  nodeCompleted: { backgroundColor: '#F0C040', borderWidth: 4, borderColor: '#FFD700', shadowColor: '#F0C040', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 8 },
  nodeCurrent:   { backgroundColor: '#37A168', borderWidth: 4, borderColor: 'white', shadowColor: '#2A7D4F', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 14, elevation: 10 },
  nodeGrey:      { backgroundColor: '#B0B8C8', borderWidth: 4, borderColor: '#8A95A8', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2 },
  pulseRing:     { position: 'absolute', width: NODE_SIZE + 20, height: NODE_SIZE + 20, borderRadius: (NODE_SIZE + 20) / 2, borderWidth: 3, borderColor: '#37A168' },
  nodeNumber:    { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 20, color: 'white' },
  nodeWrapper:   { alignItems: 'center' },
  rangeLabel:        { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 8, color: 'rgba(255,255,255,0.75)', marginTop: 2, textAlign: 'center' },
  starsBadge:        { position: 'absolute', bottom: -6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 },
  starsText:         { fontSize: 8, color: '#FFD700' },
  lumaGlow: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#fff', shadowOpacity: 0.6, shadowRadius: 8, elevation: 5,
  },
  lumaImg:           { width: 66, height: 66 },
  endText:           { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 4 },
});
