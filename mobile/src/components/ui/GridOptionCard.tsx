import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = {
  label: string;
  sub?: string;
  icon: string;
  selected?: boolean;
  onPress: () => void;
};

export function GridOptionCard({ label, sub, icon, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && styles.selected]}>
      <AppText style={styles.icon}>{icon}</AppText>
      <AppText style={styles.label}>{label}</AppText>
      {sub ? <AppText style={styles.sub}>{sub}</AppText> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    maxWidth: '48%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: `${colors.grey}35`,
    alignItems: 'flex-start',
    gap: 4,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.successBg,
  },
  icon: { fontSize: 24 },
  label: {
    fontWeight: '800',
    fontSize: 13,
    color: colors.dark,
  },
  sub: {
    fontSize: 10,
    color: colors.charcoal,
    fontWeight: '600',
  },
});

export function GridOptions({ children }: { children: React.ReactNode }) {
  return <View style={gridStyles.wrap}>{children}</View>;
}

const gridStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
});
