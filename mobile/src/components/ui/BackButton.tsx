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
      hitSlop={10}>
      <AppText style={[styles.arrow, light && styles.arrowLight]}>←</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: `${colors.grey}30`,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  btnLight: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.22)',
  },
  arrow: {
    fontSize: 20,
    color: colors.charcoal,
    fontWeight: '600',
    lineHeight: 24,
  },
  arrowLight: {
    color: 'rgba(255,255,255,0.92)',
  },
});
