import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { useResponsiveScale, safeBottomInset } from '../../utils/responsive';
import { ALL_SURAHS, type SurahListing } from '../../data/allSurahs';
import type { RootNavProp } from '../../navigation/types';
import StartSurahModal from '../../components/StartSurahModal';
import LumoInfoModal from '../../components/LumoInfoModal';
import ChestInfoModal from '../../components/ChestInfoModal';
import BackButton from '../../components/BackButton';
import RewardChestButton from '../../components/RewardChestButton';
import JumpHereLabel from './JumpHereLabel';
import { makeStyles } from './SearchSurahsScreen.styles';
import { HOME_IMAGES } from '../../assets';
import { useSurahStatuses } from '../../hooks/api';

interface Props { navigation: RootNavProp }


function normalize(s: string): string {
  return s.toLowerCase().replace(/['-]/g, '').replace(/\s+/g, '');
}

export default function SearchSurahsScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  // Keyed on the bottom inset number, not an insets object: a fresh object
  // every render rebuilt the style sheet on every keystroke (review 5.4).
  const bottomInset = safeBottomInset(rawInsets.bottom);
  const sc = useResponsiveScale();
  const styles = useMemo(() => makeStyles(sc, { bottom: bottomInset }), [sc, bottomInset]);

  const [query, setQuery] = useState('');
  const [confirmSurah, setConfirmSurah] = useState<SurahListing | null>(null);
  const [rewardInfoVisible, setRewardInfoVisible] = useState(false);
  const [mapInfoVisible, setMapInfoVisible] = useState(false);

  // Per-surah open/closed/done state and progress (hooks/api/useSurahStatuses).
  const { stateFor, progressBySurah, loadState, reload } = useSurahStatuses();

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
    navigation.popTo('MainTabs', { screen: 'Map', params: { jumpToSurah: surahNumber } });
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
    <View style={[styles.container, { paddingTop: rawInsets.top }]}>
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
            source={HOME_IMAGES.mapFeatureButton}
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
          onPress={reload}
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
          // An open or finished surah opens from anywhere on its card. Any
          // other (closed, or still loading) opens only from its JUMP HERE
          // button, so a stray tap on the card can't start a new surah
          // (2026-10-22, on request).
          const cardOpens = state === 'open' || state === 'done';
          return (
            <TouchableOpacity
              style={[styles.row, hasProgress ? styles.rowActive : styles.rowDefault]}
              activeOpacity={0.7}
              disabled={!cardOpens}
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
                  cardOpens ? (
                    // Open, progress still loading: the whole card is the
                    // button, so this is just its label.
                    <View style={styles.jumpHereBtn}>
                      <JumpHereLabel style={styles.jumpHere} />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.jumpHereBtn}
                      activeOpacity={0.6}
                      onPress={() => handlePress(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Jump to ${item.name_en}`}
                    >
                      <JumpHereLabel style={styles.jumpHere} />
                    </TouchableOpacity>
                  )
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
