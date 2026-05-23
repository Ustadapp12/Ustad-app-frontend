import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SpeechBubble } from '../../components/ui/SpeechBubble';
import { copy } from '../../i18n/copy';
import { saveOnboarding, setOnboardingDone } from '../../utils/storage';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingStreakGoal'>;

export function StreakGoalScreen({ navigation }: Props) {
  const [days, setDays] = useState(7);

  const finish = async () => {
    await saveOnboarding({ streakGoalDays: days as 3 | 7 | 14 | 30 });
    await setOnboardingDone(true);
    navigation.navigate('AuthRegister');
  };

  return (
    <Screen>
      <AppText variant="h1" style={styles.title}>
        {copy.streakGoal.title}
      </AppText>
      <View style={styles.list}>
        {copy.streakGoal.options.map(opt => (
          <Pressable
            key={opt.days}
            onPress={() => setDays(opt.days)}
            style={[styles.row, days === opt.days && styles.selected]}>
            <View>
              <AppText variant="h2">{opt.label}</AppText>
              <AppText variant="caption">{opt.subtitle}</AppText>
            </View>
            {days === opt.days ? <AppText style={styles.check}>✓</AppText> : null}
          </Pressable>
        ))}
      </View>
      <SpeechBubble>{copy.streakGoal.tip}</SpeechBubble>
      <View style={styles.footer}>
        <PrimaryButton title={copy.streakGoal.skip} variant="secondary" onPress={finish} />
        <PrimaryButton title={copy.streakGoal.cta} onPress={finish} style={styles.gap} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { padding: spacing.screenHorizontal, marginTop: spacing.lg },
  list: { paddingHorizontal: spacing.screenHorizontal },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.buttonSecondaryBg,
    marginBottom: spacing.sm,
  },
  selected: { borderColor: colors.yellow, borderWidth: 2 },
  check: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.lg },
  gap: { marginTop: spacing.sm },
});
