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

// Status sort order: open (available/in progress) highest, then locked
// (not reached yet), completed last — per explicit request.
function statusRank(status: LevelStatus | undefined): number {
  if (status === 'available' || status === 'in_progress') return 0;
  if (status === 'completed') return 2;
  return 1; // 'locked' or not yet loaded
}

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

  // Per-surah status (first level's status, same proxy MapScreen already
  // uses elsewhere for "is this surah started/done") — one batched,
  // lightweight call for all 114 rather than one request per row. Purely
  // decorative: a failure here just leaves rows uncolored, never blocks
  // search/start.
  const [statusBySurah, setStatusBySurah] = useState<Record<number, LevelStatus>>({});
  useEffect(() => {
    let cancelled = false;
    learningApi.firstLevels(ALL_SURAHS.map(s => s.surah_number))
      .then(levels => {
        if (cancelled) return;
        const map: Record<number, LevelStatus> = {};
        for (const lvl of levels) map[lvl.surah_number] = lvl.status;
        setStatusBySurah(map);
      })
      .catch(e => console.warn('[SearchSurahsScreen] first-levels fetch failed:', e));
    return () => { cancelled = true; };
  }, []);

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
    // then done — see statusRank) are the ones that change anything.
    if (sortMode === 'size') {
      list = [...list].sort((a, b) => a.ayah_count - b.ayah_count || a.surah_number - b.surah_number);
    } else if (sortMode === 'status') {
      list = [...list].sort((a, b) =>
        statusRank(statusBySurah[a.surah_number]) - statusRank(statusBySurah[b.surah_number])
        || a.surah_number - b.surah_number);
    }
    return list;
  }, [query, sortMode, statusBySurah]);

  // Every one of the 114 is reachable and startable. No readiness list is
  // consulted here: if the backend can't serve a surah yet, the map says so at
  // the tap (see MapScreen's notReadyTap), which keeps this screen correct
  // without needing to know anything about content status.
  function handlePress(surah: SurahListing) {
    setConfirmSurah(surah);
  }

  function handleGo() {
    if (!confirmSurah) return;
    const surahNumber = confirmSurah.surah_number;
    setConfirmSurah(null);
    navigation.navigate('MainTabs', { screen: 'Map', params: { jumpToSurah: surahNumber } });
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
      </View>

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
          const status = statusBySurah[item.surah_number];
          const isDone = status === 'completed';
          const isOpen = status === 'available' || status === 'in_progress';
          const rowColor = isDone
            ? { borderColor: colors.success, backgroundColor: colors.successBg }
            : isOpen
              ? { borderColor: colors.goldBorder, backgroundColor: colors.goldBg }
              : null;
          const badgeColor = isDone
            ? { backgroundColor: colors.successBg }
            : isOpen
              ? { backgroundColor: colors.goldBg }
              : null;
          const badgeTextColor = isDone
            ? { color: colors.success }
            : isOpen
              ? { color: colors.goldDark }
              : null;
          return (
            <TouchableOpacity style={[styles.row, rowColor]} activeOpacity={0.7} onPress={() => handlePress(item)}>
              <View style={[styles.numBadge, badgeColor]}>
                <Text style={[styles.numBadgeText, badgeTextColor]}>{item.surah_number}</Text>
              </View>
              <View style={styles.rowMid}>
                <Text style={styles.rowNameEn} numberOfLines={1}>{item.name_en}</Text>
                <Text style={styles.rowMeta}>{item.ayah_count} ayahs</Text>
              </View>
              <Text style={styles.rowNameAr} numberOfLines={1}>{item.name_ar}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Confirmation. Same destination either way; only the promise differs. */}
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
