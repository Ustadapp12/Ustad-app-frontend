import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet,
  FlatList, Modal, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useResponsiveScale, safeBottomInset } from '../../utils/responsive';
import { ALL_SURAHS, type SurahListing } from '../../data/allSurahs';
import type { RootNavProp } from '../../navigation/types';
import { learningApi } from '../../api';
import type { LevelStatus } from '../../types/api';
import StartSurahModal from '../../components/StartSurahModal';

interface Props { navigation: RootNavProp }

type SortMode = 'order' | 'size' | 'status';

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

// Sort order: in-progress work first (open), then unstarted (closed), then
// finished (done), with unknown parked with closed since we cannot say better.
const STATE_RANK: Record<SurahState, number> = {
  open: 0,
  closed: 1,
  unknown: 1,
  done: 2,
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/['-]/g, '').replace(/\s+/g, '');
}

export default function SearchSurahsScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const sc = useResponsiveScale();
  const styles = useMemo(() => makeStyles(sc, insets), [sc, insets]);

  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('order');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [sortAnchorY, setSortAnchorY] = useState(0);
  const [confirmSurah, setConfirmSurah] = useState<SurahListing | null>(null);

  // First-level status for all 114 in one batched call. This alone decides
  // open vs closed, because open means "first level complete".
  const [statusBySurah, setStatusBySurah] = useState<Record<number, LevelStatus>>({});
  // Surahs confirmed fully complete. Needs a second pass: firstLevels returns
  // only the FIRST level, so it cannot distinguish "started" from "finished",
  // and there is no per-surah completion endpoint. Resolved lazily and only
  // for surahs whose first level is already complete, which is bounded by how
  // many surahs the user has actually started (small) rather than 114.
  const [doneSurahs, setDoneSurahs] = useState<Set<number>>(new Set());
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

      // Second pass, for the "done" refinement only. Sequential rather than
      // parallel: these are extra round-trips against a cold-start-prone
      // backend and the badge they refine is cosmetic, so they must never
      // stampede it. A failure just leaves the surah showing "open", which is
      // true but less specific, and never claims completion it cannot prove.
      const started = Object.entries(map)
        .filter(([, st]) => st === 'completed')
        .map(([n]) => Number(n));

      for (const surahNumber of started) {
        if (cancelled) return;
        try {
          const all = await learningApi.levels(surahNumber);
          if (cancelled) return;
          if (all.length > 0 && all.every(l => l.status === 'completed')) {
            setDoneSurahs(prev => new Set(prev).add(surahNumber));
          }
        } catch {
          // Best-effort by design — see above.
        }
      }
    })();

    return () => { cancelled = true; };
  }, [reloadKey]);

  // The single place a row's badge is decided, so the list, the sort and the
  // confirm dialog can never disagree about what state a surah is in.
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
    let list: SurahListing[];
    if (!q) list = ALL_SURAHS;
    else if (/^\d+$/.test(q)) {
      const n = Number(q);
      list = ALL_SURAHS.filter(s => s.surah_number === n);
    } else {
      const nq = normalize(q);
      list = ALL_SURAHS.filter(s => normalize(s.name_en).includes(nq) || s.name_ar.includes(q));
    }
    // ALL_SURAHS is already surah-number order, so 'order' needs no re-sort —
    // 'size' (ayah count, shortest first) and 'status' (open, then locked,
    // then done — see STATE_RANK) are the ones that change anything.
    if (sortMode === 'size') {
      list = [...list].sort((a, b) => a.ayah_count - b.ayah_count || a.surah_number - b.surah_number);
    } else if (sortMode === 'status') {
      list = [...list].sort((a, b) =>
        STATE_RANK[stateFor(a.surah_number)] - STATE_RANK[stateFor(b.surah_number)]
        || a.surah_number - b.surah_number);
    }
    return list;
  }, [query, sortMode, stateFor]);

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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Back"
        >
          <Image source={require('../../../assets/back_arrow.png')} style={styles.backIcon} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Surahs</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.toolsRow} onLayout={e => setSortAnchorY(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or number"
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
          style={styles.sortBtn}
          activeOpacity={0.7}
          onPress={() => setSortMenuVisible(true)}
          accessibilityLabel="Sort"
        >
          <Text style={styles.sortBtnText}>⇅</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.gold, borderColor: colors.goldDark }]} />
          <Text style={styles.legendLabel}>Open</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success, borderColor: colors.primaryDark }]} />
          <Text style={styles.legendLabel}>Done</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.border, borderColor: colors.borderDark }]} />
          <Text style={styles.legendLabel}>Closed</Text>
        </View>
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
          const isClosed = state === 'closed';
          const rowColor = state === 'done'
            ? { borderColor: colors.success, backgroundColor: colors.successBg }
            : state === 'open'
              ? { borderColor: colors.goldBorder, backgroundColor: colors.goldBg }
              : isClosed
                ? { borderColor: colors.border, backgroundColor: colors.lightBg }
                : null;
          const badgeColor = state === 'done'
            ? { backgroundColor: colors.successBg }
            : state === 'open'
              ? { backgroundColor: colors.goldBg }
              : isClosed
                ? { backgroundColor: colors.border }
                : null;
          const badgeTextColor = state === 'done'
            ? { color: colors.success }
            : state === 'open'
              ? { color: colors.goldDark }
              : isClosed
                ? { color: colors.mutedText }
                : null;
          // 'unknown' gets no tag at all, so a failed or in-flight status
          // load can never be read as a real state.
          const tag = state === 'done' ? 'Done' : state === 'open' ? 'Open' : isClosed ? 'Closed' : null;
          const tagStyle = state === 'done'
            ? styles.tagDone
            : state === 'open'
              ? styles.tagOpen
              : styles.tagClosed;
          return (
            <TouchableOpacity
              style={[styles.row, rowColor]}
              activeOpacity={0.7}
              onPress={() => handlePress(item)}
              accessibilityLabel={
                `${item.name_en}, ${item.ayah_count} ayahs${tag ? `, ${tag}` : ''}`
              }
            >
              <View style={[styles.numBadge, badgeColor]}>
                <Text style={[styles.numBadgeText, badgeTextColor]}>{item.surah_number}</Text>
              </View>
              <View style={styles.rowMid}>
                {/* Greyed text, not just a greyed border, so "closed" reads at
                    a glance while scanning rather than needing the tag. */}
                <Text
                  style={[styles.rowNameEn, isClosed && styles.rowTextClosed]}
                  numberOfLines={1}
                >
                  {item.name_en}
                </Text>
                <View style={styles.rowMetaLine}>
                  <Text style={styles.rowMeta}>{item.ayah_count} ayahs</Text>
                  {tag && <Text style={[styles.tag, tagStyle]}>{tag}</Text>}
                </View>
              </View>
              <Text
                style={[styles.rowNameAr, isClosed && styles.rowTextClosed]}
                numberOfLines={1}
              >
                {item.name_ar}
              </Text>
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

      {/* Sort menu — a small anchored popover (iOS-style), not a full dialog:
          tapping an option applies it and closes immediately, no Cancel. */}
      <Modal visible={sortMenuVisible} transparent animationType="fade" onRequestClose={() => setSortMenuVisible(false)}>
        <TouchableOpacity style={styles.popoverBackdrop} activeOpacity={1} onPress={() => setSortMenuVisible(false)}>
          <View style={[styles.popover, { top: sortAnchorY + sc(4), right: sc(16) }]}>
            <TouchableOpacity
              style={styles.popoverOption}
              activeOpacity={0.6}
              onPress={() => { setSortMode('order'); setSortMenuVisible(false); }}
            >
              <Text style={styles.popoverOptionText}>Order</Text>
              {sortMode === 'order' && <Text style={styles.popoverCheck}>✓</Text>}
            </TouchableOpacity>
            <View style={styles.popoverDivider} />
            <TouchableOpacity
              style={styles.popoverOption}
              activeOpacity={0.6}
              onPress={() => { setSortMode('size'); setSortMenuVisible(false); }}
            >
              <Text style={styles.popoverOptionText}>Size</Text>
              {sortMode === 'size' && <Text style={styles.popoverCheck}>✓</Text>}
            </TouchableOpacity>
            <View style={styles.popoverDivider} />
            <TouchableOpacity
              style={styles.popoverOption}
              activeOpacity={0.6}
              onPress={() => { setSortMode('status'); setSortMenuVisible(false); }}
            >
              <Text style={styles.popoverOptionText}>Status</Text>
              {sortMode === 'status' && <Text style={styles.popoverCheck}>✓</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    backIcon: { width: sc(20), height: sc(20), tintColor: colors.darkText },
    headerTitle: { fontFamily: 'Nunito-Bold', fontSize: sc(18), color: colors.darkText },
    toolsRow: {
      flexDirection: 'row', alignItems: 'center', gap: sc(8),
      marginHorizontal: sc(16), marginBottom: sc(10),
    },
    legendRow: {
      flexDirection: 'row', alignItems: 'center', gap: sc(16),
      marginHorizontal: sc(16), marginBottom: sc(10),
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: sc(6) },
    legendDot: { width: sc(10), height: sc(10), borderRadius: sc(5), borderWidth: 1.5 },
    legendLabel: { fontFamily: 'Nunito-Regular', fontSize: sc(12), color: colors.mutedText },
    statusErrorRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sc(8),
      paddingHorizontal: sc(16), paddingVertical: sc(8), marginHorizontal: sc(16),
      marginBottom: sc(8), borderRadius: sc(10), backgroundColor: colors.lightBg,
      borderWidth: 1, borderColor: colors.border,
    },
    statusErrorText: { fontFamily: 'Nunito-Regular', fontSize: sc(12), color: colors.mutedText },
    statusErrorAction: { fontFamily: 'Nunito-Bold', fontSize: sc(12), color: colors.primary },
    rowMetaLine: { flexDirection: 'row', alignItems: 'center', gap: sc(6), marginTop: 2 },
    tag: {
      fontFamily: 'Nunito-Bold', fontSize: sc(9), overflow: 'hidden',
      paddingHorizontal: sc(6), paddingVertical: sc(1), borderRadius: sc(4),
      textTransform: 'uppercase', letterSpacing: 0.3,
    },
    tagDone: { color: colors.success, backgroundColor: colors.successBg },
    tagOpen: { color: colors.goldDark, backgroundColor: colors.goldBg },
    tagClosed: { color: colors.mutedText, backgroundColor: colors.border },
    rowTextClosed: { color: colors.mutedText },
    searchWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: sc(8),
      backgroundColor: colors.white, borderRadius: sc(14),
      borderWidth: 1.5, borderColor: colors.border,
      paddingHorizontal: sc(14), paddingVertical: Platform.OS === 'ios' ? sc(12) : sc(6),
    },
    searchIcon: { fontSize: sc(14) },
    searchInput: { flex: 1, fontFamily: 'Nunito-Regular', fontSize: sc(14), color: colors.darkText, padding: 0 },
    clearIcon: { fontSize: sc(14), color: colors.mutedText, paddingHorizontal: sc(2) },
    sortBtn: {
      width: sc(44), height: sc(44), borderRadius: sc(14),
      backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    sortBtnText: { fontSize: sc(16), color: colors.primary, fontFamily: 'Nunito-Bold' },
    listContent: { paddingHorizontal: sc(16), paddingBottom: sc(24) + insets.bottom },
    emptyWrap: { alignItems: 'center', paddingTop: sc(48) },
    emptyText: { fontFamily: 'Nunito-Regular', fontSize: sc(13), color: colors.mutedText },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: sc(10),
      backgroundColor: colors.white, borderRadius: sc(14),
      paddingHorizontal: sc(12), paddingVertical: sc(10), marginBottom: sc(8),
      borderWidth: 1.5, borderColor: colors.border,
    },
    numBadge: {
      width: sc(30), height: sc(30), borderRadius: sc(15),
      backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    },
    numBadgeText: { fontFamily: 'Nunito-Bold', fontSize: sc(12), color: colors.primary },
    rowMid: { flex: 1 },
    rowNameEn: { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.darkText },
    rowMeta: { fontFamily: 'Nunito-Regular', fontSize: sc(11), color: colors.mutedText, marginTop: 2 },
    rowNameAr: { fontFamily: 'Nunito-Bold', fontSize: sc(15), color: colors.darkText },
    popoverBackdrop: { flex: 1 },
    popover: {
      position: 'absolute', minWidth: sc(160),
      backgroundColor: colors.white, borderRadius: sc(14), paddingVertical: sc(4),
      borderWidth: 1, borderColor: colors.border,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    },
    popoverOption: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: sc(12),
      paddingHorizontal: sc(14), paddingVertical: sc(11),
    },
    popoverOptionText: { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.darkText },
    popoverCheck: { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.primary },
    popoverDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: sc(8) },
  });
}
