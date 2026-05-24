import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors } from '../../theme/colors';

type Props = {
  onPress: () => void;
  light?: boolean;
};

export function BackButton({ onPress, light }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.btn, light && styles.btnLight]}
      hitSlop={8}>
      <AppText style={styles.icon}>‹</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: `${colors.grey}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLight: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  icon: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.charcoal,
    marginTop: -4,
    marginLeft: -2,
  },
});
