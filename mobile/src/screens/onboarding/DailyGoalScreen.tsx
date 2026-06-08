import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { copy } from '../../i18n/copy';
import { saveOnboarding } from '../../utils/storage';
import { updateProfileIfAuthed } from '../../api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingDailyGoal'>;

export function DailyGoalScreen({ navigation }: Props) {
  const [selected, setSelected] = useState(10);

  return (
    <OnboardingLayout
      step={2}
      totalSteps={4}
      onBack={() => navigation.goBack()}
      footer={
        <PrimaryButton
          title={copy.dailyGoal.cta}
          onPress={async () => {
            await saveOnboarding({ dailyGoalMinutes: selected as 5 | 10 | 15 | 20 });
            updateProfileIfAuthed({ daily_goal_minutes: selected });
            navigation.navigate('RecitationLevel');
          }}
        />
      }>
      <AppText variant="h1" style={styles.title}>
        {copy.dailyGoal.title}
      </AppText>
      <View style={styles.list}>
        {copy.dailyGoal.options.map(opt => (
          <Pressable
            key={opt.id}
            onPress={() => setSelected(opt.minutes)}
            style={[styles.row, selected === opt.minutes && styles.rowSelected]}>
            <View>
              <AppText variant="h2" style={selected === opt.minutes && styles.selectedText}>
                {opt.label}
              </AppText>
              <AppText variant="caption">{opt.minutes} min / day</AppText>
            </View>
          </Pressable>
        ))}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.lg },
  list: { flex: 1 },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.buttonSecondaryBg,
  },
  rowSelected: { backgroundColor: colors.ash, marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 8 },
  selectedText: { color: colors.primary },
});
