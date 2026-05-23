import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '../ui/AppText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface Props {
  step: number;
  total: number;
  hearts: number;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  feedback?: React.ReactNode;
}

export function LessonShell({
  step,
  total,
  hearts,
  onClose,
  children,
  footer,
  feedback,
}: Props) {
  const progress = total > 0 ? (step + 1) / total : 0;
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <AppText variant="h2">✕</AppText>
        </Pressable>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.hearts}>
          <AppText style={styles.heartIcon}>♥</AppText>
          <AppText variant="caption">{hearts}</AppText>
        </View>
      </View>
      <View style={styles.body}>{children}</View>
      {feedback}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
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
  },
  hearts: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 40 },
  heartIcon: { color: colors.heart, fontSize: 18 },
  body: { flex: 1, paddingHorizontal: spacing.screenHorizontal, paddingTop: spacing.lg },
  footer: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.lg,
  },
});
