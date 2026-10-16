import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet,
  FlatList, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useResponsiveScale, safeBottomInset } from '../../utils/responsive';
import { ALL_SURAHS, type SurahListing } from '../../data/allSurahs';
import type { RootNavProp } from '../../navigation/types';
import { learningApi } from '../../api';
import type { LevelStatus } from '../../types/api';
import StartSurahModal from '../../components/StartSurahModal';
import LumoInfoModal from '../../components/LumoInfoModal';
import ChestInfoModal from '../../components/ChestInfoModal';
import BackButton from '../../components/BackButton';
import RewardChestButton from '../../components/RewardChestButton';

interface Props { navigation: RootNavProp }

/**
 * What the user sees per row.
 *
 *   done     every level of the surah is complete
 *   open     the first level is complete, so the surah is genuinely underway
 *   closed   the first level is not complete
 *   unknown  we could not load the status
 *
 * "open" deliberately means "first level DONE", not "first level reachable".
 * The backend never locks a surah's first level (see
 * learning/service.py's get_first_levels_for_surahs: "A surah's first group
 * has no cross-surah gate — never locked"), so every surah is technically
 * startable and an availability-based badge would mark all 114 open and tell
 * the user nothing. Keying off completion is what makes the list answer the
 * question actually being asked: which surahs am I already working on?
 *
 * `unknown` is a first-class state and is never rendered as "closed".
 * statusBySurah starts empty and the fetch can fail, so treating absence as
 * closed would label all 114 surahs closed on any network hiccup — telling a
 * user their finished work is gone, which is the one thing this screen must
 * never do.
 */
type SurahState = 'done' | 'open' | 'closed' | 'unknown';

