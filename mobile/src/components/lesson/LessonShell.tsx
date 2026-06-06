import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../ui/AppText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface Props {
  step: number;
  total: number;
  hearts: number;
  onClose: () => void;
  children: React.ReactNode;
}

export function LessonShell({ step, total, hearts, onClose, children }: Props) {
  const pct = total > 0 ? ((step + 1) / total) * 100 : 0;
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* ── Header ─────────────────────────────── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Pressable onPress={onClose} hitSlop={spacing.md} style={styles.closeBtn}>
          <AppText style={styles.closeIcon}>✕</AppText>
        </Pressable>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>

        <View style={styles.hearts}>
          <AppText style={styles.heartEmoji}>❤️</AppText>
          <AppText style={styles.heartsVal}>{hearts}</AppText>
        </View>
      </View>

      {/* ── Content (ExerciseRenderer owns the rest) ─ */}
      <View style={styles.body}>{children}</View>
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
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },

  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${colors.grey}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  closeIcon: { fontSize: 14, fontWeight: '700', color: colors.charcoal },

  track: {
    flex: 1, height: 8, backgroundColor: `${colors.grey}22`,
    borderRadius: 4, overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },

  hearts: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: `${colors.heart}15`,
    borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 4,
    minWidth: 42,
  },
  heartEmoji: { fontSize: 12 },
  heartsVal: { color: colors.heart, fontWeight: '900', fontSize: 13 },

  body: {
    flex: 1,
    paddingTop: spacing.sm,
  },
});
