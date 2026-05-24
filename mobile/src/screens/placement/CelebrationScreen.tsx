import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Mascot } from '../../components/ui/Mascot';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { setOnboardingDone } from '../../utils/storage';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Celebration'>;

export function CelebrationScreen({ navigation }: Props) {
  return (
    <Screen style={styles.screen}>
      <IrabBackground />
      <View style={styles.content}>
        <AppText style={styles.confetti}>🎉 ✨ 🌙</AppText>
        <Mascot size={120} bounce />
        <AppText variant="h1" style={styles.title}>
          {copy.celebration.title}
        </AppText>
        <AppText style={styles.body}>{copy.celebration.body}</AppText>
        <View style={styles.badge}>
          <AppText style={styles.badgeIcon}>🎖️</AppText>
          <AppText style={styles.badgeLabel}>{copy.celebration.badge}</AppText>
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={copy.celebration.cta}
          onPress={async () => {
            await setOnboardingDone(true);
            navigation.replace('OnboardingStreakGoal');
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
  confetti: { fontSize: 28, marginBottom: spacing.md },
  title: {
    color: colors.yellow,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  body: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: '600',
    lineHeight: 22,
  },
  badge: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(233, 196, 104, 0.15)',
    borderWidth: 2,
    borderColor: colors.yellow,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  badgeIcon: { fontSize: 24 },
  badgeLabel: { color: colors.white, fontWeight: '800' },
  footer: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    zIndex: 1,
  },
});