function normalize(s: string): string {
  return s.toLowerCase().replace(/['-]/g, '').replace(/\s+/g, '');
}

export default function SearchSurahsScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const sc = useResponsiveScale();
  const styles = useMemo(() => makeStyles(sc, insets), [sc, insets]);

  const [query, setQuery] = useState('');
  const [confirmSurah, setConfirmSurah] = useState<SurahListing | null>(null);
  const [rewardInfoVisible, setRewardInfoVisible] = useState(false);
  const [mapInfoVisible, setMapInfoVisible] = useState(false);

  // First-level status for all 114 in one batched call. This alone decides
  // open vs closed, because open means "first level complete".
  const [statusBySurah, setStatusBySurah] = useState<Record<number, LevelStatus>>({});
  // Surahs confirmed fully complete, and the real completed/total fraction for
  // the progress bar. Needs a second pass: firstLevels returns only the FIRST
  // level, so it cannot distinguish "started" from "finished" or say how far
  // in, and there is no per-surah completion endpoint. Resolved lazily and
  // only for surahs whose first level is already complete, which is bounded
  // by how many surahs the user has actually started (small) rather than 114.
  // Never estimated or interpolated — a surah with no entry here simply shows
  // no progress bar, because there is no real number to show one with.
  const [doneSurahs, setDoneSurahs] = useState<Set<number>>(new Set());
  const [progressBySurah, setProgressBySurah] = useState<Record<number, number>>({});
  // 'loading' until the batched call settles. Drives the retry affordance and
  // keeps rows unlabelled rather than wrongly "closed" while in flight.
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');

    (async () => {
      let levels;
      try {
        levels = await learningApi.firstLevels(ALL_SURAHS.map(s => s.surah_number));
      } catch (e) {
        if (cancelled) return;
        // Used to be a bare console.warn, which left every row silently
        // uncoloured and indistinguishable from a real state. Surfaced now,
        // with a retry, because a cold backend start is a normal event here.
        console.warn('[SearchSurahsScreen] first-levels fetch failed:', e);
        setLoadState('failed');
        return;
      }
      if (cancelled) return;

      const map: Record<number, LevelStatus> = {};
      for (const lvl of levels) map[lvl.surah_number] = lvl.status;
      setStatusBySurah(map);
      setLoadState('ready');

      // Second pass, for the "done" refinement and the real progress fraction.
      // Sequential rather than parallel: these are extra round-trips against
      // a cold-start-prone backend and the bar they feed is cosmetic, so they
      // must never stampede it. A failure just leaves the surah showing no
      // progress bar, which is less specific but never claims completion or
      // a percentage it cannot prove.
      const started = Object.entries(map)
        .filter(([, st]) => st === 'completed')
        .map(([n]) => Number(n));

      for (const surahNumber of started) {
        if (cancelled) return;
        try {
          const all = await learningApi.levels(surahNumber);
          if (cancelled) return;
          if (all.length > 0) {
            const completedCount = all.filter(l => l.status === 'completed').length;
            setProgressBySurah(prev => ({ ...prev, [surahNumber]: completedCount / all.length }));
            if (completedCount === all.length) {
              setDoneSurahs(prev => new Set(prev).add(surahNumber));
            }
          }
        } catch {
          // Best-effort by design — see above.
        }
      }
    })();

    return () => { cancelled = true; };
  }, [reloadKey]);

  // The single place a row's badge is decided, so the list and the confirm
  // dialog can never disagree about what state a surah is in.
  const stateFor = React.useCallback((surahNumber: number): SurahState => {
    if (doneSurahs.has(surahNumber)) return 'done';
    const status = statusBySurah[surahNumber];
    if (status === undefined) return loadState === 'ready' ? 'closed' : 'unknown';
    // Anything short of a completed first level is closed: 'available' means
    // merely reachable, which is true of every surah and so says nothing.
    return status === 'completed' ? 'open' : 'closed';
  }, [doneSurahs, statusBySurah, loadState]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return ALL_SURAHS;
    if (/^\d+$/.test(q)) {
      const n = Number(q);
      return ALL_SURAHS.filter(s => s.surah_number === n);
    }
    const nq = normalize(q);
    return ALL_SURAHS.filter(s => normalize(s.name_en).includes(nq) || s.name_ar.includes(q));
  }, [query]);

  // Every one of the 114 is reachable and startable. No readiness list is
  // consulted here: if the backend can't serve a surah yet, the map says so at
  // the tap (see MapScreen's notReadyTap), which keeps this screen correct
  // without needing to know anything about content status.
  //
  // The confirm step is a deliberate speed bump on opening a NEW surah, so
  // starting one is a decision rather than a stray tap. Tapping a surah
  // already underway skips it: re-confirming work you are in the middle of is
  // just friction.
  function handlePress(surah: SurahListing) {
    if (stateFor(surah.surah_number) === 'closed') {
      setConfirmSurah(surah);
      return;
    }
    goToSurah(surah.surah_number);
  }

  function goToSurah(surahNumber: number) {
    navigation.navigate('MainTabs', { screen: 'Map', params: { jumpToSurah: surahNumber } });
  }

  function handleGo() {
    if (!confirmSurah) return;
    const surahNumber = confirmSurah.surah_number;
    setConfirmSurah(null);
    // Takes the user to the surah's first level; it flips to "open" once that
    // level is actually completed. Not marked open here on the tap alone:
    // there is no backend notion of an unlocked-but-unstarted surah, so a
    // local flag would disagree with the map and with this same screen after
    // a reload, and would fill the list with "open" surahs the user never
    // touched — defeating the point of the badge.
    goToSurah(surahNumber);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} style={styles.backBtn} size={sc(20)} />
        <Text style={styles.headerTitle}>Search Surah</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.toolsRow}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by Surah name or number"
            placeholderTextColor={colors.placeholderText}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.mapBtn}
          activeOpacity={0.7}
          onPress={() => setMapInfoVisible(true)}
          accessibilityLabel="Map"
        >
          <Image
            source={require('../../../assets/images/map_feature_button.png')}
            style={styles.mapBtnImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Only shown when the status call actually failed. Without this the
          rows would be silently unlabelled and look like a real state. */}
      {loadState === 'failed' && (
        <TouchableOpacity
          style={styles.statusErrorRow}
          activeOpacity={0.7}
          onPress={() => setReloadKey(k => k + 1)}
          accessibilityLabel="Retry loading surah progress"
        >
          <Text style={styles.statusErrorText}>Couldn't load your progress.</Text>
          <Text style={styles.statusErrorAction}>Retry</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={results}
        keyExtractor={item => String(item.surah_number)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No surah matches "{query}".</Text>
          </View>
        }
        renderItem={({ item }) => {
          const state = stateFor(item.surah_number);
          const progress = progressBySurah[item.surah_number];
          // Only a surah with a real fetched fraction gets the progress-bar
          // card — 'open' and 'done' are exactly the states the second pass
          // above resolves a fraction for. Everything else (closed, or
          // unknown while still loading) gets the plain "jump here" card.
          const hasProgress = progress !== undefined && (state === 'open' || state === 'done');
          const pct = hasProgress ? Math.round(progress * 100) : 0;
          return (
            <TouchableOpacity
              style={[styles.row, hasProgress ? styles.rowActive : styles.rowDefault]}
              activeOpacity={0.7}
              onPress={() => handlePress(item)}
              accessibilityLabel={
                `${item.name_en}, ${item.ayah_count} ayahs${
                  state === 'done' ? ', Done' : state === 'open' ? ', Open' : state === 'closed' ? ', Closed' : ''
                }`
              }
            >
              <View style={[styles.numBadge, hasProgress && styles.numBadgeActive]}>
                <Text style={[styles.numBadgeText, hasProgress && styles.numBadgeTextActive]}>
                  {item.surah_number}
                </Text>
              </View>
              <View style={styles.rowMid}>
                <View style={styles.rowTopLine}>
                  <Text style={styles.rowNameEn} numberOfLines={1}>{item.name_en}</Text>
                  <Text style={styles.rowNameAr} numberOfLines={1}>{item.name_ar}</Text>
                </View>
                <Text style={styles.rowMeta}>LESSON AYAH 1-{item.ayah_count}</Text>

                {hasProgress ? (
                  <View style={styles.progressBlock}>
                    <Text style={styles.progressPct}>{pct}%</Text>
                    <View style={styles.progressBarRow}>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct}%` }]} />
                      </View>
                      <RewardChestButton
                        style={styles.rewardBtn}
                        iconStyle={styles.rewardChest}
                        onPress={() => setRewardInfoVisible(true)}
                      />
                    </View>
                  </View>
                ) : (
                  <Text style={styles.jumpHere}>JUMP HERE ▶</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Only ever shown for a closed surah now — see handlePress. */}
      <StartSurahModal
        visible={!!confirmSurah}
        nameEn={confirmSurah?.name_en}
        nameAr={confirmSurah?.name_ar}
        ayahCount={confirmSurah?.ayah_count}
        onConfirm={handleGo}
        onCancel={() => setConfirmSurah(null)}
      />

      {/* The reward chest on an in-progress card isn't wired to anything real
          yet — this is the honest placeholder until it is. */}
      <ChestInfoModal
        visible={rewardInfoVisible}
        onClose={() => setRewardInfoVisible(false)}
      />

      {/* Same honesty for the Map shortcut — it isn't wired up yet either. */}
      <LumoInfoModal
        visible={mapInfoVisible}
        onClose={() => setMapInfoVisible(false)}
      />
    </View>
  );
}

function makeStyles(sc: (n: number) => number, insets: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: sc(12), paddingBottom: sc(8),
    },
    backBtn: {
      width: sc(36), height: sc(36), borderRadius: sc(18),
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontFamily: 'Nunito-Bold', fontSize: sc(18), color: colors.darkText },
    toolsRow: {
      flexDirection: 'row', alignItems: 'center', gap: sc(8),
      marginHorizontal: sc(16), marginBottom: sc(14),
    },
    statusErrorRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sc(8),
      paddingHorizontal: sc(16), paddingVertical: sc(8), marginHorizontal: sc(16),
      marginBottom: sc(8), borderRadius: sc(10), backgroundColor: colors.lightBg,
      borderWidth: 1, borderColor: colors.border,
    },
    statusErrorText: { fontFamily: 'Nunito-Regular', fontSize: sc(12), color: colors.mutedText },
    statusErrorAction: { fontFamily: 'Nunito-Bold', fontSize: sc(12), color: colors.primary },
    searchWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: sc(8),
      backgroundColor: colors.white, borderRadius: sc(14),
      borderWidth: 1.5, borderColor: colors.border,
      paddingHorizontal: sc(14), paddingVertical: Platform.OS === 'ios' ? sc(12) : sc(6),
    },
    searchIcon: { fontSize: sc(14) },
    searchInput: { flex: 1, fontFamily: 'Nunito-Regular', fontSize: sc(14), color: colors.darkText, padding: 0 },
    clearIcon: { fontSize: sc(14), color: colors.mutedText, paddingHorizontal: sc(2) },
    // Sized off the Figma export's own aspect ratio (74x87) -- the card
    // background, icon and "Map" label are all baked into that asset, so
    // this button no longer draws its own bg/border/text around it.
    mapBtn: {
      width: sc(52), aspectRatio: 74 / 87,
      alignItems: 'center', justifyContent: 'center',
    },
    mapBtnImage: { width: '100%', height: '100%' },
    listContent: { paddingHorizontal: sc(16), paddingBottom: sc(24) + insets.bottom },
    emptyWrap: { alignItems: 'center', paddingTop: sc(48) },
    emptyText: { fontFamily: 'Nunito-Regular', fontSize: sc(13), color: colors.mutedText },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: sc(10),
      borderRadius: sc(14),
      paddingHorizontal: sc(12), paddingVertical: sc(10), marginBottom: sc(10),
      borderWidth: 1.5,
    },
    rowDefault: { backgroundColor: colors.white, borderColor: colors.border },
    rowActive: { backgroundColor: colors.successBg, borderColor: colors.success },
    numBadge: {
      width: sc(26), height: sc(26), borderRadius: sc(13),
      backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    },
    numBadgeActive: { backgroundColor: colors.primaryDark },
    numBadgeText: { fontFamily: 'Nunito-Bold', fontSize: sc(12), color: colors.primary },
    numBadgeTextActive: { color: colors.white },
    rowMid: { flex: 1 },
    rowTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: sc(8) },
    rowNameEn: { flexShrink: 1, fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.darkText },
    rowNameAr: { fontFamily: 'Nunito-Bold', fontSize: sc(15), color: colors.darkText },
    rowMeta: { fontFamily: 'Nunito-Regular', fontSize: sc(10), color: colors.mutedText, marginTop: 2 },
    jumpHere: {
      fontFamily: 'Nunito-Bold', fontSize: sc(11), color: colors.success,
      textAlign: 'right', marginTop: sc(8), letterSpacing: 0.3,
    },
    progressBlock: { marginTop: sc(8) },
    progressPct: { fontFamily: 'Nunito-Bold', fontSize: sc(10), color: colors.success, textAlign: 'right', marginBottom: sc(4) },
    progressBarRow: { flexDirection: 'row', alignItems: 'center', gap: sc(8) },
    progressTrack: {
      flex: 1, height: sc(8), borderRadius: sc(4),
      backgroundColor: colors.border, overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: sc(4), backgroundColor: colors.success },
    rewardBtn: {
      width: sc(32), height: sc(28), borderRadius: sc(8),
      backgroundColor: colors.goldBg, borderWidth: 1.5, borderColor: colors.gold,
      alignItems: 'center', justifyContent: 'center',
    },
    rewardChest: { width: sc(22), height: sc(18) },
  });
}
