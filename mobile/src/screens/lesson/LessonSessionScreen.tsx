import React from 'react';
import { Alert, ActivityIndicator, View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { ExerciseRenderer } from '../../components/lesson/ExerciseRenderer';
import { useLessonStore } from '../../store/lessonStore';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
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
    reset,
  } = useLessonStore();
  const refreshLearning = useAuthStore(s => s.refreshLearning);

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
          reset();
          navigation.goBack();
        },
      },
    ]);
  };

  const onComplete = async (correct: boolean) => {
    await recordAttempt(step.type, correct, correct ? 0 : 1);
    if (stepIndex + 1 >= steps.length) {
      try {
        const result = await completeSession();
        await refreshLearning();
        const scorePct = Math.round(
          (useLessonStore.getState().correctCount / Math.max(steps.length, 1)) *
            100,
        );
        navigation.replace('LessonComplete', {
          xp: result.xp_awarded,
          scorePct,
          stars: result.stars,
          gems: result.completion_saved ? 5 : 0,
        });
        reset();
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not complete');
      }
    } else {
      nextStep();
    }
  };

  return (
    <Screen edges={[]}>
      <ExerciseRenderer
        step={step}
        stepIndex={stepIndex}
        total={steps.length}
        hearts={hearts}
        onClose={onClose}
        onComplete={onComplete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
