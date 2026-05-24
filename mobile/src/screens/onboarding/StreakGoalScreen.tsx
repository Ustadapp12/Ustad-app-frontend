import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SpeechBubble } from '../../components/ui/SpeechBubble';
import { Mascot } from '../../components/ui/Mascot';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { copy } from '../../i18n/copy';
import { saveOnboarding, setOnboardingDone } from '../../utils/storage';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingStreakGoal'>;

export function StreakGoalScreen({ navigation }: Props) {
  const [days, setDays] = useState<3 | 7 | 14 | 30>(7);

  const finish = async () => {
    await saveOnboarding({ streakGoalDays: days });
    await setOnboardingDone(true);
    navigation.navigate('AuthRegister');
  };

  return (
    <OnboardingLayout
      footer={
        <>
          <PrimaryButton
            title={copy.streakGoal.skip}
            variant="secondary"
            onPress={finish}
          />
          <PrimaryButton
            title={copy.streakGoal.cta}
            onPress={finish}
            style={styles.gap}
          />
        </>
      }>
      <View style={styles.hero}>
        <Mascot size={72} />
        <AppText variant="h1" style={styles.title}>
          {copy.streakGoal.title}
        </AppText>
      </View>
      <View style={styles.list}>
        {copy.streakGoal.options.map(opt => (
          <Pressable
            key={opt.days}
            onPress={() => setDays(opt.days as 3 | 7 | 14 | 30)}
            style={[styles.row, days === opt.days && styles.selected]}>
            <View>
              <AppText variant="h2">{opt.label}</AppText>
              <AppText variant="caption">{opt.subtitle}</AppText>
            </View>
            {days === opt.days ? (
              <AppText style={styles.check}>✓</AppText>
            ) : null}
          </Pressable>
        ))}
      </View>
      <SpeechBubble>{copy.streakGoal.tip}</SpeechBubble>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  title: { textAlign: 'center', marginTop: spacing.sm },
  list: { marginBottom: spacing.lg },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: `${colors.grey}35`,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  selected: {
    borderColor: colors.yellow,
    backgroundColor: `${colors.yellow}15`,
  },
  check: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  gap: { marginTop: spacing.sm },
});
