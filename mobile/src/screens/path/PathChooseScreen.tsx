import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { EmojiText } from '../../components/ui/EmojiText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { saveOnboarding, setOnboardingDone } from '../../utils/storage';
import { updateProfileIfAuthed } from '../../api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PathChoose'>;

const PATHS = [
  {
    id: 'fresh' as const,
    emoji: '🌱',
    color: colors.primary,
    title: 'Learning Quran for the first time?',
    sub: 'Start from Alif Baa · Complete beginner',
    detail: "We'll guide you step by step through every letter and Surah",
    xp: '+100 XP starter bonus',
  },
  {
    id: 'placement' as const,
    emoji: '📖',
    color: colors.yellow,
    title: 'Already know some Surahs?',
    sub: 'Test your level · Find your starting point',
    detail: "Take a short test and we'll place you at the perfect level",
    xp: '+50 XP for testing',
  },
];

export function PathChooseScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<'fresh' | 'placement' | null>(null);

  const confirm = async () => {
    if (!selected) return;
    const learnerMode =
      selected === 'fresh'
        ? 'beginner'
        : selected === 'placement'
          ? 'placement_pending'
          : undefined;
    await saveOnboarding({ pathChoice: selected, learnerMode });
    if (learnerMode) {
      updateProfileIfAuthed({ learner_mode: learnerMode });
    }
    if (selected === 'placement') {
      navigation.navigate('PlacementIntro');
    } else {
      await setOnboardingDone(true);
      navigation.navigate('OnboardingStreakGoal');
    }
  };

  return (
    <OnboardingLayout
      step={2}
      totalSteps={3}
      onBack={() => navigation.goBack()}
      footer={
        <PrimaryButton
          title={
            selected === 'fresh'
              ? 'Start my Hifz journey! 🌱'
              : selected === 'placement'
                ? 'Test my level 📖'
                : 'Select your path'
          }
          onPress={confirm}
          variant={selected ? 'primary' : 'disabled'}
          disabled={!selected}
        />
      }>
      <AppText variant="h1" style={styles.title}>Choose your path</AppText>
      <AppText style={styles.sub}>How would you describe yourself?</AppText>

      <View style={styles.cards}>
        {PATHS.map(p => {
          const active = selected === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setSelected(p.id)}
              style={[
                styles.card,
                active && {
                  borderColor: p.color,
                  borderWidth: 3,
                  backgroundColor:
                    p.id === 'fresh' ? `${p.color}08` : `${p.color}18`,
                },
              ]}>
              {/* Check badge */}
              {active && (
                <View style={[styles.checkBadge, { backgroundColor: p.color }]}>
                  <AppText style={styles.checkMark}>✓</AppText>
                </View>
              )}

              <View style={styles.cardInner}>
                {/* Icon box */}
                <View style={[styles.iconBox, { backgroundColor: `${p.color}20` }]}>
                  <EmojiText size={34}>{p.emoji}</EmojiText>
                </View>

                {/* Text block */}
                <View style={styles.textBlock}>
                  <AppText style={styles.cardTitle}>{p.title}</AppText>
                  <AppText style={styles.cardSub}>{p.sub}</AppText>
                  <AppText style={styles.cardDetail}>{p.detail}</AppText>
                  <View style={[styles.xpBadge, { backgroundColor: `${p.color}20` }]}>
                    <AppText style={[styles.xpText, { color: p.color }]}>
                      ⚡ {p.xp}
                    </AppText>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.xs },
  sub: {
    color: colors.charcoal,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  cards: { gap: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: `${colors.grey}30`,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  checkBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  checkMark: { color: colors.white, fontWeight: '900', fontSize: 13 },
  cardInner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'visible',
  },
  textBlock: { flex: 1 },
  cardTitle: {
    fontWeight: '900',
    fontSize: 15,
    color: colors.dark,
    lineHeight: 21,
    marginBottom: spacing.xs,
  },
  cardSub: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  cardDetail: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.charcoal,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  xpBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  xpText: { fontSize: 11, fontWeight: '900' },
});
