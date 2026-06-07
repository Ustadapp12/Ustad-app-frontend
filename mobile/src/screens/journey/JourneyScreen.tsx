import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { SurahBanner } from '../../components/journey/SurahBanner';
import { JourneyTopBar } from '../../components/ui/JourneyTopBar';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { contentApi } from '../../api';
import { loadSurahs } from '../../services/cachedContent';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { copy } from '../../i18n/copy';
import {
  mergeMvpCatalog,
  sortSurahsForJourney,
  filterToMvpSurahs,
} from '../../utils/surahCatalog';
import { displaySurahNameAr } from '../../utils/surahDisplay';
import { warmAudioUrlCache } from '../../services/audioUrls';
import { useAuthStore } from '../../store/authStore';
import type { SurahBrief } from '../../types/api';
import type { RootStackParamList } from '../../navigation/types';

// JourneyScreen is no longer a tab — kept for reference. HomeScreen now owns the level path map.
type Props = {
  navigation: NativeStackScreenProps<RootStackParamList>['navigation'];
};

export function JourneyScreen({ navigation }: Props) {
  const learning = useAuthStore(s => s.learning);
  const [surahs, setSurahs] = useState<SurahBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SurahBrief[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (force = false) => {
    setApiError(false);
    try {
      const [fromApi] = await Promise.all([
        loadSurahs(30, true, { force }),
        warmAudioUrlCache(),
      ]);
      const merged = mergeMvpCatalog(fromApi);
      const mvp = filterToMvpSurahs(
        merged,
        useAuthStore.getState().learning?.mvp_surah_numbers,
      );
      setSurahs(sortSurahsForJourney(mvp));
    } catch {
      setApiError(true);
      const fallback = sortSurahsForJourney(mergeMvpCatalog([]));
      setSurahs(fallback);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = null;
      }
    };
  }, []);

  const handleSearchChange = (text: string) => {
    setQuery(text);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    if (!text.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await contentApi.search(text.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const displayedSurahs = searchResults !== null ? searchResults : surahs;

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.yellow} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <IrabBackground />
      <JourneyTopBar
        streak={learning?.current_streak}
        xp={learning?.xp_total}
        hearts={learning?.hearts_remaining}
        gems={learning?.gem_balance}
      />

      <AppText style={styles.juzLabel}>{copy.journey.juzTitle}</AppText>
      <AppText style={styles.juzSub}>
        {copy.journey.mvpSubtitle(surahs.length)}
      </AppText>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleSearchChange}
          placeholder="Search surahs..."
          placeholderTextColor={colors.grey}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searching ? (
          <ActivityIndicator color={colors.yellow} style={styles.searchSpinner} />
        ) : null}
      </View>

      {apiError ? (
        <Pressable style={styles.apiBanner} onPress={() => load(true)}>
          <AppText style={styles.apiBannerText}>
            Cannot reach the API — showing offline surah list. Tap to retry.
          </AppText>
        </Pressable>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            tintColor={colors.yellow}
          />
        }>
        {displayedSurahs.length === 0 && query.trim() ? (
          <View style={styles.noResults}>
            <AppText style={styles.noResultsText}>No surahs found for "{query}"</AppText>
          </View>
        ) : null}
        {displayedSurahs.map(s => (
          <Pressable
            key={s.surah_number}
            onPress={() =>
              navigation.navigate('SurahLevels', {
                surahNumber: s.surah_number,
                nameEn: s.name_en,
                nameAr: displaySurahNameAr(s.surah_number, s.name_ar),
              })
            }>
            <SurahBanner surah={s} />
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark },
  center: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  juzLabel: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 18,
    paddingHorizontal: spacing.screenHorizontal,
    marginTop: spacing.xs,
  },
  juzSub: {
    color: colors.grey,
    fontSize: 12,
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  apiBanner: {
    marginHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: 10,
    backgroundColor: 'rgba(233, 196, 104, 0.15)',
    borderWidth: 1,
    borderColor: colors.yellow,
  },
  apiBannerText: {
    color: colors.yellow,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: spacing.sm,
  },
  searchSpinner: { marginLeft: spacing.sm },
  scroll: { paddingBottom: spacing.xl },
  noResults: { padding: spacing.lg, alignItems: 'center' },
  noResultsText: { color: colors.grey, fontWeight: '600', fontSize: 14, textAlign: 'center', flexShrink: 1 },
});
