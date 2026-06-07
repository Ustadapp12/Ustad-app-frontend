import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { copy } from '../../i18n/copy';
import { setScriptPreference } from '../../utils/storage';
import { updateProfileIfAuthed } from '../../api';
import { arabicFontForScript } from '../../theme/typography';
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
            updateProfileIfAuthed({ script_preference: selected });
            navigation.navigate('OnboardingDailyGoal');
          }}
          variant={selected ? 'primary' : 'disabled'}
          disabled={!selected}
        />
      }>
      <AppText variant="h1" style={styles.title}>{copy.script.title}</AppText>
      <AppText style={styles.sub}>{copy.script.subtitle}</AppText>

      {/* XP chip */}
      <View style={styles.xpChip}>
        <AppText style={styles.xpChipText}>⚡</AppText>
        <AppText style={styles.xpChipLabel}>
          Completing setup earns{' '}
          <AppText style={styles.xpHighlight}>+30 XP</AppText>
        </AppText>
      </View>

      <View style={styles.list}>
        {copy.script.options.map((opt, idx) => {
          const active = selected === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setSelected(opt.id)}
              style={[styles.card, active && styles.cardSelected]}>

              {/* Recommended badge on first option */}
              {idx === 0 && (
                <View style={styles.recommendedBadge}>
                  <AppText style={styles.recommendedText}>Recommended</AppText>
                </View>
              )}

              <View style={styles.cardRow}>
                {/* Radio */}
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>

                {/* Text */}
                <View style={styles.cardText}>
                  <AppText style={[styles.nameAr, { fontFamily: arabicFontForScript(opt.id) }]}>{opt.nameAr}</AppText>
                  <AppText style={styles.nameEn}>{opt.nameEn}</AppText>
                </View>
              </View>

              {/* Sample rendered in that option's own font so the user sees an accurate preview */}
              <AppText style={[styles.sample, { fontFamily: arabicFontForScript(opt.id) }]}>{opt.sample}</AppText>
            </Pressable>
          );
        })}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.xs },
  sub: { color: colors.charcoal, marginBottom: spacing.md, fontWeight: '600' },

  xpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.yellow}15`,
    borderWidth: 1.5,
    borderColor: `${colors.yellow}40`,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  xpChipText: { fontSize: 16 },
  xpChipLabel: { fontSize: 12, fontWeight: '700', color: colors.dark },
  xpHighlight: { color: colors.yellow, fontWeight: '900' },

  list: { gap: spacing.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: `${colors.grey}35`,
    position: 'relative',
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.successBg,
  },

  recommendedBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recommendedText: { color: colors.white, fontWeight: '900', fontSize: 9 },

  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.lg, // push down from badge
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: `${colors.grey}50`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },

  cardText: { flex: 1 },
  nameAr: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.dark,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  nameEn: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.charcoal,
    marginTop: 2,
  },
  sample: {
    fontSize: 18,
    marginTop: spacing.xs,
    color: colors.dark,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 34,
    fontWeight: '500',
  },
});
