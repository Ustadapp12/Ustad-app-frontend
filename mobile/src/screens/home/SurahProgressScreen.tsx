import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SectionList,
  ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useResponsiveScale, safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';
import { fetchAllSurahProgress, type SurahProgress } from '../../utils/surahProgress';
import ChestInfoModal from '../../components/ChestInfoModal';
import BackButton from '../../components/BackButton';
import RewardChestButton from '../../components/RewardChestButton';

interface Props { navigation: RootNavProp }

type Scale = (n: number) => number;

// Local to this screen only: the new mock (Figma "Landing Page" file, node
// 1147:9713's sibling Progress frame) uses a neutral gray/green/purple
// palette sampled pixel-for-pixel from the designer's export, distinct from
// the app's usual navy-tinted darkText/mutedText. Scoped here rather than
// folded into theme/colors.ts because nothing else in the app uses it yet —
// promote it later if more screens pick up the same look.
const P = {
  headerText: '#5A5D68',
  backArrow: '#AFAFAF',
  cardBg: '#D9EFE1',
  cardBorder: colors.levelStartAccent, // #00855D -- exact match, no new token needed
  track: '#D9D1C2',
  fill: '#24B874',
  nameText: '#404040',
  metaText: '#96A39B',
  rewardPurple: '#9467B2',
  badgeBg: '#FEFCF8',
};

// Real progress should never read as 0%, and unfinished work never as 100%.
function pctLabel(fraction: number): string {
  if (fraction > 0 && fraction < 0.01) return '<1%';
  if (fraction < 1 && fraction > 0.99) return '99%';
  return `${Math.round(fraction * 100)}%`;
}

