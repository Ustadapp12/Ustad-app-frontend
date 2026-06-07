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

  useAbandonLessonOnBackground();

  const leaveLesson = useCallback(async () => {
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

    try {
      await recordAttempt(step.type, correct, correct ? 0 : 1);
      if (isLast) {
        const result = await completeSession();
        invalidateLevels(); // bust cache so HomeScreen re-fetches fresh levels
        await refreshLearning({ force: true });
        const scorePct = Math.round(
          (useLessonStore.getState().correctCount / Math.max(steps.length, 1)) *
            100,
        );
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
