import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Logo } from './Logo';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = {
  streak?: number;
  xp?: number;
  hearts?: number;
  gems?: number;
};

export function JourneyTopBar({
  streak = 0,
  xp = 0,
  hearts = 5,
  gems,
}: Props) {
  return (
    <View style={styles.bar}>
      <View style={[styles.pill, styles.streakPill]}>
        <AppText style={styles.pillIcon}>🔥</AppText>
        <AppText style={styles.streakVal}>{streak}</AppText>
      </View>
      <Logo light />
      <View style={styles.right}>
        {gems != null ? (
          <View style={[styles.pill, styles.streakPill]}>
            <AppText style={styles.pillIcon}>💎</AppText>
            <AppText style={styles.streakVal}>{gems}</AppText>
          </View>
        ) : null}
        <View style={[styles.pill, styles.streakPill]}>
          <AppText style={styles.pillIcon}>⚡</AppText>
          <AppText style={styles.streakVal}>{xp}</AppText>
        </View>
        <View style={[styles.pill, styles.heartPill]}>
          <AppText style={styles.pillIcon}>❤️</AppText>
          <AppText style={styles.heartVal}>{hearts}</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  streakPill: {
    backgroundColor: 'rgba(233, 196, 104, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(233, 196, 104, 0.35)',
  },
  heartPill: {
    backgroundColor: 'rgba(232, 93, 93, 0.15)',
    borderColor: 'rgba(232, 93, 93, 0.35)',
    borderWidth: 1,
  },
  pillIcon: { fontSize: 14 },
  streakVal: { color: colors.yellow, fontWeight: '800', fontSize: 13 },
  heartVal: { color: colors.heart, fontWeight: '800', fontSize: 13 },
  right: { flexDirection: 'row', gap: 6 },
});
