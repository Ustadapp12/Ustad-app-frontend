import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors } from '../../theme/colors';

interface Props {
  icon: string;
  label: string;
}

export function FeatureChip({ icon, label }: Props) {
  return (
    <View style={styles.chip}>
      <AppText style={styles.icon}>{icon}</AppText>
      <AppText style={styles.label}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: `${colors.yellow}18`,
    borderWidth: 1,
    borderColor: `${colors.yellow}40`,
  },
  icon: { fontSize: 12 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.yellow,
  },
});
