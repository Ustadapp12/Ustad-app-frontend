import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Mascot } from '../../components/ui/Mascot';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { saveOnboarding, setOnboardingDone } from '../../utils/storage';
import { usersApi } from '../../api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingStreakGoal'>;

const GOALS = [
  {
    days: 7,
    icon: '🌱',
    label: '7 days',
    title: 'Strong start',
    sub: 'Great for busy schedules',
    xp: '+10 XP/day',
    color: colors.primary,
  },
  {
    days: 14,
    icon: '🔥',
    label: '14 days',
    title: 'Clearly committed',
    sub: 'Most popular choice',
    xp: '+20 XP/day',
    color: colors.yellow,
    popular: true,
  },
  {
    days: 30,
    icon: '⚡',
    label: '30 days',
    title: 'Unstoppable Hafiz',
    sub: 'For the truly dedicated',
    xp: '+35 XP/day',
    color: colors.heart,
  },
] as const;

export function StreakGoalScreen({ navigation }: Props) {
  const [days, setDays] = useState<7 | 14 | 30>(14);

  const finish = async () => {
    await saveOnboarding({ streakGoalDays: days });
    usersApi.updateProfile({ streak_goal_days: days }).catch(() => null);
    await setOnboardingDone(true);
    navigation.navigate('AuthRegister');
  };

  return (
    <OnboardingLayout
      footer={
        <View style={styles.footerInner}>
          <PrimaryButton
            title="I CAN DO IT! 💪"
            onPress={finish}
            style={styles.yellowBtn}
          />
          <Pressable onPress={finish} style={styles.skipBtn}>
            <AppText style={styles.skipText}>Maybe later</AppText>
          </Pressable>
        </View>
      }>
      <AppText variant="h1" style={styles.title}>
        Pick your Hifz commitment
      </AppText>
      <AppText style={styles.sub}>Set a daily streak goal to stay on track</AppText>

      <View style={styles.list}>
        {GOALS.map(g => {
          const active = days === g.days;
          return (
            <Pressable
              key={g.days}
              onPress={() => setDays(g.days)}
              style={[
                styles.row,
                active && { borderColor: g.color, borderWidth: 3 },
              ]}>
              {/* Left accent bar */}
              <View style={[styles.accentBar, { backgroundColor: active ? g.color : 'transparent' }]} />

              <View style={styles.rowContent}>
                <AppText style={styles.rowIcon}>{g.icon}</AppText>
                <View style={styles.rowText}>
                  <View style={styles.rowTitleRow}>
                    <AppText style={styles.rowDays}>{g.label}</AppText>
                    {g.popular && active && (
                      <View style={[styles.selectedBadge, { backgroundColor: g.color }]}>
                        <AppText style={[styles.selectedBadgeText, { color: colors.dark }]}>
                          Selected
                        </AppText>
                      </View>
                    )}
                    {!g.popular && active && (
                      <View style={[styles.selectedBadge, { backgroundColor: g.color }]}>
                        <AppText style={styles.selectedBadgeText}>Selected</AppText>
                      </View>
                    )}
                  </View>
                  <AppText style={[styles.rowTitle, active && { color: g.color }]}>{g.title}</AppText>
                  <AppText style={styles.rowSub}>{g.sub}</AppText>
                </View>
                <View style={styles.rowRight}>
                  <AppText style={[styles.rowXp, { color: g.color }]}>{g.xp}</AppText>
                  <View style={[styles.radio, active && { borderColor: g.color, backgroundColor: g.color }]}>
                    {active && <AppText style={styles.radioCheck}>✓</AppText>}
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Mascot hint */}
      <View style={styles.mascotHint}>
        <Mascot size={52} bounce />
        <AppText style={styles.hintText}>
          You'll be{' '}
          <AppText style={styles.hintBold}>5× more likely</AppText>
          {' '}to complete your Hifz with a daily commitment!
        </AppText>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.xs },
  sub: { color: colors.charcoal, fontWeight: '600', marginBottom: spacing.lg },

  list: { gap: spacing.sm, marginBottom: spacing.lg },
  row: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: `${colors.grey}25`,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  accentBar: {
    width: 6,
    borderRadius: 2,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  rowIcon: { fontSize: 28 },
  rowText: { flex: 1 },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  rowDays: { fontWeight: '900', fontSize: 15, color: colors.dark },
  selectedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 99,
  },
  selectedBadgeText: { fontSize: 9, fontWeight: '900', color: colors.white },
  rowTitle: { fontSize: 12, fontWeight: '700', color: colors.charcoal },
  rowSub: { fontSize: 10, fontWeight: '600', color: colors.grey },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  rowXp: { fontSize: 12, fontWeight: '900' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: `${colors.grey}40`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCheck: { color: colors.white, fontWeight: '900', fontSize: 12 },

  mascotHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: `${colors.grey}20`,
  },
  hintText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.dark, lineHeight: 18 },
  hintBold: { color: colors.yellow, fontWeight: '900' },

  footerInner: { gap: spacing.sm },
  yellowBtn: { backgroundColor: colors.yellow },
  skipBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  skipText: { color: colors.grey, fontWeight: '700', fontSize: 13 },
});
