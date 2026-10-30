import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, SectionList, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { useResponsiveScale, safeBottomInset, designScale, type Scale } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';
import { fetchAllSurahProgress, type SurahProgress } from '../../utils/surahProgress';
import ChestInfoModal from '../../components/ChestInfoModal';
import BackButton from '../../components/BackButton';
import RewardChestButton from '../../components/RewardChestButton';
import GlowProgressBar from '../../components/GlowProgressBar';
import { makeStyles } from './SurahProgressScreen.styles';

interface Props { navigation: RootNavProp }


// Real progress should never read as 0%, and unfinished work never as 100%.
function pctLabel(fraction: number): string {
  if (fraction > 0 && fraction < 0.01) return '<1%';
  if (fraction < 1 && fraction > 0.99) return '99%';
  return `${Math.round(fraction * 100)}%`;
}

// The design's bar row: glowing bar, the percentage just above its right
// end, and the reward chest in a white circle sitting on the bar's end.
function BarWithChest({ fraction, d, styles, pctGap, onChest }: {
  fraction: number; d: Scale; styles: ReturnType<typeof makeStyles>;
  pctGap: number; onChest: () => void;
}) {
  return (
    <View style={styles.barRow}>
      <View style={styles.barFlex}>
        <GlowProgressBar fraction={fraction} d={d} />
      </View>
      <Text style={[styles.pctText, { right: styles.chestCircle.width + pctGap }]}>{pctLabel(fraction)}</Text>
      <RewardChestButton style={styles.chestCircle} iconStyle={styles.chestIcon} onPress={onChest} />
    </View>
  );
}

