import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ProgressHeader } from '../../components/ui/ProgressHeader';
import { Mascot } from '../../components/ui/Mascot';
import { Screen } from '../../components/ui/Screen';
import { PLACEMENT_QUESTIONS } from '../../data/placementQuestions';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlacementTest'>;

export function PlacementTestScreen({ navigation }: Props) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(PLACEMENT_QUESTIONS.length).fill(null),
  );

  const q = PLACEMENT_QUESTIONS[index];
  const isCorrect = selected === q.correctIndex;

  const onCheck = () => {
    if (selected == null) return;
    setChecked(true);
    const next = [...answers];
    next[index] = selected;
    setAnswers(next);
  };

  const onContinue = () => {
    if (index < PLACEMENT_QUESTIONS.length - 1) {
      setIndex(index + 1);
      setSelected(null);
      setChecked(false);
    } else {
      navigation.replace('PlacementResults', { answers: nextAnswers() });
    }
  };

  const nextAnswers = () => {
    const next = [...answers];
    next[index] = selected;
    return next;
  };

  return (
    <Screen style={styles.screen}>
      <ProgressHeader
        step={index}
        total={PLACEMENT_QUESTIONS.length}
        onBack={() => (index > 0 ? setIndex(index - 1) : navigation.goBack())}
      />
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${((index + (checked ? 1 : 0)) / PLACEMENT_QUESTIONS.length) * 100}%`,
            },
          ]}
        />
      </View>

      <View style={styles.teacherRow}>
        <Mascot size={56} />
        <View style={styles.bubble}>
          <AppText style={styles.bubbleText}>{copy.placement.teacherHint}</AppText>
        </View>
      </View>

      <AppText variant="caption" style={styles.promptEn}>
        {q.promptEn}
      </AppText>
      <AppText style={styles.promptAr}>{q.promptAr}</AppText>

      <View style={styles.options}>
        {q.options.map((opt, i) => {
          const picked = selected === i;
          const showResult = checked && picked;
          const showCorrect = checked && i === q.correctIndex;
          return (
            <Pressable
              key={opt}
              disabled={checked}
              onPress={() => setSelected(i)}
              style={[
                styles.option,
                picked && !checked && styles.optionPicked,
                showCorrect && styles.optionCorrect,
                showResult && !isCorrect && styles.optionWrong,
              ]}>
              <AppText style={styles.optionText}>{opt}</AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        {checked ? (
          <View
            style={[
              styles.feedback,
              isCorrect ? styles.feedbackOk : styles.feedbackBad,
            ]}>
            <AppText style={styles.feedbackText}>
              {isCorrect ? copy.lesson.correct : copy.lesson.incorrect}
            </AppText>
          </View>
        ) : null}
        <PrimaryButton
          title={checked ? copy.lesson.continue : copy.lesson.check}
          onPress={checked ? onContinue : onCheck}
          variant={selected != null ? 'primary' : 'disabled'}
          disabled={selected == null}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.ash },
  progressTrack: {
    height: 4,
    backgroundColor: colors.progressTrack,
    marginHorizontal: spacing.screenHorizontal,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.progressFill,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.screenHorizontal,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  bubble: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: `${colors.primary}30`,
  },
  bubbleText: { fontWeight: '600', color: colors.charcoal, fontSize: 13 },
  promptEn: {
    paddingHorizontal: spacing.screenHorizontal,
    marginTop: spacing.lg,
    color: colors.charcoal,
  },
  promptAr: {
    fontSize: 28,
    textAlign: 'center',
    color: colors.dark,
    paddingHorizontal: spacing.screenHorizontal,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  options: {
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.sm,
    flex: 1,
  },
  option: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: `${colors.grey}35`,
  },
  optionPicked: {
    borderColor: colors.primary,
    backgroundColor: colors.successBg,
  },
  optionCorrect: {
    borderColor: colors.primary,
    backgroundColor: colors.successBg,
  },
  optionWrong: {
    borderColor: colors.heart,
    backgroundColor: colors.errorBg,
  },
  optionText: { fontWeight: '700', fontSize: 15, color: colors.dark },
  footer: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  feedback: {
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  feedbackOk: { backgroundColor: colors.successBg },
  feedbackBad: { backgroundColor: colors.errorBg },
  feedbackText: { fontWeight: '800', color: colors.primary },
});
