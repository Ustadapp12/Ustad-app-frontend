import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ProgressHeader } from '../../components/ui/ProgressHeader';
import { OptionCard } from '../../components/ui/OptionCard';
import { copy } from '../../i18n/copy';
import { saveOnboarding } from '../../utils/storage';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingMotivation'>;

export function MotivationScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const continueNext = async () => {
    if (!selected) return;
    await saveOnboarding({ motivation: selected });
    navigation.navigate('OnboardingDailyGoal');
  };

  return (
    <Screen>
      <ProgressHeader
        step={0}
        total={4}
        onBack={() => navigation.goBack()}
      />
      <AppText variant="h1" style={styles.title}>
        {copy.motivation.title}
      </AppText>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {copy.motivation.options.map(opt => (
          <OptionCard
            key={opt.id}
            label={opt.label}
            icon={opt.icon}
            selected={selected === opt.id}
            onPress={() => setSelected(opt.id)}
          />
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          title={copy.motivation.cta}
          onPress={continueNext}
          variant={selected ? 'primary' : 'disabled'}
          disabled={!selected}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { paddingHorizontal: spacing.screenHorizontal, marginBottom: spacing.md },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.screenHorizontal },
  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.lg },
});
