import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface Props {
  label: string;
  icon?: string;
  selected?: boolean;
  onPress: () => void;
}

export function OptionCard({ label, icon, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && styles.selected]}>
      {icon ? <AppText style={styles.icon}>{icon}</AppText> : null}
      <AppText variant="body" style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.buttonSecondaryBg,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    gap: spacing.md,
  },
  selected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.ash,
  },
  icon: {
    fontSize: 22,
  },
  label: {
    flex: 1,
    color: colors.dark,
  },
});
