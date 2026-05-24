import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { LevelNode, nodeAlignForIndex } from '../../components/journey/LevelNode';
import { learningApi } from '../../api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { copy } from '../../i18n/copy';
import type { SurahLevel } from '../../types/api';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SurahLevels'>;

export function SurahLevelsScreen({ route, navigation }: Props) {
  const { surahNumber, nameEn, nameAr } = route.params;
  const [levels, setLevels] = useState<SurahLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    learningApi
      .levels(surahNumber)
      .then(setLevels)
      .catch(() => {
        setError(true);
        setLevels([]);
      })
      .finally(() => setLoading(false));
  }, [surahNumber]);

  const completedCount = levels.filter(l => l.status === 'completed').length;
  const progressPct =
    levels.length > 0 ? (completedCount / levels.length) * 100 : 0;

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.banner}>
        <View style={styles.bannerRow}>
          <View>
            <AppText style={styles.bannerEn}>{nameEn}</AppText>
            <AppText style={styles.bannerMeta}>
              Surah {surahNumber} · {levels.length} levels
            </AppText>
            {levels.length > 0 ? (
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${progressPct}%` }]}
                />
              </View>
            ) : null}
          </View>
          {nameAr ? (
            <AppText style={styles.bannerAr}>{nameAr}</AppText>
          ) : null}
        </View>
      </View>

      {error || levels.length === 0 ? (
        <View style={styles.empty}>
          <AppText style={styles.emptyTitle}>Lessons not available yet</AppText>
          <AppText variant="caption" style={styles.emptyBody}>
            Log in with demo@ustadh.local and ensure the backend is running.
            MVP includes surahs 78–87 only. Start a lesson after completing
            previous levels.
          </AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.path}>
          {levels.map((level, index) => {
            const locked = level.status === 'locked';
            const canOpen =
              level.status === 'available' ||
              level.status === 'in_progress' ||
              level.status === 'completed';

            return (
              <LevelNode
                key={level.lesson_group_id}
                level={level}
                index={index}
                align={nodeAlignForIndex(index)}
                onPress={() => {
                  if (!canOpen || locked) {
                    return;
                  }
                  navigation.navigate('LessonStart', {
                    groupId: level.lesson_group_id,
                    label: `Ayah ${level.start_ayah}–${level.end_ayah}`,
                  });
                }}
              />
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    marginHorizontal: spacing.screenHorizontal,
    marginTop: spacing.md,
    borderRadius: 20,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerEn: { color: colors.white, fontWeight: '800', fontSize: 18 },
  bannerMeta: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  bannerAr: {
    fontSize: 24,
    color: colors.yellow,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  progressTrack: {
    height: 6,
    width: 140,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.yellow,
    borderRadius: 3,
  },
  path: { paddingTop: spacing.lg, paddingBottom: spacing.xl },
  empty: {
    padding: spacing.xl,
    marginHorizontal: spacing.screenHorizontal,
  },
  emptyTitle: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  emptyBody: { color: colors.grey, lineHeight: 20 },
});
