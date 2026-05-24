import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { AppText } from '../ui/AppText';
import { PrimaryButton } from '../ui/PrimaryButton';
import { LessonShell } from './LessonShell';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { copy } from '../../i18n/copy';
import { AudioPlayButton } from '../ui/AudioPlayButton';
import { resolveAyahAudioUrl } from '../../services/reciters';
import { getReciterId } from '../../utils/storage';
import type { ExerciseStep } from '../../lesson/types';
interface Props {
  step: ExerciseStep;
  stepIndex: number;
  total: number;
  hearts: number;
  onClose: () => void;
  onComplete: (correct: boolean) => void;
}

export function ExerciseRenderer({
  step,
  stepIndex,
  total,
  hearts,
  onClose,
  onComplete,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [filledWord, setFilledWord] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const reciterId = await getReciterId();
      const url = await resolveAyahAudioUrl(step.ayah, reciterId);
      if (!cancelled) {
        setAudioUrl(url);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step.ayah]);

  const resetLocal = () => {
    setSelected(null);
    setChecked(false);
    setFilledWord(null);
    setOrder([]);
  };

  const handleCheck = () => {
    let correct = false;
    switch (step.type) {
      case 'listen':
      case 'interstitial':
        correct = true;
        break;
      case 'fill_blank': {
        const pos = step.blankPosition ?? 0;
        const word = step.ayah.words[pos]?.arabic;
        correct = filledWord === word;
        break;
      }
      case 'reorder':
        correct =
          order.join('|') ===
          step.ayah.words.map(w => w.arabic).join('|');
        break;
      case 'match_meaning':
      case 'mcq':
        correct = selected === step.correctIndex;
        break;
      case 'listen_repeat':
        correct = true;
        break;
      default:
        correct = true;
    }
    setIsCorrect(correct);
    setChecked(true);
  };

  const handleContinue = () => {
    onComplete(isCorrect);
    resetLocal();
  };

  const prompt = () => {
    switch (step.type) {
      case 'listen':
        return 'Listen to the recitation';
      case 'fill_blank':
        return copy.lesson.check.replace('Check', 'Complete the ayah');
      case 'reorder':
        return 'Put the words in order';
      case 'match_meaning':
        return 'Choose the correct meaning';
      case 'listen_repeat':
        return 'Listen and repeat aloud';
      case 'interstitial':
        return copy.streakGoal.tip;
      default:
        return 'Choose the correct answer';
    }
  };

  const canCheck = () => {
    if (step.type === 'listen' || step.type === 'interstitial' || step.type === 'listen_repeat') {
      return true;
    }
    if (step.type === 'fill_blank') return filledWord != null;
    if (step.type === 'reorder') return order.length === step.ayah.words.length;
    return selected != null;
  };

  const renderBody = () => {
    if (step.type === 'interstitial') {
      return (
        <View style={styles.center}>
          <LogoSmall />
          <AppText variant="h2" style={styles.centerText}>
            {copy.streakGoal.tip}
          </AppText>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppText variant="h2" style={styles.prompt}>
          {prompt()}
        </AppText>

        {(step.type === 'listen' || step.type === 'listen_repeat') && (
          <AudioPlayButton url={audioUrl} label={copy.lesson.playAudio} />
        )}

        <AppText variant="arabic" style={styles.ayah}>
          {step.ayah.arabic}
        </AppText>

        {step.type === 'fill_blank' && (
          <View style={styles.chips}>
            {step.ayah.words.map(w => (
              <Pressable
                key={w.position}
                onPress={() => setFilledWord(w.arabic)}
                style={[
                  styles.chip,
                  filledWord === w.arabic && styles.chipSelected,
                ]}>
                <AppText variant="arabic">{w.arabic}</AppText>
              </Pressable>
            ))}
          </View>
        )}

        {step.type === 'reorder' && (
          <>
            <View style={styles.answerRow}>
              {order.map((w, i) => (
                <Pressable
                  key={`${w}-${i}`}
                  onPress={() => setOrder(order.filter((_, j) => j !== i))}
                  style={styles.chip}>
                  <AppText variant="arabic">{w}</AppText>
                </Pressable>
              ))}
            </View>
            <View style={styles.chips}>
              {step.ayah.words
                .map(w => w.arabic)
                .filter(w => !order.includes(w) || order.filter(x => x === w).length < step.ayah.words.filter(y => y.arabic === w).length)
                .map((w, i) => (
                  <Pressable
                    key={`${w}-${i}`}
                    onPress={() => setOrder([...order, w])}
                    style={styles.chip}>
                    <AppText variant="arabic">{w}</AppText>
                  </Pressable>
                ))}
            </View>
          </>
        )}

        {(step.type === 'match_meaning' || step.type === 'mcq') &&
          step.options?.map((opt, i) => (
            <Pressable
              key={opt}
              onPress={() => !checked && setSelected(i)}
              style={[
                styles.option,
                selected === i && styles.optionSelected,
                checked && i === step.correctIndex && styles.optionCorrect,
                checked && selected === i && i !== step.correctIndex && styles.optionWrong,
              ]}>
              <AppText>{opt}</AppText>
            </Pressable>
          ))}
      </ScrollView>
    );
  };

  return (
    <LessonShell
      step={stepIndex}
      total={total}
      hearts={hearts}
      onClose={onClose}
      feedback={
        checked ? (
          <View
            style={[
              styles.feedback,
              isCorrect ? styles.feedbackOk : styles.feedbackBad,
            ]}>
            <AppText variant="h2" style={{ color: colors.primary }}>
              {isCorrect ? copy.lesson.correct : copy.lesson.incorrect}
            </AppText>
          </View>
        ) : null
      }
      footer={
        checked ? (
          <PrimaryButton title={copy.lesson.continue} onPress={handleContinue} />
        ) : (
          <PrimaryButton
            title={step.type === 'listen' ? copy.lesson.continue : copy.lesson.check}
            onPress={handleCheck}
            variant={canCheck() ? 'primary' : 'disabled'}
            disabled={!canCheck()}
          />
        )
      }>
      {renderBody()}
    </LessonShell>
  );
}

function LogoSmall() {
  return <View style={styles.logo} />;
}

const styles = StyleSheet.create({
  prompt: { marginBottom: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerText: { textAlign: 'center', marginTop: spacing.lg },
  ayah: { marginVertical: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.ash,
    borderRadius: 20,
  },
  chipSelected: { borderWidth: 2, borderColor: colors.primary },
  answerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: 48,
    borderBottomWidth: 2,
    borderColor: colors.grey,
    marginBottom: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  option: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.buttonSecondaryBg,
    marginBottom: spacing.sm,
  },
  optionSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.ash },
  optionCorrect: { borderColor: colors.primary, backgroundColor: colors.successBg },
  optionWrong: { borderColor: colors.heart, backgroundColor: colors.errorBg },
  feedback: { padding: spacing.md },
  feedbackOk: { backgroundColor: colors.successBg },
  feedbackBad: { backgroundColor: colors.errorBg },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: colors.primary,
    borderRadius: 16,
  },
});
