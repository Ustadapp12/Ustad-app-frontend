import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../ui/AppText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { SurahBrief } from '../../types/api';
import { displaySurahNameAr } from '../../utils/surahDisplay';

type Props = {
  surah: SurahBrief;
  progressPct?: number;
  locked?: boolean;
};

export function SurahBanner({ surah, progressPct = 0, locked = false }: Props) {
  const complete = progressPct >= 100;
  const inProgress = !locked && progressPct > 0 && progressPct < 100;

  return (
    <View
      style={[
        styles.banner,
        locked && styles.bannerLocked,
        complete && styles.bannerComplete,
      ]}>
      <View style={styles.row}>
        <View style={styles.textCol}>
          <AppText style={styles.nameEn}>{surah.name_en}</AppText>
          <AppText style={styles.meta}>
            Surah {surah.surah_number} · {surah.ayah_count} ayahs
          </AppText>
          {locked ? (
            <AppText style={styles.lockedHint}>
              Complete the previous surah to unlock
            </AppText>
          ) : null}
          {inProgress ? (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${progressPct}%` }]}
                />
              </View>
              <AppText style={styles.progressLabel}>
                {Math.round(progressPct)}% memorised
              </AppText>
            </View>
          ) : null}
          {complete ? (
            <AppText style={styles.completeLabel}>Complete</AppText>
          ) : null}
        </View>
        <AppText
          variant="arabic"
          style={[styles.nameAr, locked && styles.nameArLocked]}>
          {displaySurahNameAr(surah.surah_number, surah.name_ar)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: spacing.md,
    marginHorizontal: spacing.screenHorizontal,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  bannerLocked: {
    backgroundColor: 'rgba(90, 93, 104, 0.45)',
  },
  bannerComplete: {
    backgroundColor: colors.primary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textCol: { flex: 1, paddingRight: spacing.sm },
  nameEn: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  meta: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  lockedHint: {
    color: colors.grey,
    fontSize: 10,
    marginTop: 6,
    fontWeight: '700',
  },
  progressWrap: { marginTop: spacing.sm },
  progressTrack: {
    height: 6,
    alignSelf: 'stretch',
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.yellow,
    borderRadius: 3,
  },
  progressLabel: {
    color: colors.yellow,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  completeLabel: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 6,
  },
  nameAr: {
    fontSize: 22,
    color: colors.yellow,
    lineHeight: 34,
    textAlign: 'right',
  },
  nameArLocked: {
    color: colors.grey,
  },
});
