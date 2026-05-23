import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors } from '../../theme/colors';

interface Props {
  large?: boolean;
  light?: boolean;
}

/** Matches team design: أُسْتَاذ + USTAD · HIFZ */
export function Logo({ large, light }: Props) {
  return (
    <View style={styles.wrap}>
      <AppText
        style={[
          styles.arabic,
          large && styles.arabicLg,
          light ? styles.arabicLight : styles.arabicDark,
        ]}>
        أُسْتَاذ
      </AppText>
      <AppText
        style={[
          styles.sub,
          large && styles.subLg,
          light ? styles.subLight : styles.subDark,
        ]}>
        USTAD · HIFZ
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  arabic: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.yellow,
    letterSpacing: 1,
  },
  arabicLg: { fontSize: 50, lineHeight: 58 },
  arabicDark: { color: colors.yellow },
  arabicLight: { color: colors.yellow },
  sub: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  subLg: { fontSize: 10, letterSpacing: 5 },
  subDark: { color: colors.grey },
  subLight: { color: 'rgba(255,255,255,0.35)' },
});
