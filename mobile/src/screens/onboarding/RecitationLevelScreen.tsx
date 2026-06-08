import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { GridOptionCard, GridOptions } from '../../components/ui/GridOptionCard';
import { saveOnboarding } from '../../utils/storage';
import { updateProfileIfAuthed } from '../../api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RecitationLevel'>;

type Level = 'none' | 'letters' | 'reads' | 'advanced';

const OPTIONS: { id: Level; icon: string; label: string; sub: string }[] = [
  { id: 'none',     icon: '🌱', label: 'Complete beginner', sub: 'Never read Quran before' },
  { id: 'letters',  icon: '🔤', label: 'Know the letters',  sub: 'Can read but slowly'      },
  { id: 'reads',    icon: '📖', label: 'Can read Arabic',   sub: 'Know some Surahs'          },
  { id: 'advanced', icon: '⭐', label: 'Advanced',          sub: 'Memorised many Surahs'     },
];

export function RecitationLevelScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<Level | null>(null);

  return (
    <OnboardingLayout
      step={3}
      totalSteps={4}
      onBack={() => navigation.goBack()}
      footer={
        <PrimaryButton
          title="Continue"
          onPress={async () => {
            if (!selected) return;
            await saveOnboarding({
              recitationLevel: selected,
              learnerMode: selected === 'none' ? 'beginner' : 'placement_pending',
            });
            updateProfileIfAuthed({
              learner_mode: selected === 'none' ? 'beginner' : 'placement_pending',
            });
            navigation.navigate('PlacementIntro');
          }}
          variant={selected ? 'primary' : 'disabled'}
          disabled={!selected}
        />
      }>
      <AppText variant="h1">How well can you recite?</AppText>
      <AppText style={styles.sub}>Help us find the right starting point for you</AppText>
      <AppText style={styles.xp}>⚡ +25 XP for being honest</AppText>
      <GridOptions>
        {OPTIONS.map(opt => (
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
