import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ActivityIndicator, View, Pressable, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { ExerciseRenderer } from '../../components/lesson/ExerciseRenderer';
import { useAbandonLessonOnBackground } from '../../hooks/useAbandonLessonOnBackground';
import { useLessonStore } from '../../store/lessonStore';
import { useAuthStore } from '../../store/authStore';
import { invalidateLevels } from '../../services/bootCache';
import {
  AnalyticsEvents,
  logAnalyticsEvent,
  logUserStruggling,
} from '../../services/analytics';
import { setCrashContext, clearCrashContext, addBreadcrumb } from '../../services/crashReporter';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { copy } from '../../i18n/copy';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonSession'>;

export function LessonSessionScreen({ navigation }: Props) {
  const {
    steps,
    stepIndex,
    sessionId,
    heartsAtStart,
    mistakes,
    loading,
    recordAttempt,
    nextStep,
    completeSession,
    abandonSession,
    reset,
  } = useLessonStore();
  const refreshLearning = useAuthStore(s => s.refreshLearning);
  const completingRef = useRef(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  // Per-exercise analytics tracking
  const stepFailCountRef = useRef(0);   // wrong attempts on current step
  const stepStartMsRef = useRef(Date.now()); // wall-clock start of current step

  useAbandonLessonOnBackground();

  const leaveLesson = useCallback(async () => {
    clearCrashContext();
    await abandonSession({ silent: true });
    reset();
    navigation.goBack();
  }, [abandonSession, reset, navigation]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', e => {
      const { sessionId: sid, result: res } = useLessonStore.getState();
      if (!sid || res) return;
      e.preventDefault();
      Alert.alert(copy.lesson.exitTitle, copy.lesson.exitBody, [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await abandonSession({ silent: true });
              reset();
              navigation.dispatch(e.data.action);
            })();
          },
        },
      ]);
    });
    return unsub;
  }, [navigation, abandonSession, reset]);

  const hearts = Math.max(0, heartsAtStart - mistakes);
  const step = steps[stepIndex];

  // Update Sentry context whenever the active step changes
  useEffect(() => {
    if (!step) return;
    stepFailCountRef.current = 0;
    stepStartMsRef.current = Date.now();
    const ayahKey = `${step.ayah.surah_number}:${step.ayah.ayah_number}`;
    setCrashContext({
      screen: 'LessonSession',
      exercise_type: step.type,
      ayah_id: ayahKey,
      surah_id: step.ayah.surah_number,
      session_id: sessionId ?? undefined,
      step_index: stepIndex,
    });
    // Fire exercise_started for answerable steps only
    if (step.type !== 'listen' && step.type !== 'interstitial' && sessionId) {
      void logAnalyticsEvent(AnalyticsEvents.EXERCISE_STARTED, {
        exercise_type: step.type,
        surah_id: step.ayah.surah_number,
        ayah_id: ayahKey,
        step_index: stepIndex,
        session_id: sessionId,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, sessionId]);

  if (loading || !step || !sessionId) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  const onClose = () => {
    Alert.alert(copy.lesson.exitTitle, copy.lesson.exitBody, [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          void leaveLesson();
        },
      },
    ]);
  };

  const onComplete = async (correct: boolean) => {
    if (completingRef.current) return;

    const isLast = stepIndex + 1 >= steps.length;
    if (isLast) completingRef.current = true;

    const timeSpentMs = Date.now() - stepStartMsRef.current;
    const ayahKey = `${step.ayah.surah_number}:${step.ayah.ayah_number}`;
    const isAnswerable = step.type !== 'listen' && step.type !== 'interstitial';

    // ── Per-exercise analytics ────────────────────────────────────
    if (isAnswerable) {
      if (correct) {
        void logAnalyticsEvent(AnalyticsEvents.EXERCISE_COMPLETED, {
          exercise_type: step.type,
          surah_id: step.ayah.surah_number,
          ayah_id: ayahKey,
          step_index: stepIndex,
          time_spent_ms: timeSpentMs,
          attempts: stepFailCountRef.current + 1,
          session_id: sessionId ?? undefined,
        });
      } else {
        stepFailCountRef.current += 1;
        void logAnalyticsEvent(AnalyticsEvents.EXERCISE_FAILED, {
          exercise_type: step.type,
          surah_id: step.ayah.surah_number,
          ayah_id: ayahKey,
          step_index: stepIndex,
          time_spent_ms: timeSpentMs,
          attempts: stepFailCountRef.current,
          session_id: sessionId ?? undefined,
        });

        // ── Friction detection ──────────────────────────────────
        const highAttempts = stepFailCountRef.current >= 3;
        const slowCompletion = timeSpentMs > 120_000;
        if (highAttempts || slowCompletion) {
          void logUserStruggling({
            exercise_type: step.type,
            ayah_id: ayahKey,
            surah_id: step.ayah.surah_number,
            reason: highAttempts && slowCompletion ? 'both'
              : highAttempts ? 'high_attempts'
              : 'slow_completion',
            attempts: stepFailCountRef.current,
            time_spent_ms: timeSpentMs,
          });
        }
      }
    }

    addBreadcrumb(`exercise ${correct ? 'correct' : 'wrong'}: ${step.type}`, 'lesson', {
      ayah_id: ayahKey, step_index: stepIndex,
    });

    try {
      await recordAttempt(step.type, correct, correct ? 0 : 1);
      if (isLast) {
        const result = await completeSession();
        invalidateLevels();
        await refreshLearning({ force: true });
        // Use answerable-steps count so listen/interstitial don't deflate score
        const state = useLessonStore.getState();
        const answerableCount = steps.filter(
          s => s.type !== 'listen' && s.type !== 'interstitial',
        ).length;
        const scorePct = Math.round(
          (state.correctCount / Math.max(answerableCount, 1)) * 100,
        );
        clearCrashContext();
        navigation.replace('LessonComplete', {
          xp: result.xp_awarded,
          scorePct,
          stars: result.stars,
          gems: result.completion_saved ? 5 : 0,
          heartsRemaining: result.hearts_remaining,
        });
        reset();
      } else {
        nextStep();
      }
    } catch (e) {
      if (isLast) {
        completingRef.current = false;
        setCompleteError(e instanceof Error ? e.message : 'Could not complete lesson');
      }
    }
  };

  return (
    <Screen>
      <ExerciseRenderer
        step={step}
        stepIndex={stepIndex}
        total={steps.length}
        hearts={hearts}
        sessionId={sessionId}
        onClose={onClose}
        onComplete={onComplete}
      />

      {completeError ? (
        <View style={styles.errorOverlay}>
          <View style={styles.errorCard}>
            <AppText style={styles.errorTitle}>Couldn't save result</AppText>
            <AppText style={styles.errorBody}>{completeError}</AppText>
            <Pressable
              style={styles.retryBtn}
              onPress={() => { setCompleteError(null); void onComplete(true); }}>
              <AppText style={styles.retryText}>Retry</AppText>
            </Pressable>
            <Pressable style={styles.leaveLink} onPress={() => void leaveLesson()}>
              <AppText style={styles.leaveLinkText}>Leave lesson</AppText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.screenHorizontal,
  },
  errorCard: {
    backgroundColor: colors.dark,
    borderRadius: 20,
    padding: spacing.xl,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.heart}40`,
  },
  errorTitle: { color: colors.white, fontWeight: '900', fontSize: 18, marginBottom: spacing.sm },
  errorBody: { color: colors.grey, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  retryText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  leaveLink: { marginTop: spacing.md, paddingVertical: spacing.sm },
  leaveLinkText: { color: colors.grey, fontWeight: '700', fontSize: 13, textDecorationLine: 'underline' },
});
