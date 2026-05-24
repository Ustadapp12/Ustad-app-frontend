import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { GridOptionCard, GridOptions } from '../../components/ui/GridOptionCard';
import { copy } from '../../i18n/copy';
import { saveOnboarding } from '../../utils/storage';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingMotivation'>;

export function MotivationScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <OnboardingLayout
      step={0}
      totalSteps={4}
      onBack={() => navigation.goBack()}
      footer={
        <PrimaryButton
          title={copy.motivation.cta}
          onPress={async () => {
            if (!selected) return;
            await saveOnboarding({ motivation: selected });
            navigation.navigate('OnboardingScript');
          }}
          variant={selected ? 'primary' : 'disabled'}
          disabled={!selected}
        />
      }>
      <AppText variant="h1">{copy.motivation.title}</AppText>
      <AppText style={styles.sub}>{copy.motivation.subtitle}</AppText>
      <AppText style={styles.xp}>{copy.motivation.xpHint}</AppText>
      <GridOptions>
        {copy.motivation.options.map(opt => (
          <GridOptionCard
            key={opt.id}
            label={opt.label}
            sub={opt.sub}
            icon={opt.icon}
            selected={selected === opt.id}
            onPress={() => setSelected(opt.id)}
          />
        ))}
      </GridOptions>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  sub: {
    color: colors.charcoal,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  xp: {
    color: colors.yellow,
    fontWeight: '800',
    fontSize: 12,
    marginBottom: spacing.md,
  },
});
