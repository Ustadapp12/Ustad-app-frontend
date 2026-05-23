import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { learningApi } from '../../api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { copy } from '../../i18n/copy';
import type { SurahLevel } from '../../types/api';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SurahLevels'>;

export function SurahLevelsScreen({ route, navigation }: Props) {
  const { surahNumber, nameEn } = route.params;
  const [levels, setLevels] = useState<SurahLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    learningApi
      .levels(surahNumber)
      .then(setLevels)
      .catch(() => setLevels([]))
      .finally(() => setLoading(false));
  }, [surahNumber]);

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.banner}>
        <AppText style={styles.bannerText}>{nameEn}</AppText>
      </View>
      <ScrollView contentContainerStyle={styles.path}>
        {levels.map((level, index) => {
          const locked = level.status === 'locked';
          const completed = level.status === 'completed';
          const active =
            level.status === 'available' || level.status === 'in_progress';
          return (
            <View key={level.lesson_group_id} style={styles.nodeRow}>
              <View
                style={[
                  styles.node,
                  completed && styles.nodeDone,
                  active && styles.nodeActive,
                  locked && styles.nodeLocked,
                ]}>
                <AppText style={styles.nodeText}>
                  {completed ? '✓' : locked ? '🔒' : '★'}
                </AppText>
              </View>
              <Pressable
                style={styles.nodeLabel}
                disabled={locked}
                onPress={() => {
                  if (active || completed) {
                    navigation.navigate('LessonStart', {
                      groupId: level.lesson_group_id,
                      label: `Ayah ${level.start_ayah}–${level.end_ayah}`,
                    });
                  }
                }}>
                <AppText variant="h2">
                  Level {index + 1}: Ayah {level.start_ayah}–{level.end_ayah}
                </AppText>
                {level.stars != null ? (
                  <AppText variant="caption">{'★'.repeat(level.stars)}</AppText>
                ) : null}
                {active ? (
                  <AppText style={styles.start}>{copy.journey.start}</AppText>
                ) : null}
                {locked ? (
                  <AppText variant="caption">{copy.journey.locked}</AppText>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: {
    backgroundColor: colors.chapterBanner,
    padding: spacing.lg,
    marginHorizontal: spacing.screenHorizontal,
    marginTop: spacing.md,
    borderRadius: 12,
  },
  bannerText: { color: colors.white, fontWeight: '800', fontSize: 18 },
  path: { padding: spacing.screenHorizontal, paddingTop: spacing.xl },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  node: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.buttonSecondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: { backgroundColor: colors.yellow },
  nodeActive: { backgroundColor: colors.primary, transform: [{ scale: 1.1 }] },
  nodeLocked: { opacity: 0.6 },
  nodeText: { fontSize: 18 },
  nodeLabel: { flex: 1, paddingTop: 4 },
  start: { color: colors.primary, fontWeight: '800', marginTop: 4 },
});
