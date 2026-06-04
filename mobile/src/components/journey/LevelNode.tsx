import React from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { AppText } from '../ui/AppText';
import { Mascot } from '../ui/Mascot';
import { colors } from '../../theme/colors';

/** Simple lock icon drawn with Views — avoids Android emoji inconsistency */
function LockIcon({ size = 28 }: { size?: number }) {
  const s = size;
  const shackleW = s * 0.44;
  const shackleH = s * 0.38;
  const bodyW = s * 0.7;
  const bodyH = s * 0.46;
  const col = 'rgba(255,255,255,0.6)';
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* Shackle (U-shape top) */}
      <View style={{
        width: shackleW, height: shackleH,
        borderWidth: s * 0.09, borderColor: col,
        borderTopLeftRadius: shackleW / 2,
        borderTopRightRadius: shackleW / 2,
        borderBottomWidth: 0,
        marginBottom: -s * 0.04,
      }} />
      {/* Body */}
      <View style={{
        width: bodyW, height: bodyH,
        backgroundColor: col,
        borderRadius: s * 0.1,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <View style={{
          width: s * 0.14, height: s * 0.14,
          borderRadius: s * 0.07,
          backgroundColor: 'rgba(0,0,0,0.3)',
        }} />
      </View>
    </View>
  );
}
import type { SurahLevel } from '../../types/api';

export type NodeAlign = 'left' | 'center' | 'right';

const W = Dimensions.get('window').width;
const NODE = 72;
const PAD = 32;

// Absolute X positions for each alignment
const X: Record<NodeAlign, number> = {
  left:   PAD,
  center: (W - NODE) / 2,
  right:  W - NODE - PAD,
};

type Props = {
  level: SurahLevel;
  index: number;
  totalInChapter: number;
  align: NodeAlign;
  nextAlign?: NodeAlign;
  onPress: () => void;
};

/** Draw 5 dots curving from (fromX) to (toX) over the row height */
function PathDots({ fromX, toX }: { fromX: number; toX: number }) {
  const dots = 5;
  const dotSize = 7;
  const rowH = ROW_H;
  return (
    <>
      {Array.from({ length: dots }, (_, i) => {
        const t = (i + 1) / (dots + 1);
        // Bezier-style interpolation: ease out of fromX, ease into toX
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const x = fromX + NODE / 2 - dotSize / 2 + (toX - fromX) * ease;
        const y = rowH * t - dotSize / 2;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: `${colors.primary}55`,
            }}
          />
        );
      })}
    </>
  );
}

const ROW_H = 110;

export function LevelNode({ level, index, totalInChapter, align, nextAlign, onPress }: Props) {
  const locked    = level.status === 'locked';
  const completed = level.status === 'completed';
  const active    = level.status === 'available' || level.status === 'in_progress';
  const isTrophy  = index === totalInChapter - 1;

  const nodeX = X[align];
  const nextX = nextAlign ? X[nextAlign] : nodeX;

  return (
    <View style={styles.row}>
      {/* ── Dotted path to the next node ─────────────────── */}
      {nextAlign && (
        <PathDots fromX={nodeX} toX={nextX} />
      )}

      {/* ── Pulse ring behind active node ─────────────────── */}
      {active && (
        <View
          style={[
            styles.pulseRing,
            { left: nodeX - (88 - NODE) / 2 },
          ]}
        />
      )}

      {/* ── Main circle ──────────────────────────────────── */}
      <Pressable
        disabled={locked}
        onPress={onPress}
        style={[
          styles.circle,
          { left: nodeX },
          completed && styles.circleDone,
          active    && styles.circleActive,
          locked    && styles.circleLocked,
        ]}>
        {isTrophy ? (
          <AppText style={styles.circleIcon}>🏆</AppText>
        ) : completed ? (
          <AppText style={[styles.circleIcon, { color: colors.dark }]}>★</AppText>
        ) : active ? (
          <AppText style={[styles.circleIcon, { color: colors.white }]}>▶</AppText>
        ) : (
          <LockIcon size={26} />
        )}
      </Pressable>

      {/* ── START! badge ──────────────────────────────────── */}
      {active && (
        <View style={[styles.startBadge, { left: nodeX + (NODE - 52) / 2 }]}>
          <AppText style={styles.startText}>START!</AppText>
        </View>
      )}

      {/* ── Mascot — opposite side from node ─────────────── */}
      {active && align === 'left' && (
        <View style={styles.mascotRight}>
          <Mascot size={44} bounce />
        </View>
      )}
      {active && align === 'right' && (
        <View style={styles.mascotLeft}>
          <Mascot size={44} bounce />
        </View>
      )}
      {active && align === 'center' && (
        <View style={styles.mascotLeft}>
          <Mascot size={44} bounce />
        </View>
      )}
    </View>
  );
}

export function nodeAlignForIndex(index: number): NodeAlign {
  const cycle: NodeAlign[] = ['center', 'right', 'center', 'left'];
  return cycle[index % cycle.length];
}

const styles = StyleSheet.create({
  row: {
    height: ROW_H,
    position: 'relative',
  },

  pulseRing: {
    position: 'absolute',
    top: (ROW_H - 88) / 2,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${colors.primary}22`,
  },

  circle: {
    position: 'absolute',
    top: (ROW_H - NODE) / 2,
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26,45,61,0.9)',
    borderWidth: 2,
    borderColor: `${colors.grey}25`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  circleDone: {
    backgroundColor: colors.yellow,
    borderColor: '#f0d080',
    borderWidth: 3,
  },
  circleActive: {
    backgroundColor: colors.primary,
    borderColor: '#06c489',
    borderWidth: 3,
  },
  circleLocked: {
    opacity: 0.5,
  },
  circleIcon: {
    fontSize: 26,
    lineHeight: 30,
  },

  startBadge: {
    position: 'absolute',
    top: (ROW_H - NODE) / 2 + NODE + 4,
    width: 52,
    backgroundColor: colors.yellow,
    paddingVertical: 3,
    borderRadius: 99,
    alignItems: 'center',
  },
  startText: {
    fontWeight: '900',
    fontSize: 9,
    color: colors.dark,
    letterSpacing: 0.5,
  },

  mascotLeft: {
    position: 'absolute',
    left: PAD + NODE + 8,
    top: (ROW_H - 44) / 2,
  },
  mascotRight: {
    position: 'absolute',
    right: PAD + NODE + 8,
    top: (ROW_H - 44) / 2,
  },
});
