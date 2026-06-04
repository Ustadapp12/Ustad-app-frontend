import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '../ui/AppText';
import { Mascot } from '../ui/Mascot';
import { colors } from '../../theme/colors';
import type { SurahLevel } from '../../types/api';

export type NodeAlign = 'left' | 'center' | 'right';

type Props = {
  level: SurahLevel;
  index: number;
  totalInChapter: number;
  align: NodeAlign;
  onPress: () => void;
};

export function LevelNode({ level, index, totalInChapter, align, onPress }: Props) {
  const locked = level.status === 'locked';
  const completed = level.status === 'completed';
  const active = level.status === 'available' || level.status === 'in_progress';
  const isTrophy = index === totalInChapter - 1; // last node = trophy

  const justifyMap: Record<NodeAlign, 'flex-start' | 'center' | 'flex-end'> = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
  };

  return (
    <View style={[styles.row, { justifyContent: justifyMap[align] }]}>
      {/* Mascot floats left of active node */}
      {active && align === 'center' && (
        <View style={styles.mascotLeft}>
          <Mascot size={48} bounce />
        </View>
      )}
      {active && align === 'right' && (
        <View style={styles.mascotLeftOfRight}>
          <Mascot size={48} bounce />
        </View>
      )}

      <View style={styles.nodeCol}>
        {/* Ring pulse for active */}
        {active && <View style={styles.pulseRing} />}

        <Pressable
          disabled={locked}
          onPress={onPress}
          style={[
            styles.circle,
            completed && styles.circleDone,
            active && styles.circleActive,
            locked && styles.circleLocked,
          ]}>
          <AppText style={styles.circleIcon}>
            {completed && isTrophy
              ? '🏆'
              : locked && isTrophy
                ? '🏆'
                : completed
                  ? '★'
                  : active
                    ? '▶'
                    : '🔒'}
          </AppText>
        </Pressable>

        {/* START! badge below active */}
        {active && (
          <View style={styles.startBadge}>
            <AppText style={styles.startText}>START!</AppText>
          </View>
        )}
      </View>

      {/* Mascot to right of left-aligned active node */}
      {active && align === 'left' && (
        <View style={styles.mascotRight}>
          <Mascot size={48} bounce />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 88,
    alignItems: 'center',
    paddingHorizontal: 32,
    position: 'relative',
  },
  nodeCol: {
    alignItems: 'center',
    position: 'relative',
  },

  // Pulse ring behind the active circle
  pulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${colors.primary}18`,
    top: -10,
    alignSelf: 'center',
  },

  circle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26,45,61,0.9)',
    borderWidth: 2,
    borderColor: `${colors.grey}20`,
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
    opacity: 0.6,
  },
  circleIcon: {
    fontSize: 26,
    lineHeight: 30,
  },

  startBadge: {
    marginTop: 4,
    backgroundColor: colors.yellow,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  startText: {
    fontWeight: '900',
    fontSize: 10,
    color: colors.dark,
    letterSpacing: 0.5,
  },

  // Mascot positioning
  mascotLeft: {
    position: 'absolute',
    left: 24,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  mascotRight: {
    position: 'absolute',
    right: 24,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  mascotLeftOfRight: {
    position: 'absolute',
    right: 96,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});

export function nodeAlignForIndex(index: number): NodeAlign {
  const cycle: NodeAlign[] = ['center', 'right', 'center', 'left'];
  return cycle[index % cycle.length];
}
