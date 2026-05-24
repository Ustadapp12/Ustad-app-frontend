import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Mascot } from '../../components/ui/Mascot';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlacementIntro'>;

export function PlacementIntroScreen({ navigation }: Props) {
  return (
    <OnboardingLayout
      dark
      onBack={() => navigation.goBack()}
      footer={
        <PrimaryButton
          title={copy.placement.cta}
          onPress={() => navigation.navigate('PlacementTest')}
        />
      }>
      <View style={styles.hero}>
        <Mascot size={100} bounce />
        <AppText variant="h1" style={styles.title}>
          {copy.placement.title}
        </AppText>
        <AppText style={styles.body}>{copy.placement.body}</AppText>
      </View>
      <View style={styles.card}>
        <AppText style={styles.cardTitle}>{copy.placement.introTeachers}</AppText>
        {copy.placement.introExpect.map(item => (
          <View key={item} style={styles.row}>
            <AppText style={styles.check}>✓</AppText>
            <AppText style={styles.rowText}>{item}</AppText>
          </View>
        ))}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  title: { color: colors.white, textAlign: 'center', marginTop: spacing.lg },
  body: {
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(5, 150, 106, 0.35)',
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cardTitle: {
    color: colors.yellow,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  check: { color: colors.yellow, fontWeight: '900' },
  rowText: { color: colors.white, fontWeight: '600', flex: 1 },
});
