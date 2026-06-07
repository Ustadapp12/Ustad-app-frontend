import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { EmojiText } from '../../components/ui/EmojiText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StageIntro'>;

const STAGE_META: Record<
  'listening' | 'recognition' | 'building' | 'recall' | 'mastery',
  { icon: string; color: string; whatYouDo: string; tip: string }
> = {
  listening: {
    icon: '👂',
    color: '#4F8EF7',
    whatYouDo: 'Listen to each ayah recited clearly and follow along with the Arabic text.',
    tip: 'Focus on pronunciation and the rhythm of the recitation.',
  },
  recognition: {
    icon: '👁',
    color: '#A855F7',
    whatYouDo: 'Match ayahs to their meanings and identify individual words in context.',
    tip: 'Look for root words you already know — patterns repeat throughout the Quran.',
  },
  building: {
    icon: '🔨',
    color: colors.yellow,
    whatYouDo: 'Fill in missing words and put scrambled ayah words back in order.',
    tip: 'Say each word aloud as you place it — your voice reinforces memory.',
  },
  recall: {
    icon: '🧠',
    color: '#F97316',
    whatYouDo: 'Recall ayahs from memory with partial prompts to guide you.',
    tip: 'Close your eyes and visualise the page layout — spatial memory helps.',
  },
  mastery: {
    icon: '⭐',
    color: colors.yellow,
    whatYouDo: 'Recite full ayahs from memory with no prompts — prove you have it!',
    tip: "You've come so far. Trust your preparation and recite with confidence.",
  },
};

export function StageIntroScreen({ route, navigation }: Props) {
  const { groupId, stageType, stageTitle, surahNameEn, xpReward } = route.params;
  const meta = STAGE_META[stageType];

  return (
    <Screen style={styles.screen}>
      <IrabBackground color={meta.color} opacityBase={0.04} />

      <View style={styles.content}>
        {/* Stage badge */}
        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}18` }]}>
          <EmojiText size={56}>{meta.icon}</EmojiText>
        </View>

        <AppText style={[styles.stageType, { color: meta.color }]}>
          {stageType.toUpperCase()}
        </AppText>

        <AppText variant="h1" style={styles.title}>
          {stageTitle}
        </AppText>

        <AppText style={styles.surahName}>{surahNameEn}</AppText>

        {/* What you'll do */}
        <View style={styles.infoCard}>
          <AppText style={styles.infoLabel}>WHAT YOU'LL DO</AppText>
          <AppText style={styles.infoBody}>{meta.whatYouDo}</AppText>
        </View>

        {/* Tip */}
        <View style={styles.tipCard}>
          <EmojiText size={18}>💡</EmojiText>
          <AppText style={styles.tipText}>{meta.tip}</AppText>
        </View>

        {/* XP reward */}
        <View style={[styles.xpBadge, { borderColor: `${meta.color}40`, backgroundColor: `${meta.color}12` }]}>
          <AppText style={[styles.xpText, { color: meta.color }]}>
            +{xpReward} XP on completion
          </AppText>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Begin Stage →"
          onPress={() =>
            navigation.replace('LessonStart', { groupId, label: stageTitle })
          }
          style={{ backgroundColor: meta.color }}
        />
        <PrimaryButton
          title="Go back"
          variant="secondaryOnDark"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
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
    gap: spacing.md,
    zIndex: 1,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  stageType: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: -spacing.xs,
  },
  title: {
    color: colors.white,
    textAlign: 'center',
  },
  surahName: {
    color: colors.grey,
    fontWeight: '700',
    fontSize: 14,
    marginTop: -spacing.xs,
  },
  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: colors.grey,
    marginBottom: spacing.sm,
  },
  infoBody: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  tipCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: `${colors.yellow}12`,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.yellow}30`,
  },
  tipText: {
    flex: 1,
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    opacity: 0.85,
  },
  xpBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  xpText: {
    fontWeight: '900',
    fontSize: 14,
  },
  footer: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    zIndex: 1,
  },
  beginBtn: {},
  backBtn: {},
});
