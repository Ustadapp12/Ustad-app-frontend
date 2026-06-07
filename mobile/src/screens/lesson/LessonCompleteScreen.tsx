import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { EmojiText } from '../../components/ui/EmojiText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Mascot } from '../../components/ui/Mascot';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAuthStore } from '../../store/authStore';
import { learningApi } from '../../api';
import { getCachedRecommended } from '../../services/bootCache';
import type { RecommendedNext } from '../../types/api';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonComplete'>;

export function LessonCompleteScreen({ route, navigation }: Props) {
  const { xp, scorePct, stars, gems = 0, heartsRemaining } = route.params;
  const streak = useAuthStore(s => s.learning?.current_streak ?? 0);
  const learning = useAuthStore(s => s.learning);
  const hearts = heartsRemaining ?? learning?.hearts_remaining ?? 5;

  const [nextLesson, setNextLesson] = useState<RecommendedNext | null>(null);

  useEffect(() => {
    // Try cache first; if invalidated (post-lesson), fetch fresh
    const cached = getCachedRecommended();
    if (cached) {
      setNextLesson(cached);
    } else {
      learningApi.recommendedNext().then(setNextLesson).catch(() => null);
    }
  }, []);

  return (
    <Screen style={styles.screen}>
      <IrabBackground />
      <View style={styles.content}>
        <EmojiText size={28}>✨ 🎉</EmojiText>
        <Mascot size={90} bounce />
        <AppText variant="h1" style={styles.title}>
          {copy.complete.title}
        </AppText>
        <View style={styles.row}>
          <View style={[styles.card, styles.cardXp]}>
            <AppText style={styles.cardLabel}>{copy.complete.xpLabel}</AppText>
            <AppText style={styles.cardValue}>{xp}</AppText>
          </View>
          <View style={[styles.card, styles.cardAcc]}>
            <AppText style={[styles.cardLabel, styles.cardLabelDark]}>
              {copy.complete.accuracyLabel}
            </AppText>
            <AppText style={[styles.cardValue, styles.cardValueDark]}>
              {scorePct}%
            </AppText>
            <AppText style={styles.stars}>{'★'.repeat(stars)}</AppText>
          </View>
        </View>
        {gems > 0 ? (
          <AppText style={styles.gems}>
            +{gems} {copy.complete.gemsLabel}
          </AppText>
        ) : null}
        <AppText style={styles.hearts}>
          {copy.complete.heartsLabel}: {hearts} ❤️
        </AppText>

        {nextLesson ? (
          <Pressable
            style={styles.nextCard}
            onPress={() =>
              navigation.navigate('LessonStart', {
                groupId: nextLesson.lesson_group_id,
                label: `${nextLesson.surah_name_en} · Level ${nextLesson.level_number}`,
              })
            }>
            <View style={styles.nextCardLeft}>
              <AppText style={styles.nextLabel}>Up next</AppText>
              <AppText style={styles.nextTitle}>
                {nextLesson.surah_name_en} · Level {nextLesson.level_number}
              </AppText>
            </View>
            <AppText style={styles.nextArrow}>▶</AppText>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={copy.complete.cta}
          onPress={() => {
            if (streak > 0) {
              navigation.replace('StreakModal', { streak });
            } else {
              navigation.navigate('MainTabs');
            }
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark, flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    zIndex: 1,
  },
  confetti: { fontSize: 28, marginBottom: spacing.sm },
  title: { color: colors.yellow, marginVertical: spacing.lg, textAlign: 'center' },
  row: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
  },
  cardXp: { backgroundColor: colors.yellow },
  cardAcc: { backgroundColor: colors.successBg },
  cardLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.dark,
    opacity: 0.7,
  },
  cardLabelDark: { color: colors.primary },
  cardValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.dark,
    marginTop: 4,
  },
  cardValueDark: { color: colors.primary },
  stars: { color: colors.yellow, fontSize: 18, marginTop: 4 },
  gems: { marginTop: spacing.lg, color: colors.yellow, fontWeight: '800' },
  hearts: { marginTop: spacing.sm, color: colors.grey, fontWeight: '700' },
  nextCard: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}20`,
    borderWidth: 1.5,
    borderColor: `${colors.primary}50`,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '100%',
    gap: spacing.sm,
  },
  nextCardLeft: { flex: 1 },
  nextLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  nextTitle: { fontSize: 14, fontWeight: '800', color: colors.white, marginTop: 2 },
  nextArrow: { color: colors.primary, fontSize: 16, fontWeight: '900' },
  footer: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xl + 8,
    zIndex: 1,
  },
});
