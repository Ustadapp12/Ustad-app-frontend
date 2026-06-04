import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { BackButton } from '../../components/ui/BackButton';
import { lessonsApi } from '../../api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { SurahPath, SurahStage } from '../../types/api';
import type { RootStackParamList } from '../../navigation/types';
import { displaySurahNameAr } from '../../utils/surahDisplay';

type Props = NativeStackScreenProps<RootStackParamList, 'SurahLevels'>;

const STAGE_ICONS: Record<SurahStage['stage_type'], string> = {
  listening: '👂',
  recognition: '👁',
  building: '🔨',
  recall: '🧠',
  mastery: '⭐',
};

const STATUS_COLOR: Record<SurahStage['status'], string> = {
  completed: colors.primary,
  available: colors.yellow,
  in_progress: colors.yellow,
  locked: 'rgba(255,255,255,0.2)',
};

export function SurahLevelsScreen({ route, navigation }: Props) {
  const { surahNumber, nameEn, nameAr } = route.params;
  const [path, setPath] = useState<SurahPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    lessonsApi
      .surahPath(surahNumber)
      .then(setPath)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [surahNumber]);

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const completedCount = path?.stages.filter(s => s.status === 'completed').length ?? 0;
  const totalStages = path?.stages.length ?? 5;
  const progressPct = totalStages > 0 ? (completedCount / totalStages) * 100 : 0;

  return (
    <Screen style={styles.screen}>
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack()} light />
      </View>
      <View style={styles.banner}>
        <View style={styles.bannerRow}>
          <View style={styles.bannerLeft}>
            <AppText style={styles.bannerEn}>{nameEn}</AppText>
            <AppText style={styles.bannerMeta}>
              Surah {surahNumber} · {path?.ayah_count ?? '—'} ayahs · {totalStages} stages
            </AppText>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
          </View>
          {nameAr ? (
            <AppText variant="arabic" style={styles.bannerAr}>
              {displaySurahNameAr(surahNumber, nameAr)}
            </AppText>
          ) : null}
        </View>
      </View>

      {error || !path ? (
        <View style={styles.empty}>
          <AppText style={styles.emptyTitle}>Path not available yet</AppText>
          <AppText variant="caption" style={styles.emptyBody}>
            This surah's learning path has not been generated. MVP includes surahs 78–87 only.
          </AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {path.stages.map(stage => {
            const locked = stage.status === 'locked';
            const groupId = stage.lesson_group_ids[0] ?? null;
            const canOpen = !locked && Boolean(groupId);

            return (
              <Pressable
                key={stage.stage_num}
                style={[styles.stageCard, !canOpen && styles.stageCardLocked]}
                onPress={() => {
                  if (!canOpen || !groupId) return;
                  navigation.navigate('LessonStart', {
                    groupId,
                    label: stage.title_en,
                  });
                }}>
                <View style={[styles.stageIcon, { backgroundColor: `${STATUS_COLOR[stage.status]}20` }]}>
                  <AppText style={styles.stageEmoji}>
                    {STAGE_ICONS[stage.stage_type]}
                  </AppText>
                  <AppText style={[styles.stageNum, { color: STATUS_COLOR[stage.status] }]}>
                    {stage.stage_num}
                  </AppText>
                </View>
                <View style={styles.stageBody}>
                  <AppText style={[styles.stageTitle, !canOpen && styles.stageTitleLocked]}>
                    {stage.title_en}
                  </AppText>
                  <AppText style={styles.stageMeta}>
                    {stage.stage_type.charAt(0).toUpperCase() + stage.stage_type.slice(1)} · +{stage.xp_reward} XP
                  </AppText>
                  {stage.stars !== null && stage.stars > 0 ? (
                    <AppText style={styles.stageStars}>
                      {'★'.repeat(stage.stars)}{'☆'.repeat(3 - stage.stars)}
                    </AppText>
                  ) : null}
                </View>
                <View style={styles.stageBadge}>
                  {stage.status === 'completed' ? (
                    <AppText style={[styles.badgeText, { color: colors.primary }]}>Done</AppText>
                  ) : canOpen && stage.status === 'in_progress' ? (
                    <AppText style={[styles.badgeText, { color: colors.yellow }]}>Resume</AppText>
                  ) : canOpen && stage.status === 'available' ? (
                    <AppText style={[styles.badgeText, { color: colors.yellow }]}>Start</AppText>
                  ) : (
                    <AppText style={styles.lockIcon}>🔒</AppText>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xs,
  },
  banner: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    marginHorizontal: spacing.screenHorizontal,
    marginTop: spacing.md,
    borderRadius: 20,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerLeft: { flex: 1 },
  bannerEn: { color: colors.white, fontWeight: '800', fontSize: 18 },
  bannerMeta: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  bannerAr: {
    fontSize: 24,
    color: colors.yellow,
    fontWeight: '700',
    writingDirection: 'rtl',
    marginLeft: spacing.md,
  },
  progressTrack: {
    height: 6,
    width: 140,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.yellow,
    borderRadius: 3,
  },
  scroll: { padding: spacing.screenHorizontal, paddingBottom: spacing.xl, gap: spacing.sm },
  stageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: spacing.md,
  },
  stageCardLocked: { opacity: 0.5 },
  stageIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageEmoji: { fontSize: 20 },
  stageNum: { fontSize: 10, fontWeight: '900', marginTop: 2 },
  stageBody: { flex: 1 },
  stageTitle: { color: colors.white, fontWeight: '800', fontSize: 15 },
  stageTitleLocked: { color: colors.grey },
  stageMeta: { color: colors.grey, fontSize: 11, fontWeight: '600', marginTop: 2 },
  stageStars: { color: colors.yellow, fontSize: 13, marginTop: 3 },
  stageBadge: { alignItems: 'flex-end' },
  badgeText: { fontWeight: '800', fontSize: 12 },
  lockIcon: { fontSize: 16 },
  empty: { padding: spacing.xl, marginHorizontal: spacing.screenHorizontal },
  emptyTitle: { color: colors.white, fontWeight: '800', fontSize: 16, marginBottom: spacing.sm },
  emptyBody: { color: colors.grey, lineHeight: 20 },
});
