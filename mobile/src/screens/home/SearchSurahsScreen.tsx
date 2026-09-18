import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet,
  FlatList, Modal, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useResponsiveScale, safeBottomInset } from '../../utils/responsive';
import { ALL_SURAHS, type SurahListing } from '../../data/allSurahs';
import type { RootNavProp } from '../../navigation/types';

interface Props { navigation: RootNavProp }

type SortMode = 'order' | 'size';

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
    // only 'size' (ayah count, shortest first) changes anything.
    if (sortMode === 'size') {
      list = [...list].sort((a, b) => a.ayah_count - b.ayah_count || a.surah_number - b.surah_number);
    }
    return list;
  }, [query, sortMode]);

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
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => handlePress(item)}>
            <View style={styles.numBadge}>
              <Text style={styles.numBadgeText}>{item.surah_number}</Text>
            </View>
            <View style={styles.rowMid}>
              <Text style={styles.rowNameEn} numberOfLines={1}>{item.name_en}</Text>
              <Text style={styles.rowMeta}>{item.ayah_count} ayahs</Text>
            </View>
            <Text style={styles.rowNameAr} numberOfLines={1}>{item.name_ar}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Confirmation. Same destination either way; only the promise differs. */}
      <Modal visible={!!confirmSurah} transparent animationType="fade" onRequestClose={() => setConfirmSurah(null)}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Start {confirmSurah?.name_en}?</Text>
            <Text style={styles.cardBody}>
              {confirmSurah?.name_ar} · {confirmSurah?.ayah_count} ayahs{'\n'}
              You'll begin at the first level of this surah on the map.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleGo}>
              <Text style={styles.primaryBtnText}>Start Surah</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissBtn} onPress={() => setConfirmSurah(null)}>
              <Text style={styles.dismissBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    card: {
      backgroundColor: colors.white, borderRadius: 20, padding: 24, width: '100%',
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12,
    },
    cardTitle: { fontFamily: 'Nunito-Bold', fontSize: 18, color: colors.darkText, marginBottom: 8 },
    cardBody: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.mutedText, lineHeight: 20, marginBottom: 20 },
    primaryBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    primaryBtnText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.white },
    dismissBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    dismissBtnText: { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.mutedText },
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
