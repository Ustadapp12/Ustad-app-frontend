import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors } from '../../theme/colors';

interface Props {
  large?: boolean;
  light?: boolean;
  /** Compact wordmark for JourneyTopBar — avoids overlapping stat pills. */
  compact?: boolean;
}

/** Matches team design: أُسْتَاذ + USTAD · HIFZ */
export function Logo({ large, light, compact }: Props) {
  return (
    <View style={styles.wrap}>
      <AppText
        variant="arabic"
        style={[
          styles.arabic,
          large && styles.arabicLg,
          compact && styles.arabicCompact,
          light ? styles.arabicLight : styles.arabicDark,
        ]}>
        أُسْتَاذ
      </AppText>
      <AppText
        style={[
          styles.sub,
          large && styles.subLg,
          compact && styles.subCompact,
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
    color: colors.yellow,
    textAlign: 'center',
    lineHeight: 40,
  },
  arabicLg: { fontSize: 50, lineHeight: 58 },
  arabicCompact: { fontSize: 22, lineHeight: 30 },
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
  subCompact: { fontSize: 7, letterSpacing: 2, marginTop: 2 },
  subDark: { color: colors.grey },
  subLight: { color: 'rgba(255,255,255,0.35)' },
});
