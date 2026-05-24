import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { copy } from '../../i18n/copy';
import { setScriptPreference } from '../../utils/storage';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';
import type { ScriptPreference } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingScript'>;

export function ScriptScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<ScriptPreference | null>(null);

  return (
    <OnboardingLayout
      step={0}
      totalSteps={3}
      onBack={() => navigation.goBack()}
      footer={
        <PrimaryButton
          title={copy.script.cta}
          onPress={async () => {
            if (!selected) return;
            await setScriptPreference(selected);
            navigation.navigate('OnboardingDailyGoal');
          }}
          variant={selected ? 'primary' : 'disabled'}
          disabled={!selected}
        />
      }>
      <AppText variant="h1" style={styles.title}>
        {copy.script.title}
      </AppText>
      <AppText style={styles.sub}>{copy.script.subtitle}</AppText>
      <View style={styles.list}>
        {copy.script.options.map(opt => (
          <Pressable
            key={opt.id}
            onPress={() => setSelected(opt.id)}
            style={[styles.card, selected === opt.id && styles.cardSelected]}>
            <AppText style={styles.nameAr}>{opt.nameAr}</AppText>
            <AppText style={styles.nameEn}>{opt.nameEn}</AppText>
            <AppText style={styles.sample}>{opt.sample}</AppText>
          </Pressable>
        ))}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.xs },
  sub: { color: colors.charcoal, marginBottom: spacing.lg, fontWeight: '600' },
  list: { gap: spacing.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: `${colors.grey}35`,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.successBg,
  },
  nameAr: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  nameEn: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 4,
  },
  sample: {
    fontSize: 16,
    marginTop: spacing.sm,
    color: colors.charcoal,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
