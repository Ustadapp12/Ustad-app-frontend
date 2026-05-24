import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Mascot } from '../../components/ui/Mascot';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { scorePlacement } from '../../data/placementQuestions';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { saveOnboarding } from '../../utils/storage';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlacementResults'>;

export function PlacementResultsScreen({ route, navigation }: Props) {
  const result = scorePlacement(route.params.answers);
  const levelLabel =
    result.level === 'advanced'
      ? copy.placement.levelAdvanced
      : result.level === 'intermediate'
        ? copy.placement.levelIntermediate
        : copy.placement.levelBeginner;

  return (
    <Screen style={styles.screen}>
      <IrabBackground />
      <View style={styles.content}>
        <Mascot size={100} bounce />
        <AppText style={styles.trophy}>🏆</AppText>
        <AppText variant="h1" style={styles.title}>
          {copy.placement.resultsTitle}
        </AppText>
        <AppText style={styles.score}>
          {result.correct}/{result.total} {copy.placement.correctLabel}
        </AppText>
        <View style={styles.levelCard}>
          <AppText style={styles.levelLabel}>{levelLabel}</AppText>
          <AppText variant="caption" style={styles.levelSub}>
            {copy.placement.startAtSurah(result.startSurah)}
          </AppText>
        </View>
        <View style={styles.xpCard}>
          <AppText style={styles.xp}>+{result.correct * 10} XP ⚡</AppText>
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={copy.placement.resultsCta}
          onPress={async () => {
            await saveOnboarding({
              placementLevel: result.level,
              startSurah: result.startSurah,
            });
            navigation.replace('Celebration');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    zIndex: 1,
  },
  trophy: { fontSize: 48, marginTop: spacing.md },
  title: {
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  score: {
    color: colors.yellow,
    fontWeight: '800',
    fontSize: 18,
    marginTop: spacing.sm,
  },
  levelCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: spacing.lg,
    marginTop: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  levelLabel: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 20,
  },
  levelSub: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  xpCard: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 99,
    backgroundColor: colors.yellow,
  },
  xp: { fontWeight: '900', color: colors.dark },
  footer: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    zIndex: 1,
  },
});
