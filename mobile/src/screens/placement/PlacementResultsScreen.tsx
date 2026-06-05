import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { scorePlacement } from '../../data/placementQuestions';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { saveOnboarding } from '../../utils/storage';
import { displaySurahNameEn } from '../../utils/surahDisplay';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlacementResults'>;

export function PlacementResultsScreen({ route, navigation }: Props) {
  const result = scorePlacement(route.params.answers);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    const target = result.correct * 10;
    let n = 0;
    const iv = setInterval(() => {
      n += 2;
      setXp(n);
      if (n >= target) { clearInterval(iv); setXp(target); }
    }, 30);
    return () => clearInterval(iv);
  }, [result.correct]);

  const levelLabel =
    result.level === 'advanced'
      ? copy.placement.levelAdvanced
      : result.level === 'intermediate'
        ? copy.placement.levelIntermediate
        : copy.placement.levelBeginner;

  const startSurahName = displaySurahNameEn(result.startSurah);

  return (
    <Screen style={styles.screen}>
      <IrabBackground color={colors.charcoal} opacityBase={0.09} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Teacher avatars celebrating */}
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, styles.avatarGreen]}>
            <AppText style={styles.avatarEmoji}>🧔🏽‍♂️</AppText>
          </View>
          <View style={[styles.avatar, styles.avatarYellow]}>
            <AppText style={styles.avatarEmoji}>🧕🏽</AppText>
          </View>
        </View>

        {/* Trophy */}
        <View style={styles.trophyWrap}>
          <AppText style={styles.trophy}>🏆</AppText>
        </View>

        {/* Title */}
        <AppText variant="h1" style={styles.title}>Assessment Complete!</AppText>
        <AppText style={styles.sub}>Great job! Here's your result</AppText>

        {/* Teachers' quote */}
        <View style={styles.quoteCard}>
          <AppText style={styles.quoteName}>Sheikh Ahmad & Sheikha Fatima:</AppText>
          <AppText style={styles.quoteText}>
            "Masha'Allah! You've shown great knowledge. May Allah bless your Hifz
            journey! 🌟"
          </AppText>
        </View>

        {/* Score card */}
        <View style={styles.scoreCard}>
          <AppText style={styles.scoreHead}>Your Score</AppText>
          <AppText style={styles.scoreNum}>
            {result.correct}/{result.total}
          </AppText>
          <AppText style={styles.scorePct}>
            {Math.round((result.correct / result.total) * 100)}% Correct
          </AppText>
          <View style={styles.divider} />
          <AppText style={styles.placementHead}>Level Placement</AppText>
          <AppText style={styles.placementLevel}>{levelLabel}</AppText>
          <AppText style={styles.placementSub}>
            You'll start with {startSurahName} lessons
          </AppText>
        </View>

        {/* XP earned */}
        <View style={styles.xpCard}>
          <AppText style={styles.xpLabel}>XP Earned</AppText>
          <AppText style={styles.xpValue}>⚡ {xp}</AppText>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={copy.placement.resultsCta}
          onPress={async () => {
            await saveOnboarding({
              placementLevel: result.level,
              startSurah: result.startSurah,
              learnerMode: result.level === 'beginner' ? 'beginner' : 'adult',
            });
            navigation.replace('Celebration', {
              answers: route.params.answers,
              scorePct: Math.round((result.correct / result.total) * 100),
              level: result.level,
              startSurah: result.startSurah,
            });
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.ash },
  scroll: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },

  avatarRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGreen: {
    backgroundColor: `${colors.primary}18`,
    borderColor: colors.primary,
  },
  avatarYellow: {
    backgroundColor: `${colors.yellow}18`,
    borderColor: colors.yellow,
  },
  avatarEmoji: { fontSize: 30 },

  trophyWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.yellow}20`,
    borderWidth: 3,
    borderColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophy: { fontSize: 44 },

  title: { color: colors.dark, textAlign: 'center' },
  sub: {
    color: colors.charcoal,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -spacing.xs,
  },

  quoteCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: `${colors.grey}25`,
  },
  quoteName: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: 4,
  },
  quoteText: {
    fontWeight: '700',
    color: colors.dark,
    lineHeight: 21,
    fontSize: 13,
  },

  scoreCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: `${colors.grey}25`,
  },
  scoreHead: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  scoreNum: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.primary,
    lineHeight: 56,
  },
  scorePct: {
    color: colors.charcoal,
    fontWeight: '700',
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: `${colors.grey}20`,
    marginVertical: spacing.md,
  },
  placementHead: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.yellow,
    marginBottom: 4,
  },
  placementLevel: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.dark,
  },
  placementSub: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.charcoal,
    marginTop: 2,
  },

  xpCard: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 16,
    backgroundColor: `${colors.yellow}20`,
    borderWidth: 2,
    borderColor: colors.yellow,
    alignItems: 'center',
  },
  xpLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.yellow,
    marginBottom: 2,
  },
  xpValue: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.yellow,
  },

  footer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    backgroundColor: colors.ash,
  },
});
