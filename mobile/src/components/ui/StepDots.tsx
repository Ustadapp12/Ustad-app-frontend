import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

type Props = {
  total: number;
  current: number;
};

export function StepDots({ total, current }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current && styles.done,
            i === current && styles.active,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: `${colors.grey}40`,
  },
  done: { backgroundColor: colors.primary },
  active: {
    width: 20,
    backgroundColor: colors.yellow,
  },
});