function ProgressBar({ fraction, sc }: { fraction: number; sc: Scale }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: fraction, duration: 600, useNativeDriver: false }).start();
  }, [anim, fraction]);
  return (
    <View style={{ height: sc(10), borderRadius: sc(5), backgroundColor: P.track, overflow: 'hidden' }}>
      <Animated.View
        style={{
          height: '100%', borderRadius: sc(5), backgroundColor: P.fill,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

export default function SurahProgressScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const sc = useResponsiveScale();
  const styles = useMemo(() => makeStyles(sc), [sc]);

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

  // 'Not started' is deliberately left out of what's rendered -- the new
  // design only has "In progress" and "Completed" sections. A page titled
  // Progress listing all 114 surahs including the ones never touched just
  // duplicates the Search screen; still computed from real data, just not
  // shown here.
  const sections = useMemo(() => {
    if (!progress) return [];
    const pct = (p: SurahProgress) => (p.total ? p.completed / p.total : 0);
    const inProgress = progress
      .filter(p => p.state === 'in_progress' || p.state === 'unavailable')
      .sort((a, b) => pct(b) - pct(a) || b.surah.surah_number - a.surah.surah_number);
    const done = progress.filter(p => p.state === 'completed')
      .sort((a, b) => b.surah.surah_number - a.surah.surah_number);
    return [
      { title: 'In Progress', data: inProgress },
      { title: 'Completed', data: done },
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
    navigation.navigate('MainTabs', {
      screen: 'Map',
      params: p.state === 'in_progress' && p.nextGroupId != null && p.nextLevelIdx != null
        ? { jumpToSurah: p.surah.surah_number, jumpToGroupId: p.nextGroupId, jumpToLevelIdx: p.nextLevelIdx }
        : { jumpToSurah: p.surah.surah_number },
    });
  }

  function renderRow({ item: p }: { item: SurahProgress }) {
    const fraction = p.total ? p.completed / p.total : 0;
    const isDone = p.state === 'completed';
    const isUnavailable = p.state === 'unavailable';
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
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
            <View style={styles.progressBlock}>
              <Text style={styles.pctText}>{pctLabel(fraction)}</Text>
              <View style={styles.progressBarRow}>
                <View style={styles.progressBarFill}>
                  <ProgressBar fraction={fraction} sc={sc} />
                </View>
                <RewardChestButton
                  style={styles.rewardBtn}
                  iconStyle={styles.rewardChest}
                  onPress={() => setChestInfoVisible(true)}
                />
              </View>
            </View>
            {isDone && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setChestInfoVisible(true)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={styles.claimRow}
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
        <BackButton onPress={() => navigation.goBack()} style={styles.backBtn} size={sc(20)} tintColor={P.backArrow} />
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
          contentContainerStyle={[styles.listContent, { paddingBottom: sc(24) + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} colors={[colors.primary]} />}
          ListHeaderComponent={
            <View style={styles.summaryWrap}>
              <Text style={styles.summaryTitle}>Al Quran Al kareem</Text>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryPct}>{pctLabel(summary.fraction)}</Text>
                <View style={styles.summaryBarRow}>
                  <View style={styles.progressBarFill}>
                    <ProgressBar fraction={summary.fraction} sc={sc} />
                  </View>
                  <RewardChestButton
                    style={styles.rewardBtn}
                    iconStyle={styles.rewardChest}
                    onPress={() => setChestInfoVisible(true)}
                  />
                </View>
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

function makeStyles(sc: Scale) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: sc(12), paddingBottom: sc(8),
    },
    backBtn: { width: sc(36), height: sc(36), borderRadius: sc(18), alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: 'Nunito-Bold', fontSize: sc(18), color: P.headerText },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: sc(10), paddingHorizontal: sc(24) },
    centerText: { fontFamily: 'Nunito-Regular', fontSize: sc(14), color: colors.mutedText, textAlign: 'center' },
    retryBtn: { backgroundColor: colors.primary, borderRadius: sc(12), paddingHorizontal: sc(20), paddingVertical: sc(10) },
    retryText: { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.white },
    listContent: { paddingHorizontal: sc(16) },
    summaryWrap: { marginBottom: sc(14) },
    summaryTitle: {
      fontFamily: 'Nunito-Bold', fontSize: sc(17), color: P.nameText, marginBottom: sc(10),
    },
    summaryCard: {
      backgroundColor: colors.white, borderRadius: sc(14), borderWidth: 1.5, borderColor: P.cardBorder,
      paddingHorizontal: sc(14), paddingVertical: sc(12),
    },
    summaryPct: {
      fontFamily: 'Nunito-Bold', fontSize: sc(11), color: colors.mutedText,
      textAlign: 'right', marginBottom: sc(4),
    },
    summaryBarRow: { flexDirection: 'row', alignItems: 'center', gap: sc(8) },
    sectionTitle: {
      fontFamily: 'Nunito-Bold', fontSize: sc(17), color: P.nameText,
      marginTop: sc(16), marginBottom: sc(10),
    },
    row: {
      backgroundColor: P.cardBg, borderRadius: sc(16),
      paddingHorizontal: sc(14), paddingVertical: sc(12), marginBottom: sc(10),
      borderWidth: 1.5, borderColor: P.cardBorder,
    },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: sc(8) },
    numText: { fontFamily: 'Nunito-Bold', fontSize: sc(13), color: P.headerText },
    rowNameEn: { flex: 1, fontFamily: 'Nunito-Bold', fontSize: sc(14), color: P.nameText },
    rowNameAr: { fontFamily: 'Nunito-Bold', fontSize: sc(15), color: P.nameText },
    rowMeta: { fontFamily: 'Nunito-Regular', fontSize: sc(10), color: P.metaText, marginTop: sc(4), marginLeft: sc(22) },
    unavailableText: { fontFamily: 'Nunito-Regular', fontSize: sc(11), color: colors.mutedText, marginTop: sc(8), marginLeft: sc(22) },
    progressBlock: { marginTop: sc(10) },
    pctText: { fontFamily: 'Nunito-Bold', fontSize: sc(10), color: colors.mutedText, textAlign: 'right', marginBottom: sc(4) },
    progressBarRow: { flexDirection: 'row', alignItems: 'center', gap: sc(8) },
    progressBarFill: { flex: 1 },
    rewardBtn: {
      width: sc(32), height: sc(28), borderRadius: sc(14),
      backgroundColor: P.badgeBg, alignItems: 'center', justifyContent: 'center',
    },
    rewardChest: { width: sc(22), height: sc(18) },
    claimRow: { alignItems: 'flex-end', marginTop: sc(8) },
    claimText: {
      fontFamily: 'Nunito-Bold', fontSize: sc(11), color: P.rewardPurple, letterSpacing: 0.4,
    },
  });
}
