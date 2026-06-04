import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { JourneyTopBar } from '../../components/ui/JourneyTopBar';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { LevelNode, nodeAlignForIndex } from '../../components/journey/LevelNode';
import { contentApi, learningApi } from '../../api';
import type { RecommendedNext } from '../../types/api';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  mergeMvpCatalog,
  sortSurahsForJourney,
  filterToMvpSurahs,
} from '../../utils/surahCatalog';
import { loadReciters } from '../../services/reciters';
import type { SurahBrief, SurahLevel } from '../../types/api';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

type SurahProgress = {
  surah: SurahBrief;
  levels: SurahLevel[];
  completedCount: number;
  progressPct: number;
  isLocked: boolean;
  isComplete: boolean;
};

export function HomeScreen({ navigation }: Props) {
  const learning = useAuthStore(s => s.learning);
  const refreshLearning = useAuthStore(s => s.refreshLearning);
  const [chapters, setChapters] = useState<SurahProgress[]>([]);
  const [recommended, setRecommended] = useState<RecommendedNext | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      await loadReciters();

      // 1. Fetch surah list
      let rawSurahs: SurahBrief[] = [];
      try {
        rawSurahs = await contentApi.surahs(30, true);
      } catch {
        rawSurahs = [];
      }
      const surahs = sortSurahsForJourney(
        filterToMvpSurahs(
          mergeMvpCatalog(rawSurahs),
          useAuthStore.getState().learning?.mvp_surah_numbers,
        ),
      );

      // 2. Fetch levels for all surahs in parallel (requires auth)
      const levelResults = await Promise.allSettled(
        surahs.map(s => learningApi.levels(s.surah_number)),
      );

      // 3. Combine surah + levels
      const progress: SurahProgress[] = surahs.map((surah, i) => {
        const res = levelResults[i];
        const levels = res.status === 'fulfilled' ? res.value : [];
        const completedCount = levels.filter(l => l.status === 'completed').length;
        const progressPct =
          levels.length > 0 ? (completedCount / levels.length) * 100 : 0;
        return {
          surah,
          levels,
          completedCount,
          progressPct,
          isLocked: levels.length === 0 || levels.every(l => l.status === 'locked'),
          isComplete:
            levels.length > 0 && levels.every(l => l.status === 'completed'),
        };
      });

      setChapters(progress);

      // Fetch recommended next lesson (graceful degradation)
      try {
        const rec = await learningApi.recommendedNext();
        setRecommended(rec);
      } catch {
        setRecommended(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      refreshLearning();
    }, [refreshLearning]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    refreshLearning();
    load(true);
  };

  if (loading) {
    return (
      <Screen style={styles.screen}>
        <IrabBackground color={colors.yellow} />
        <JourneyTopBar
          streak={learning?.current_streak}
          xp={learning?.xp_total}
          hearts={learning?.hearts_remaining}
          gems={learning?.gem_balance}
        />
        <View style={styles.center}>
          <ActivityIndicator color={colors.yellow} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <IrabBackground color={colors.yellow} />

      <JourneyTopBar
        streak={learning?.current_streak}
        xp={learning?.xp_total}
        hearts={learning?.hearts_remaining}
        gems={learning?.gem_balance}
      />

      {/* Continue banner — taps directly into the recommended next lesson */}
      {recommended && (
        <Pressable
          style={styles.continueBanner}
          onPress={() =>
            navigation.navigate('LessonStart', {
              groupId: recommended.lesson_group_id,
              label: `${recommended.surah_name_en} · Level ${recommended.level_number}`,
            })
          }>
          <View style={styles.continueBannerLeft}>
            <AppText style={styles.continueBannerLabel}>Continue</AppText>
            <AppText style={styles.continueBannerTitle}>
              {recommended.surah_name_en} · Level {recommended.level_number}
            </AppText>
          </View>
          <AppText style={styles.continueBannerAr}>{recommended.surah_name_ar}</AppText>
          <AppText style={styles.continueBannerArrow}>▶</AppText>
        </Pressable>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.yellow}
          />
        }>
        {chapters.map(ch => (
          <ChapterSection
            key={ch.surah.surah_number}
            chapter={ch}
            onLevelPress={groupId => {
              navigation.navigate('LessonStart', {
                groupId,
                label: `Surah ${ch.surah.name_en}`,
              });
            }}
          />
        ))}
        <View style={styles.bottomPad} />
      </ScrollView>
    </Screen>
  );
}

function ChapterSection({
  chapter,
  onLevelPress,
}: {
  chapter: SurahProgress;
  onLevelPress: (groupId: string) => void;
}) {
  const { surah, levels, progressPct, isLocked, isComplete } = chapter;

  return (
    <View>
      {/* Chapter banner */}
      <View
        style={[
          styles.banner,
          isLocked && styles.bannerLocked,
          isComplete && styles.bannerComplete,
        ]}>
        {!isLocked && (
          <View style={styles.bannerSheen} />
        )}
        <View style={styles.bannerInner}>
          <View style={styles.bannerLeft}>
            <AppText style={styles.bannerEn}>{surah.name_en}</AppText>
            <AppText style={styles.bannerMeta}>
              {surah.ayah_count} Ayahs
            </AppText>
            {isLocked && (
              <View style={styles.bannerLockRow}>
                <AppText style={styles.bannerLockIcon}>🔒</AppText>
                <AppText style={styles.bannerLockText}>Complete previous chapter</AppText>
              </View>
            )}
            {!isLocked && !isComplete && progressPct > 0 && (
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                </View>
                <AppText style={styles.progressLabel}>
                  {Math.round(progressPct)}% memorised
                </AppText>
              </View>
            )}
            {isComplete && (
              <AppText style={styles.completeText}>✓ Complete!</AppText>
            )}
          </View>
          <AppText style={[styles.bannerAr, isLocked && styles.bannerArLocked]}>
            {surah.name_ar}
          </AppText>
        </View>
      </View>

      {/* Level nodes */}
      {levels.map((level, index) => (
        <LevelNode
          key={level.lesson_group_id}
          level={level}
          index={index}
          totalInChapter={levels.length}
          align={nodeAlignForIndex(index)}
          onPress={() => {
            if (level.status !== 'locked') {
              onLevelPress(level.lesson_group_id);
            }
          }}
        />
      ))}

      {/* If no levels loaded yet (locked chapter), show placeholder nodes */}
      {levels.length === 0 && isLocked && (
        <LockedPlaceholder count={Math.min(surah.ayah_count, 5)} />
      )}
    </View>
  );
}

function LockedPlaceholder({ count }: { count: number }) {
  const aligns = Array.from({ length: count }, (_, i) => nodeAlignForIndex(i));
  return (
    <>
      {aligns.map((align, i) => {
        const justifyMap: Record<string, 'flex-start' | 'center' | 'flex-end'> = {
          left: 'flex-start',
          center: 'center',
          right: 'flex-end',
        };
        return (
          <View
            key={i}
            style={[styles.placeholderRow, { justifyContent: justifyMap[align] }]}>
            <View style={styles.placeholderCircle}>
              <AppText style={styles.placeholderIcon}>
                {i === count - 1 ? '🏆' : '🔒'}
              </AppText>
            </View>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: spacing.xl },

  // Continue banner
  continueBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: 0,
    borderRadius: 16,
    backgroundColor: `${colors.yellow}18`,
    borderWidth: 1.5,
    borderColor: `${colors.yellow}50`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  continueBannerLeft: { flex: 1 },
  continueBannerLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.yellow,
  },
  continueBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
    marginTop: 1,
  },
  continueBannerAr: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.yellow,
    writingDirection: 'rtl',
  },
  continueBannerArrow: {
    color: colors.yellow,
    fontSize: 14,
    fontWeight: '900',
  },

  // Chapter banner
  banner: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: 24,
    padding: spacing.md,
    backgroundColor: `${colors.primary}dd`,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerLocked: {
    backgroundColor: 'rgba(90,93,104,0.35)',
    borderWidth: 1,
    borderColor: `${colors.grey}25`,
  },
  bannerComplete: {
    backgroundColor: colors.primary,
  },
  bannerSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.08,
    backgroundColor: '#fff',
    borderRadius: 24,
  },
  bannerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerLeft: { flex: 1 },
  bannerEn: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 15,
  },
  bannerMeta: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  bannerLockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  bannerLockIcon: { fontSize: 10 },
  bannerLockText: {
    color: colors.grey,
    fontSize: 11,
    fontWeight: '700',
  },
  bannerAr: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.yellow,
    writingDirection: 'rtl',
    marginLeft: spacing.sm,
  },
  bannerArLocked: { color: colors.grey },
  progressWrap: { marginTop: 6 },
  progressTrack: {
    height: 6,
    width: 112,
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
    fontSize: 10,
    fontWeight: '900',
    color: colors.yellow,
    marginTop: 2,
  },
  completeText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.white,
    marginTop: 2,
  },

  // Locked placeholder nodes
  placeholderRow: {
    height: 88,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  placeholderCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(26,45,61,0.9)',
    borderWidth: 2,
    borderColor: `${colors.grey}20`,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  placeholderIcon: { fontSize: 24 },
  bottomPad: { height: 32 },
});
