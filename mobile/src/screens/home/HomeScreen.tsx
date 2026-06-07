import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { JourneyTopBar } from '../../components/ui/JourneyTopBar';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { LevelNode, nodeAlignForIndex } from '../../components/journey/LevelNode';
import { learningApi } from '../../api';
import { loadSurahs } from '../../services/cachedContent';
import {
  allLevelsCached,
  getCachedLevels,
  getCachedRecommended,
  getCachedWeakSurahs,
} from '../../services/bootCache';
import { getCachedLevelsFromDisk } from '../../services/contentCache';
import type { RecommendedNext } from '../../types/api';
import { useAuthStore } from '../../store/authStore';
import { AnalyticsEvents, logAnalyticsEvent } from '../../services/analytics';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  mergeMvpCatalog,
  sortSurahsForJourney,
  filterToMvpSurahs,
} from '../../utils/surahCatalog';
import { warmAudioUrlCache } from '../../services/audioUrls';
import { displaySurahNameAr } from '../../utils/surahDisplay';
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
  hasWeak: boolean;
};

export function HomeScreen({ navigation }: Props) {
  const learning = useAuthStore(s => s.learning);
  const refreshLearning = useAuthStore(s => s.refreshLearning);
  const [chapters, setChapters] = useState<SurahProgress[]>([]);
  const [recommended, setRecommended] = useState<RecommendedNext | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    const mvpNumbers = useAuthStore.getState().learning?.mvp_surah_numbers ?? [];
    if (!isRefresh) setLoading(true);
    setLoadError(false);
    try {
      const rawSurahs = await loadSurahs(30, true, { force: isRefresh }).catch(() => [] as SurahBrief[]);
      const surahs = sortSurahsForJourney(
        filterToMvpSurahs(mergeMvpCatalog(rawSurahs), mvpNumbers),
      );

      let recommendedResult: RecommendedNext | null;
      let levelsList: SurahLevel[][];

      if (!isRefresh && allLevelsCached(mvpNumbers)) {
        // Instant path — use in-memory boot cache populated at auth time
        recommendedResult = getCachedRecommended();
        levelsList = surahs.map(s => getCachedLevels(s.surah_number) ?? []);
      } else if (!isRefresh) {
        // Disk cache path — AsyncStorage (no network, ~50ms)
        const diskLevels = await Promise.all(
          surahs.map(s => getCachedLevelsFromDisk(s.surah_number)),
        );
        if (diskLevels.every(l => l !== null)) {
          recommendedResult = getCachedRecommended();
          levelsList = diskLevels as import('../../types/api').SurahLevel[][];
        } else {
          // Network path — first launch or disk cache expired
          void warmAudioUrlCache();
          const [recResult, ...levelResults] = await Promise.allSettled([
            learningApi.recommendedNext(),
            ...surahs.map(s => learningApi.levels(s.surah_number)),
          ]);
          recommendedResult = recResult.status === 'fulfilled'
            ? recResult.value
            : getCachedRecommended();
          levelsList = levelResults.map(r => r.status === 'fulfilled' ? r.value : []);
        }
      } else {
        // Explicit refresh — always hit network
        void warmAudioUrlCache();
        const [recResult, ...levelResults] = await Promise.allSettled([
          learningApi.recommendedNext(),
          ...surahs.map(s => learningApi.levels(s.surah_number)),
        ]);
        recommendedResult = recResult.status === 'fulfilled'
          ? recResult.value
          : getCachedRecommended();
        levelsList = levelResults.map(r => r.status === 'fulfilled' ? r.value : []);
      }

      const weakSurahs = getCachedWeakSurahs();
      const progress: SurahProgress[] = surahs.map((surah, i) => {
        const surahLevels = levelsList[i];
        const completedCount = surahLevels.filter(l => l.status === 'completed').length;
        const progressPct =
          surahLevels.length > 0 ? (completedCount / surahLevels.length) * 100 : 0;
        return {
          surah,
          levels: surahLevels,
          completedCount,
          progressPct,
          isLocked:
            surahLevels.length === 0 ||
            surahLevels.every(l => l.status === 'locked'),
          isComplete:
            surahLevels.length > 0 &&
            surahLevels.every(l => l.status === 'completed'),
          hasWeak: weakSurahs?.has(surah.surah_number) ?? false,
        };
      });

      setChapters(progress);
      setRecommended(recommendedResult);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    void logAnalyticsEvent(AnalyticsEvents.HOME_VIEW, {
      streak: learning?.current_streak,
      xp: learning?.xp_total,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void refreshLearning({ force: true });
    load(true);
  };

  if (loading) {
    return (
      <Screen style={styles.screen} edges={['top']}>
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
    <Screen style={styles.screen} edges={['top']}>
      <IrabBackground color={colors.yellow} />

      <JourneyTopBar
        streak={learning?.current_streak}
        xp={learning?.xp_total}
        hearts={learning?.hearts_remaining}
        gems={learning?.gem_balance}
      />

      {/* Error banner */}
      {loadError && !refreshing && (
        <Pressable
          style={styles.errorBanner}
          onPress={() => { setRefreshing(true); void refreshLearning({ force: true }); load(true); }}>
          <AppText style={styles.errorBannerText}>
            Couldn't load lessons — tap to retry
          </AppText>
        </Pressable>
      )}

      {/* Continue banner — taps directly into the recommended next lesson */}
      {recommended && (
        <Pressable
          style={styles.continueBanner}
          onPress={() =>
            navigation.navigate('LessonStart', {
              groupId: recommended.lesson_group_id,
              label: `${recommended.surah_name_ar} · Level ${recommended.level_number}`,
            })
          }>
          <View style={styles.continueBannerLeft}>
            <AppText style={styles.continueBannerLabel}>Continue</AppText>
            <AppText style={styles.continueBannerTitle}>
              {recommended.surah_name_ar} · Level {recommended.level_number}
            </AppText>
          </View>
          <AppText variant="arabic" style={styles.continueBannerAr}>
            {displaySurahNameAr(recommended.surah_number, recommended.surah_name_ar)}
          </AppText>
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
            onBannerPress={ch.isLocked ? undefined : () => {
              navigation.navigate('SurahLevels', {
                surahNumber: ch.surah.surah_number,
                nameEn: ch.surah.name_en,
                nameAr: ch.surah.name_ar,
              });
            }}
            onLevelPress={groupId => {
              navigation.navigate('LessonStart', {
                groupId,
                label: ch.surah.name_ar,
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
  onBannerPress,
  onLevelPress,
}: {
  chapter: SurahProgress;
  onBannerPress?: () => void;
  onLevelPress: (groupId: string) => void;
}) {
  const { surah, levels, progressPct, isLocked, isComplete, hasWeak } = chapter;

  return (
    <View>
      {/* Chapter banner — tappable when unlocked to see stage breakdown */}
      <Pressable
        onPress={onBannerPress}
        disabled={!onBannerPress}
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
            <AppText variant="arabic" style={styles.bannerArabicName}>
              {displaySurahNameAr(surah.surah_number, surah.name_ar)}
            </AppText>
            <AppText style={styles.bannerMeta}>
              {surah.transliteration} · {surah.ayah_count} Ayahs
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
            {hasWeak && !isLocked && (
              <View style={styles.weakBadge}>
                <AppText style={styles.weakBadgeText}>⚠ Needs revision</AppText>
              </View>
            )}
          </View>
          <View style={styles.bannerRight}>
            <AppText style={[styles.bannerEn, isLocked && styles.bannerArLocked]}>
              {surah.name_en}
            </AppText>
            {!isLocked && (
              <AppText style={styles.bannerChevron}>›</AppText>
            )}
          </View>
        </View>
      </Pressable>

      {/* Level nodes */}
      {levels.map((level, index) => (
        <LevelNode
          key={level.lesson_group_id}
          level={level}
          index={index}
          totalInChapter={levels.length}
          align={nodeAlignForIndex(index)}
          nextAlign={index < levels.length - 1 ? nodeAlignForIndex(index + 1) : undefined}
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

  errorBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 12,
    backgroundColor: `${colors.heart}18`,
    borderWidth: 1,
    borderColor: `${colors.heart}40`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  errorBannerText: { color: colors.heart, fontWeight: '700', fontSize: 13 },

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
    backgroundColor: `${colors.charcoal}55`,
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
  bannerArabicName: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 20,
    writingDirection: 'rtl',
  },
  bannerRight: { alignItems: 'flex-end', gap: 4 },
  bannerEn: {
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    fontSize: 11,
    marginTop: 2,
  },
  bannerChevron: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 20,
    fontWeight: '300',
    lineHeight: 22,
  },
  bannerMeta: {
    color: 'rgba(255,255,255,0.65)',
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
  bannerArLocked: { color: colors.grey, opacity: 0.5 },
  progressWrap: { marginTop: 6 },
  progressTrack: {
    height: 6,
    width: 112,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
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
  weakBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: `${colors.yellow}22`,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: `${colors.yellow}50`,
  },
  weakBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.yellow,
  },

  // Locked placeholder nodes
  placeholderRow: {
    height: 88,
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
  },
  placeholderCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: `${colors.dark}e8`,
    borderWidth: 2,
    borderColor: `${colors.grey}20`,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  placeholderIcon: { fontSize: 24 },
  bottomPad: { height: 32 },
});
