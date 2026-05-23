import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface Props {
  size?: number;
}

export function LogoPlaceholder({ size = 96 }: Props) {
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: size * 0.18 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
  },
});
