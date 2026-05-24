import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { saveOnboarding, setOnboardingDone } from '../../utils/storage';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PathChoose'>;

export function PathChooseScreen({ navigation }: Props) {
  const pick = async (choice: 'fresh' | 'placement') => {
    await saveOnboarding({ pathChoice: choice });
    if (choice === 'placement') {
      navigation.navigate('PlacementIntro');
    } else {
      await setOnboardingDone(true);
      navigation.navigate('OnboardingStreakGoal');
    }
  };

  return (
    <OnboardingLayout step={2} totalSteps={3} onBack={() => navigation.goBack()}>
      <AppText variant="h1" style={styles.title}>
        {copy.path.title}
      </AppText>
      <View style={styles.cards}>
        <Pressable style={styles.card} onPress={() => pick('fresh')}>
          <View style={[styles.icon, styles.iconFresh]}>
            <AppText style={styles.iconEmoji}>🌱</AppText>
          </View>
          <AppText variant="h2">{copy.path.startFresh.title}</AppText>
          <AppText style={styles.sub}>{copy.path.startFresh.subtitle}</AppText>
          <AppText style={styles.bonus}>+20 XP</AppText>
        </Pressable>
        <Pressable style={styles.card} onPress={() => pick('placement')}>
          <View style={[styles.icon, styles.iconTest]}>
            <AppText style={styles.iconEmoji}>📖</AppText>
          </View>
          <AppText variant="h2">{copy.path.checkLevel.title}</AppText>
          <AppText style={styles.sub}>{copy.path.checkLevel.subtitle}</AppText>
          <AppText style={styles.bonus}>+30 XP</AppText>
        </Pressable>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.lg },
  cards: { gap: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: `${colors.grey}35`,
    padding: spacing.lg,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconFresh: { backgroundColor: colors.primary },
  iconTest: { backgroundColor: colors.yellow },
  iconEmoji: { fontSize: 28 },
  sub: { color: colors.charcoal, marginTop: spacing.xs, fontWeight: '600' },
  bonus: {
    color: colors.yellow,
    fontWeight: '900',
    fontSize: 12,
    marginTop: spacing.md,
  },
});
