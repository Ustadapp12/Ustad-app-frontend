import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { EmojiText } from './EmojiText';
import { Logo } from './Logo';
import { colors } from '../../theme/colors';

type Props = {
  streak?: number;
  xp?: number;
  hearts?: number;
  gems?: number;
};

export function JourneyTopBar({ streak = 0, xp = 0, hearts = 5, gems }: Props) {
  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <View style={styles.bar}>
      <View style={styles.centerLogo} pointerEvents="none">
        <Logo light compact />
      </View>

      <View style={styles.left}>
        <View style={[styles.pill, styles.streakPill]}>
          <EmojiText size={14}>🔥</EmojiText>
          <AppText style={styles.streakVal}>{fmtNum(streak)}</AppText>
        </View>
      </View>

      <View style={styles.right}>
        {gems != null ? (
          <View style={[styles.pill, styles.streakPill]}>
            <EmojiText size={14}>💎</EmojiText>
            <AppText style={styles.streakVal}>{fmtNum(gems)}</AppText>
          </View>
        ) : null}
        <View style={[styles.pill, styles.streakPill]}>
          <EmojiText size={14}>⚡</EmojiText>
          <AppText style={styles.streakVal}>{fmtNum(xp)}</AppText>
        </View>
        <View style={[styles.pill, styles.heartPill]}>
          <EmojiText size={14}>❤️</EmojiText>
          <AppText style={styles.heartVal}>{hearts}</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 52,
  },
  centerLogo: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  right: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  streakPill: {
    backgroundColor: 'rgba(233,196,104,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(233,196,104,0.3)',
  },
  heartPill: {
    backgroundColor: 'rgba(232,93,93,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232,93,93,0.3)',
  },
  streakVal: { color: colors.yellow, fontWeight: '800', fontSize: 12 },
  heartVal:  { color: colors.heart,  fontWeight: '800', fontSize: 12 },
});
