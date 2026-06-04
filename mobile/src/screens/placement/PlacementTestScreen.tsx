import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Screen } from '../../components/ui/Screen';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { PLACEMENT_QUESTIONS } from '../../data/placementQuestions';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlacementTest'>;

const SHEIKH = { emoji: '🧔🏽‍♂️', name: 'Sheikh Ahmad', color: colors.primary };
const SHEIKHA = { emoji: '🧕🏽', name: 'Sheikha Fatima', color: colors.yellow };

export function PlacementTestScreen({ navigation }: Props) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(PLACEMENT_QUESTIONS.length).fill(null),
  );
  const slideAnim = useRef(new Animated.Value(300)).current;

  const q = PLACEMENT_QUESTIONS[index];
  const isCorrect = selected === q.correctIndex;
  const teacher = q.teacher === 'sheikh' ? SHEIKH : SHEIKHA;
  const progress = ((index + (checked && isCorrect ? 1 : 0)) / PLACEMENT_QUESTIONS.length) * 100;

  useEffect(() => {
    slideAnim.setValue(300);
  }, [index, slideAnim]);

  const onCheck = () => {
    if (selected == null) return;
    const next = [...answers];
    next[index] = selected;
    setAnswers(next);
    setChecked(true);

    if (!isCorrect) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 25,
        stiffness: 300,
      }).start();
    } else {
      setTimeout(() => advance(next), 1200);
    }
  };

  const advance = (savedAnswers: (number | null)[]) => {
    if (index < PLACEMENT_QUESTIONS.length - 1) {
      setIndex(i => i + 1);
      setSelected(null);
      setChecked(false);
    } else {
      navigation.replace('PlacementResults', { answers: savedAnswers });
    }
  };

  const onGotIt = () => {
    const saved = [...answers];
    setSelected(null);
    setChecked(false);
    slideAnim.setValue(300);
    setTimeout(() => advance(saved), 50);
  };

  return (
    <Screen style={styles.screen}>
      <IrabBackground color={colors.primary} />

      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* Teacher avatar + speech bubble */}
        <View style={styles.teacherRow}>
          <View style={[styles.avatar, { backgroundColor: `${teacher.color}20`, borderColor: teacher.color }]}>
            <AppText style={styles.avatarEmoji}>{teacher.emoji}</AppText>
          </View>
          <View style={styles.bubble}>
            <AppText style={[styles.bubbleName, { color: teacher.color }]}>
              {teacher.name} asks:
            </AppText>
            <AppText style={styles.bubbleText}>{q.teacherIntro}</AppText>
            <View style={styles.bubbleTail} />
          </View>
        </View>

        {/* Prompt label */}
        <AppText style={styles.promptLabel}>{q.promptLabel}</AppText>

        {/* Prompt card */}
        <View style={styles.promptCard}>
          <View style={styles.promptGlow} />
          {q.promptIsSymbol ? (
            <>
              <AppText style={styles.symbolText}>{q.promptAr}</AppText>
              {q.promptNote ? (
                <AppText style={styles.promptNote}>{q.promptNote}</AppText>
              ) : null}
            </>
          ) : (
            <AppText style={styles.promptAr}>{q.promptAr}</AppText>
          )}
        </View>

        {/* Options */}
        {q.layout === 'grid' ? (
          <View style={styles.grid}>
            {q.options.map((opt, i) => (
              <OptionButton
                key={opt}
                label={opt}
                isAr={q.optionAr}
                picked={selected === i}
                checked={checked}
                correct={i === q.correctIndex}
                disabled={checked}
                onPress={() => setSelected(i)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.column}>
            {q.options.map((opt, i) => (
              <OptionButton
                key={opt}
                label={opt}
                isAr={q.optionAr}
                picked={selected === i}
                checked={checked}
                correct={i === q.correctIndex}
                disabled={checked}
                onPress={() => setSelected(i)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Check button */}
      {!checked && (
        <View style={styles.footer}>
          <PrimaryButton
            title="Check"
            onPress={onCheck}
            variant={selected != null ? 'primary' : 'disabled'}
            disabled={selected == null}
          />
        </View>
      )}

      {/* Red error panel sliding up */}
      <Animated.View
        style={[styles.errorPanel, { transform: [{ translateY: slideAnim }] }]}
        pointerEvents={checked && !isCorrect ? 'auto' : 'none'}>
        <View style={styles.errorHeader}>
          <View style={styles.errorIcon}>
            <AppText style={styles.errorX}>✕</AppText>
          </View>
          <AppText style={styles.errorTitle}>Incorrect</AppText>
        </View>
        <AppText style={styles.correctLabel}>Correct Answer:</AppText>
        <AppText
          style={[
            styles.correctAnswer,
            q.optionAr && styles.correctAnswerAr,
          ]}>
          {q.options[q.correctIndex]}
        </AppText>
        <Pressable style={styles.gotItBtn} onPress={onGotIt}>
          <AppText style={styles.gotItText}>GOT IT</AppText>
        </Pressable>
      </Animated.View>
    </Screen>
  );
}

function OptionButton({
  label,
  isAr,
  picked,
  checked,
  correct,
  disabled,
  onPress,
}: {
  label: string;
  isAr: boolean;
  picked: boolean;
  checked: boolean;
  correct: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const showGreen = checked && correct;
  const showRed = checked && picked && !correct;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.option,
        picked && !checked && styles.optionPicked,
        showGreen && styles.optionCorrect,
        showRed && styles.optionWrong,
      ]}>
      <AppText
        style={[
          styles.optionText,
          isAr && styles.optionTextAr,
          showGreen && styles.optionTextGreen,
          showRed && styles.optionTextRed,
        ]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.ash },
  progressWrap: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    zIndex: 1,
  },
  progressTrack: {
    height: 16,
    backgroundColor: `${colors.grey}30`,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.yellow,
    borderRadius: 99,
  },
  scroll: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xl + 80,
  },

  // Teacher
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarEmoji: { fontSize: 28, lineHeight: 34 },
  bubble: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: `${colors.grey}25`,
    position: 'relative',
  },
  bubbleTail: {
    position: 'absolute',
    left: -8,
    top: 14,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: `${colors.grey}25`,
  },
  bubbleName: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  bubbleText: { fontWeight: '700', color: colors.dark, fontSize: 13, lineHeight: 19 },

  // Prompt
  promptLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  promptCard: {
    borderRadius: 24,
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: `${colors.yellow}15`,
    borderWidth: 3,
    borderColor: colors.yellow,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  promptGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.yellow}15`,
  },
  promptAr: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.dark,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 52,
  },
  symbolText: {
    fontSize: 72,
    color: colors.dark,
    fontWeight: '700',
    lineHeight: 96,
  },
  promptNote: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.charcoal,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Options
  column: { gap: spacing.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: `${colors.grey}25`,
    // grid items take ~50% minus gap
    minWidth: '47%',
    flex: 1,
    alignItems: 'center',
  },
  optionPicked: {
    borderColor: colors.yellow,
    backgroundColor: `${colors.yellow}12`,
    shadowColor: colors.yellow,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  optionCorrect: {
    borderColor: colors.primary,
    backgroundColor: colors.successBg,
  },
  optionWrong: {
    borderColor: colors.heart,
    backgroundColor: colors.errorBg,
  },
  optionText: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.dark,
    textAlign: 'center',
  },
  optionTextAr: {
    fontSize: 18,
    lineHeight: 32,
    writingDirection: 'rtl',
  },
  optionTextGreen: { color: colors.primary },
  optionTextRed: { color: colors.heart },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.ash,
  },

  // Error panel
  errorPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 8,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  errorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorX: { color: colors.white, fontWeight: '900', fontSize: 18 },
  errorTitle: { color: colors.white, fontWeight: '900', fontSize: 20 },
  correctLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  correctAnswer: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 20,
    marginBottom: spacing.lg,
  },
  correctAnswerAr: {
    fontSize: 24,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  gotItBtn: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gotItText: { color: colors.white, fontWeight: '900', fontSize: 16 },
});
