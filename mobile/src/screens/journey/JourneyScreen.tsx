import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { contentApi } from '../../api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { copy } from '../../i18n/copy';
import type { SurahBrief } from '../../types/api';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Journey'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function JourneyScreen({ navigation }: Props) {
  const [surahs, setSurahs] = useState<SurahBrief[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentApi
      .surahs(30, true)
      .then(setSurahs)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="h1" style={styles.header}>
        {copy.journey.juzTitle}
      </AppText>
      <ScrollView contentContainerStyle={styles.scroll}>
        {surahs.map(s => (
          <Pressable
            key={s.surah_number}
            style={styles.surahCard}
            onPress={() =>
              navigation.navigate('SurahLevels', {
                surahNumber: s.surah_number,
                nameEn: s.name_en,
              })
            }>
            <AppText variant="h2">{s.name_en}</AppText>
            <AppText variant="caption">
              {s.name_ar} · {s.ayah_count} ayahs
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: spacing.screenHorizontal, paddingTop: spacing.lg },
  scroll: { padding: spacing.screenHorizontal, paddingBottom: spacing.xl },
  surahCard: {
    backgroundColor: colors.ash,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});
