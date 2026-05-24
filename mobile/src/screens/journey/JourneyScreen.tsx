import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { SurahBanner } from '../../components/journey/SurahBanner';
import { JourneyTopBar } from '../../components/ui/JourneyTopBar';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { contentApi } from '../../api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { copy } from '../../i18n/copy';
import {
  mergeMvpCatalog,
  sortSurahsForJourney,
  filterToMvpSurahs,
} from '../../utils/surahCatalog';
import { loadReciters } from '../../services/reciters';
import { useAuthStore } from '../../store/authStore';
import type { SurahBrief } from '../../types/api';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Journey'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function JourneyScreen({ navigation }: Props) {
  const learning = useAuthStore(s => s.learning);
  const [surahs, setSurahs] = useState<SurahBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setApiError(false);
    try {
      await loadReciters();
      const fromApi = await contentApi.surahs(30, true);
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

  useFocusEffect(
    useCallback(() => {
      useAuthStore.getState().refreshLearning();
    }, []),
  );

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

      {apiError ? (
        <Pressable style={styles.apiBanner} onPress={load}>
          <AppText style={styles.apiBannerText}>
            Cannot reach the API — showing offline surah list. Tap to retry.
          </AppText>
        </Pressable>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.yellow}
          />
        }>
        {surahs.map(s => (
          <Pressable
            key={s.surah_number}
            onPress={() =>
              navigation.navigate('SurahLevels', {
                surahNumber: s.surah_number,
                nameEn: s.name_en,
                nameAr: s.name_ar,
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
  },
  scroll: { paddingBottom: spacing.xl },
});