export default function SurahProgressScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const sc = useResponsiveScale();
  // Figma progress_final is a 440pt frame: d(n) reads its numbers directly.
  const d = useMemo(() => designScale(sc), [sc]);
  const styles = useMemo(() => makeStyles(d), [d]);

  const [progress, setProgress] = useState<SurahProgress[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [chestInfoVisible, setChestInfoVisible] = useState(false);

  const load = useCallback(async (asRefresh: boolean) => {
    if (asRefresh) setRefreshing(true);
    try {
      setProgress(await fetchAllSurahProgress());
      setError(false);
    } catch (e) {
      console.warn('[SurahProgressScreen] progress fetch failed:', e);
      setError(true);
    } finally {
      if (asRefresh) setRefreshing(false);
    }
  }, []);

  // Refetch on every focus so coming back from a lesson shows the new level.
  useFocusEffect(useCallback(() => { void load(false); }, [load]));

  // Same three states as SearchSurahsScreen: a surah is Open once its FIRST
  // level is complete, Completed once every level is, and Closed otherwise --
  // including one whose first level was started but not finished (that used
  // to land in "In Progress" here while Search called it closed). Levels
  // unlock strictly in order, so completed > 0 means the first level is done.
  // 'unavailable' only ever comes from the detailed fetch, which only runs for
  // surahs whose first level is complete, so it belongs with Open.
  const sections = useMemo(() => {
    if (!progress) return [];
    const pct = (p: SurahProgress) => (p.total ? p.completed / p.total : 0);
    const isOpen = (p: SurahProgress) =>
      (p.state === 'in_progress' && p.completed > 0) || p.state === 'unavailable';
    const open = progress.filter(isOpen)
      .sort((a, b) => pct(b) - pct(a) || b.surah.surah_number - a.surah.surah_number);
    const done = progress.filter(p => p.state === 'completed')
      .sort((a, b) => b.surah.surah_number - a.surah.surah_number);
    const closed = progress.filter(p => p.state !== 'completed' && !isOpen(p))
      .sort((a, b) => a.surah.surah_number - b.surah.surah_number);
    return [
      { title: 'Open', key: 'open', data: open },
      { title: 'Completed', key: 'completed', data: done },
      { title: 'Closed', key: 'closed', data: closed },
    ].filter(s => s.data.length > 0);
  }, [progress]);

  const summary = useMemo(() => {
    if (!progress) return null;
    const known = progress.filter(p => p.state !== 'unavailable');
    const levelsDone = known.reduce((n, p) => n + p.completed, 0);
    const levelsTotal = known.reduce((n, p) => n + p.total, 0);
    return { fraction: levelsTotal ? levelsDone / levelsTotal : 0 };
  }, [progress]);

  function openOnMap(p: SurahProgress) {
    navigation.popTo('MainTabs', {
      screen: 'Map',
      params: p.state === 'in_progress' && p.nextGroupId != null && p.nextLevelIdx != null
        ? { jumpToSurah: p.surah.surah_number, jumpToGroupId: p.nextGroupId, jumpToLevelIdx: p.nextLevelIdx }
        : { jumpToSurah: p.surah.surah_number },
    });
  }

  function renderRow({ item: p, section }: { item: SurahProgress; section: { key: string } }) {
    // Closed rows use the same card as Open and Completed: the bar with the
    // chest, empty, reading 0% (user, 2026-10-13). Nothing completed counts
    // here, so the fraction is 0 even if a first level was started. Not
    // tappable: jumping to a surah is what Search is for.
    const isClosed = section.key === 'closed';
    const fraction = isClosed ? 0 : (p.total ? p.completed / p.total : 0);
    const isDone = p.state === 'completed';
    const isUnavailable = p.state === 'unavailable';
    return (
      <TouchableOpacity
        style={[styles.row, isDone && styles.rowDone]}
        activeOpacity={0.7}
        disabled={isClosed}
        onPress={() => openOnMap(p)}
        accessibilityLabel={`${p.surah.name_en}, ${isUnavailable ? 'progress unavailable' : `${pctLabel(fraction)} done`}`}
      >
        <View style={styles.rowTop}>
          <Text style={styles.numText}>{p.surah.surah_number}</Text>
          <Text style={styles.rowNameEn} numberOfLines={1}>{p.surah.name_en}</Text>
          <Text style={styles.rowNameAr} numberOfLines={1}>{p.surah.name_ar}</Text>
        </View>

        {isUnavailable ? (
          <Text style={styles.unavailableText}>Progress unavailable right now</Text>
        ) : (
          <>
            <Text style={styles.rowMeta}>LESSON AYAH 1-{p.surah.ayah_count}</Text>
            <BarWithChest
              fraction={fraction}
              d={d}
              styles={styles}
              pctGap={0}
              onChest={() => setChestInfoVisible(true)}
            />
            {isDone && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setChestInfoVisible(true)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={styles.claimBtn}
              >
                <Text style={styles.claimText}>CLAIM REWARD</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} style={styles.backBtn} />
        <Text style={styles.headerTitle}>Progress</Text>
        <View style={styles.backBtn} />
      </View>

      {!progress && !error && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.centerText}>Loading your progress</Text>
        </View>
      )}

      {!progress && error && (
        <View style={styles.center}>
          <Text style={styles.centerText}>Couldn't load your progress.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void load(false)}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {progress && summary && (
        <SectionList
          sections={sections}
          keyExtractor={p => String(p.surah.surah_number)}
          renderItem={renderRow}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title} ({section.data.length})</Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: d(24) + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} colors={[colors.primary]} />}
          ListHeaderComponent={
            <View style={styles.summaryWrap}>
              <Text style={styles.summaryTitle}>Al Quran Al kareem</Text>
              <View style={styles.summaryCard}>
                <BarWithChest
                  fraction={summary.fraction}
                  d={d}
                  styles={styles}
                  pctGap={d(13)}
                  onChest={() => setChestInfoVisible(true)}
                />
              </View>
            </View>
          }
        />
      )}

      {/* Neither the per-surah chest nor the overall one is wired to a real
          reward yet -- same honest "coming soon" as SearchSurahsScreen's. */}
      <ChestInfoModal
        visible={chestInfoVisible}
        onClose={() => setChestInfoVisible(false)}
      />
    </View>
  );
}
