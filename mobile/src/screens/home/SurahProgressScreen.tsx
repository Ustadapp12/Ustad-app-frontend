import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SectionList, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useResponsiveScale, safeBottomInset, designScale, type Scale } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';
import { fetchAllSurahProgress, type SurahProgress } from '../../utils/surahProgress';
import ChestInfoModal from '../../components/ChestInfoModal';
import BackButton from '../../components/BackButton';
import RewardChestButton from '../../components/RewardChestButton';
import GlowProgressBar from '../../components/GlowProgressBar';
import StartSurahModal from '../../components/StartSurahModal';

interface Props { navigation: RootNavProp }

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
  metaText: '#6E7571',
  pctText: '#877777',
  rewardPurple: '#905EAF',
  badgeBg: '#FEFCF8',
};

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
  const [confirmClosed, setConfirmClosed] = useState<SurahProgress | null>(null);

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
    navigation.navigate('MainTabs', {
      screen: 'Map',
      params: p.state === 'in_progress' && p.nextGroupId != null && p.nextLevelIdx != null
        ? { jumpToSurah: p.surah.surah_number, jumpToGroupId: p.nextGroupId, jumpToLevelIdx: p.nextLevelIdx }
        : { jumpToSurah: p.surah.surah_number },
    });
  }

  function renderRow({ item: p, section }: { item: SurahProgress; section: { key: string } }) {
    if (section.key === 'closed') {
      // Mirrors Search's closed card, including the "Open {surah}?" confirm.
      return (
        <TouchableOpacity
          style={[styles.row, styles.rowClosed]}
          activeOpacity={0.7}
          onPress={() => setConfirmClosed(p)}
          accessibilityLabel={`${p.surah.name_en}, closed`}
        >
          <View style={styles.rowTop}>
            <Text style={styles.numText}>{p.surah.surah_number}</Text>
            <Text style={styles.rowNameEn} numberOfLines={1}>{p.surah.name_en}</Text>
            <Text style={styles.rowNameAr} numberOfLines={1}>{p.surah.name_ar}</Text>
          </View>
          <Text style={styles.rowMeta}>LESSON AYAH 1-{p.surah.ayah_count}</Text>
          <Text style={styles.jumpHere}>JUMP HERE ▶</Text>
        </TouchableOpacity>
      );
    }

    const fraction = p.total ? p.completed / p.total : 0;
    const isDone = p.state === 'completed';
    const isUnavailable = p.state === 'unavailable';
    return (
      <TouchableOpacity
        style={[styles.row, isDone && styles.rowDone]}
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
        <BackButton onPress={() => navigation.goBack()} style={styles.backBtn} size={d(23)} tintColor={P.backArrow} />
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

      <StartSurahModal
        visible={!!confirmClosed}
        nameEn={confirmClosed?.surah.name_en}
        nameAr={confirmClosed?.surah.name_ar}
        ayahCount={confirmClosed?.surah.ayah_count}
        onConfirm={() => {
          const p = confirmClosed;
          setConfirmClosed(null);
          if (p) openOnMap(p);
        }}
        onCancel={() => setConfirmClosed(null)}
      />

      {/* Neither the per-surah chest nor the overall one is wired to a real
          reward yet -- same honest "coming soon" as SearchSurahsScreen's. */}
      <ChestInfoModal
        visible={chestInfoVisible}
        onClose={() => setChestInfoVisible(false)}
      />
    </View>
  );
}

// Every number is Figma pt from progress_final (440pt frame, 2x export),
// measured, not eyeballed: 100pt cards, 7pt corners, 1pt border, 9.5pt gaps.
function makeStyles(d: Scale) {
  const CHEST = d(43);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: d(22), paddingBottom: d(6),
    },
    backBtn: { width: d(36), height: d(36), alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: 'Nunito-Bold', fontSize: d(19), color: P.headerText },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: d(10), paddingHorizontal: d(24) },
    centerText: { fontFamily: 'Nunito-Regular', fontSize: d(14), color: colors.mutedText, textAlign: 'center' },
    retryBtn: { backgroundColor: colors.primary, borderRadius: d(12), paddingHorizontal: d(20), paddingVertical: d(10) },
    retryText: { fontFamily: 'Nunito-Bold', fontSize: d(14), color: colors.white },
    listContent: { paddingHorizontal: d(26) },

    summaryWrap: { marginTop: d(8) },
    summaryTitle: { fontFamily: 'Nunito-Bold', fontSize: d(19), color: P.nameText, marginBottom: d(4) },
    summaryCard: {
      backgroundColor: colors.white, borderRadius: d(7), borderWidth: 1, borderColor: P.cardBorder,
      paddingLeft: d(34), paddingRight: d(22), paddingVertical: d(1),
    },
    sectionTitle: {
      fontFamily: 'Nunito-Bold', fontSize: d(19), color: P.nameText,
      marginTop: d(18), marginBottom: d(6),
    },

    row: {
      backgroundColor: P.cardBg, borderRadius: d(7), borderWidth: 1, borderColor: P.cardBorder,
      paddingLeft: d(25), paddingRight: d(31), paddingTop: d(9), paddingBottom: d(6),
      marginBottom: d(9.5),
    },
    rowDone: { paddingBottom: d(7) },
    // Closed = not started yet: plain card, same as Search's closed rows.
    rowClosed: { backgroundColor: colors.white, borderColor: colors.border, paddingBottom: d(10) },
    jumpHere: {
      fontFamily: 'Nunito-Bold', fontSize: d(9.5), color: colors.success,
      textAlign: 'right', marginTop: d(6), letterSpacing: d(1),
    },
    rowTop: { flexDirection: 'row', alignItems: 'center', paddingRight: d(19) },
    numText: { width: d(31), fontFamily: 'Nunito-Bold', fontSize: d(9), color: P.headerText },
    rowNameEn: { flex: 1, fontFamily: 'Nunito-Bold', fontSize: d(12.5), color: P.nameText },
    rowNameAr: { fontFamily: 'Nunito-Bold', fontSize: d(15), color: P.nameText },
    rowMeta: {
      fontFamily: 'Nunito-Bold', fontSize: d(9), letterSpacing: d(1), color: P.metaText,
      marginTop: d(2), marginLeft: d(31),
    },
    unavailableText: { fontFamily: 'Nunito-Regular', fontSize: d(11), color: colors.mutedText, marginTop: d(8), marginLeft: d(31) },

    // Bar row: 43pt tall (the chest circle), the 19pt glowing bar centred in
    // it, and the percentage sitting just above the bar's right end.
    barRow: { flexDirection: 'row', alignItems: 'center', height: CHEST, marginTop: d(8) },
    barFlex: { flex: 1 },
    pctText: {
      position: 'absolute', bottom: d(31),
      fontFamily: 'Nunito-Regular', fontSize: d(9), color: P.pctText,
    },
    chestCircle: {
      width: CHEST, height: CHEST, borderRadius: CHEST / 2,
      backgroundColor: P.badgeBg, alignItems: 'center', justifyContent: 'center',
    },
    chestIcon: { width: d(25), height: d(19) },
    claimBtn: { alignSelf: 'flex-end', marginTop: d(1) },
    claimText: {
      fontFamily: 'Nunito-Bold', fontSize: d(9.5), color: P.rewardPurple, letterSpacing: d(1.2),
    },
  });
}
