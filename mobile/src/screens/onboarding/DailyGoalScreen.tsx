import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ProgressHeader } from '../../components/ui/ProgressHeader';
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
    <Screen>
      <ProgressHeader step={1} total={4} onBack={() => navigation.goBack()} />
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
      <View style={styles.footer}>
        <PrimaryButton
          title={copy.dailyGoal.cta}
          onPress={async () => {
            await saveOnboarding({ dailyGoalMinutes: selected as 5 | 10 | 15 | 20 });
            updateProfileIfAuthed({ daily_goal_minutes: selected });
            navigation.navigate('OnboardingNotifications');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { paddingHorizontal: spacing.screenHorizontal, marginBottom: spacing.lg },
  list: { flex: 1, paddingHorizontal: spacing.screenHorizontal },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.buttonSecondaryBg,
  },
  rowSelected: { backgroundColor: colors.ash, marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 8 },
  selectedText: { color: colors.primary },
  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.lg },
});
