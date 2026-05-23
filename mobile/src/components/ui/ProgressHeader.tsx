import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface Props {
  step: number;
  total: number;
  onBack?: () => void;
  showBack?: boolean;
}

export function ProgressHeader({ step, total, onBack, showBack = true }: Props) {
  const progress = total > 0 ? (step + 1) / total : 0;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
            <AppText variant="h2">←</AppText>
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.back} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  back: {
    width: 32,
  },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: colors.progressTrack,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.progressFill,
    borderRadius: 2,
  },
});
