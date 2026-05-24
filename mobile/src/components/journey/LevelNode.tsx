import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '../ui/AppText';
import { colors } from '../../theme/colors';
import type { SurahLevel } from '../../types/api';

export type NodeAlign = 'left' | 'center' | 'right';

type Props = {
  level: SurahLevel;
  index: number;
  align: NodeAlign;
  onPress: () => void;
};

export function LevelNode({ level, index, align, onPress }: Props) {
  const locked = level.status === 'locked';
  const completed = level.status === 'completed';
  const active =
    level.status === 'available' || level.status === 'in_progress';

  return (
    <View style={[styles.row, align === 'left' && styles.alignLeft, align === 'right' && styles.alignRight]}>
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
          {completed ? '✓' : locked ? '🔒' : '★'}
        </AppText>
      </Pressable>
      <View style={styles.label}>
        <AppText variant="h2" style={locked && styles.labelMuted}>
          Level {index + 1}
        </AppText>
        <AppText variant="caption">
          Ayah {level.start_ayah}–{level.end_ayah}
        </AppText>
        {level.stars != null && level.stars > 0 ? (
          <AppText style={styles.stars}>{'★'.repeat(level.stars)}</AppText>
        ) : null}
        {active ? (
          <View style={styles.startBubble}>
            <AppText style={styles.startText}>START</AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 88,
    paddingHorizontal: 24,
    gap: 12,
  },
  alignLeft: { justifyContent: 'flex-start', paddingLeft: 40 },
  alignRight: { justifyContent: 'flex-end', paddingRight: 40 },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.buttonSecondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: { backgroundColor: colors.yellow },
  circleActive: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.08 }],
  },
  circleLocked: { opacity: 0.55 },
  circleIcon: { fontSize: 20 },
  label: { maxWidth: 200 },
  labelMuted: { opacity: 0.5 },
  stars: { color: colors.yellow, marginTop: 2 },
  startBubble: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.yellow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  startText: {
    fontWeight: '900',
    fontSize: 11,
    color: colors.dark,
  },
});

export function nodeAlignForIndex(index: number): NodeAlign {
  const cycle: NodeAlign[] = ['center', 'right', 'left'];
  return cycle[index % cycle.length];
}
