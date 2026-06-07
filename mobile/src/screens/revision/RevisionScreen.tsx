import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { EmojiText } from '../../components/ui/EmojiText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { JourneyTopBar } from '../../components/ui/JourneyTopBar';
import { useAuthStore } from '../../store/authStore';
import { learningApi } from '../../api';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { ExerciseOut } from '../../types/api';

const EXERCISE_LABELS: Record<string, string> = {
  listen: 'Listening',
  match_meaning: 'Match Meaning',
  word_meaning: 'Word Meaning',
  fill_blank: 'Fill Blank',
  reorder: 'Reorder',
  continue_ayah: 'Continue Ayah',
  sequence_order: 'Sequence Order',
  listen_repeat: 'Listen & Repeat',
};

export function RevisionScreen() {
  const learning = useAuthStore(s => s.learning);
  const [exercises, setExercises] = useState<ExerciseOut[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const exerciseStartedAtRef = useRef(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setIndex(0);
    try {
      const data = await learningApi.weakExercises(20);
      setExercises(data);
    } catch {
      setExercises([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const exercise = exercises[index] ?? null;
  const empty = !loading && exercises.length === 0;
  const done = !loading && index >= exercises.length && exercises.length > 0;

  useEffect(() => {
    if (exercise?.id) {
      exerciseStartedAtRef.current = Date.now();
    }
  }, [index, exercise?.id]);

  const logAttempt = async (correct: boolean) => {
    if (!exercise?.id) return;
    setSubmitting(true);
    try {
      await learningApi.exerciseAttempt({
        exercise_id: exercise.id,
        session_id: `revision_${Date.now()}`,
        correct,
        response_ms: Date.now() - exerciseStartedAtRef.current,
        mistake_count: correct ? 0 : 1,
      });
    } catch {
      // non-fatal — still advance
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = async (correct: boolean) => {
    await logAttempt(correct);
    setIndex(i => i + 1);
  };

  if (loading) {
    return (
      <Screen style={styles.centerScreen}>
        <ActivityIndicator color={colors.yellow} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <JourneyTopBar
        streak={learning?.current_streak}
        xp={learning?.xp_total}
        hearts={learning?.hearts_remaining}
      />
      <View style={styles.content}>
        <AppText variant="h1" style={styles.title}>
          {copy.revision.title}
        </AppText>

        {loadError ? (
          <View style={styles.emptyCard}>
            <EmojiText size={48}>📡</EmojiText>
            <AppText style={styles.empty}>Couldn't load exercises.{'\n'}Check your connection and try again.</AppText>
            <Pressable onPress={load} style={styles.retryBtn}>
              <AppText style={styles.retryText}>Retry</AppText>
            </Pressable>
          </View>
        ) : empty ? (
          <View style={styles.emptyCard}>
            <EmojiText size={48}>📖</EmojiText>
            <AppText style={styles.empty}>{copy.revision.empty}</AppText>
          </View>
        ) : done ? (
          <View style={styles.emptyCard}>
            <EmojiText size={48}>🎉</EmojiText>
            <AppText style={styles.empty}>All caught up! You reviewed {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}.</AppText>
          </View>
        ) : exercise ? (
          <>
            <View style={styles.progressRow}>
              <AppText style={styles.progressText}>{index + 1} / {exercises.length}</AppText>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${((index + 1) / exercises.length) * 100}%` }]} />
              </View>
            </View>

            <View style={styles.exerciseCard}>
              <View style={styles.typeBadge}>
                <AppText style={styles.typeBadgeText}>
                  {EXERCISE_LABELS[exercise.type] ?? exercise.type}
                </AppText>
              </View>

              <AppText style={styles.surahRef}>
                Surah {exercise.surah_no} · Ayah {exercise.ayah_no}
              </AppText>

              {exercise.prompt_ar ? (
                <AppText variant="arabic" style={styles.arabicText}>
                  {exercise.prompt_ar}
                </AppText>
              ) : null}

              {exercise.prompt_en ? (
                <AppText style={styles.promptEn}>{exercise.prompt_en}</AppText>
              ) : null}

              {exercise.options && exercise.options.length > 0 ? (
                <View style={styles.optionsPreview}>
                  {exercise.options.slice(0, 2).map((opt, i) => (
                    <View key={i} style={styles.optionPill}>
                      <AppText style={styles.optionText} numberOfLines={1}>{opt.text}</AppText>
                    </View>
                  ))}
                  {exercise.options.length > 2 ? (
                    <AppText style={styles.moreOptions}>+{exercise.options.length - 2} more</AppText>
                  ) : null}
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </View>

      {!loadError && !empty && !done && exercise ? (
        <View style={styles.footer}>
          <View style={styles.answerRow}>
            <Pressable
              style={[styles.answerBtn, styles.wrongBtn]}
              onPress={() => handleAnswer(false)}
              disabled={submitting}>
              <AppText style={styles.answerBtnText}>✗  Missed it</AppText>
            </Pressable>
            <Pressable
              style={[styles.answerBtn, styles.correctBtn]}
              onPress={() => handleAnswer(true)}
              disabled={submitting}>
              <AppText style={styles.answerBtnText}>✓  Knew it</AppText>
            </Pressable>
          </View>
        </View>
      ) : done ? (
        <View style={styles.footer}>
          <PrimaryButton title="Review again" onPress={load} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark, flex: 1 },
  centerScreen: {
    flex: 1,
    backgroundColor: colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, padding: spacing.screenHorizontal },
  title: { color: colors.white, marginBottom: spacing.md },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  progressText: { color: colors.grey, fontSize: 12, fontWeight: '700', width: 48 },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },

  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: `${colors.white}10`,
    borderRadius: 16,
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  empty: { color: colors.grey, textAlign: 'center', fontWeight: '600', lineHeight: 22 },
  retryBtn: {
    marginTop: spacing.md,
    backgroundColor: `${colors.primary}20`,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  retryText: { color: colors.primary, fontWeight: '800', fontSize: 14 },

  exerciseCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  typeBadgeText: { color: colors.primary, fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  surahRef: { color: colors.charcoal, fontWeight: '700', fontSize: 12, marginBottom: spacing.sm },
  arabicText: {
    fontSize: 26,
    textAlign: 'center',
    color: colors.dark,
    marginVertical: spacing.md,
    lineHeight: 42,
  },
  promptEn: { color: colors.charcoal, lineHeight: 22, fontWeight: '500', marginTop: spacing.xs },
  optionsPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  optionPill: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    maxWidth: '48%',
  },
  optionText: { color: colors.charcoal, fontSize: 12, fontWeight: '600' },
  moreOptions: { color: colors.grey, fontSize: 11, fontWeight: '600', alignSelf: 'center' },

  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.xl },
  answerRow: { flexDirection: 'row', gap: spacing.sm },
  answerBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrongBtn: { backgroundColor: `${colors.heart}20`, borderWidth: 1, borderColor: `${colors.heart}40` },
  correctBtn: { backgroundColor: `${colors.primary}25`, borderWidth: 1, borderColor: `${colors.primary}50` },
  answerBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
