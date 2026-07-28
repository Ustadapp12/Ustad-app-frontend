import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CHARACTERS, ExerciseSlide, FillBlankOrNextWord, LessonHeader, ReadAndSpeak,
} from '../lesson/LessonSessionScreen';
import TourOverlay from '../../components/tour/TourOverlay';
import {
  TOUR_MISTAKES, TOUR_PROGRESS_FRACTION, TOUR_SURAH_NAME, tourExerciseForStep,
} from '../../components/tour/tourExercises';
import { FIRST_LESSON_STEP } from '../../components/tour/tourSteps';
import { useTourStore } from '../../store/tourStore';
import { colors } from '../../theme/colors';
import type { RootNavProp } from '../../navigation/types';
import type { TourTargetKey } from '../../components/tour/tourSteps';

interface Props { navigation: RootNavProp }

/**
 * The lesson half of the guided tour (spec steps 4–11).
 *
 * This is not a mock-up of the lesson screen — it renders the very same
 * `LessonHeader` and exercise components that LessonSessionScreen does, fed
 * hardcoded Surah An-Nas content. That's the whole point: a new user is shown
 * the real thing, and it can't drift out of date, because there's only one
 * copy of it.
 *
 * What it deliberately does NOT do is talk to the server. No session is
 * started, no attempt is submitted, no heart is spent and no XP is banked —
 * TOUR_EXERCISES is static and every handler below is a no-op. The exercise
 * area is also inert (`pointerEvents="none"`): the tour narrates, and the real
 * exercise components would otherwise start audio playback or ask for
 * microphone permission behind the overlay card.
 */
export default function TourLessonScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const stepIndex = useTourStore(s => s.stepIndex);
  const setRect = useTourStore(s => s.setRect);

  const progressRef = useRef<View>(null);
  const heartsRef = useRef<View>(null);
  const hintRef = useRef<View>(null);
  const exerciseRef = useRef<View>(null);

  const measure = useCallback((ref: React.RefObject<View | null>, key: TourTargetKey) => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) setRect(key, { x, y, width, height });
    });
  }, [setRect]);

  // Measured after layout has settled. One pass on mount is enough — nothing
  // in this screen reflows, since the exercise underneath never changes size.
  useEffect(() => {
    const timer = setTimeout(() => {
      measure(progressRef, 'lessonProgress');
      measure(heartsRef, 'lessonHearts');
      measure(hintRef, 'lessonHint');
      measure(exerciseRef, 'lessonExercise');
    }, 220);
    return () => clearTimeout(timer);
  }, [measure]);

  const exercise = tourExerciseForStep(stepIndex, FIRST_LESSON_STEP);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LessonHeader
        mistakes={TOUR_MISTAKES}
        progressFraction={TOUR_PROGRESS_FRACTION}
        hintUrl={exercise.ayah_audio_url}
        hintAyahAr={exercise.ayah_ar}
        hintAyahTranslation={exercise.ayah_translation}
        onExit={() => navigation.goBack()}
        targets={{ progress: progressRef, hearts: heartsRef, hint: hintRef }}
      />

      <View ref={exerciseRef} collapsable={false} style={styles.exerciseArea} pointerEvents="none">
        <ExerciseSlide key={exercise.ex_id}>
          {exercise.type === 'read_and_speak' ? (
            <ReadAndSpeak
              ex={exercise}
              surahName={TOUR_SURAH_NAME}
              character={CHARACTERS[0]}
              onSpeakScored={() => { /* unreachable — the area is inert */ }}
            />
          ) : (
            <FillBlankOrNextWord
              ex={exercise}
              surahName={TOUR_SURAH_NAME}
              character={CHARACTERS[0]}
              onSubmit={() => { /* narration only — the tour never grades */ }}
            />
          )}
        </ExerciseSlide>
      </View>

      <TourOverlay screen="lesson" onFinish={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.lightBg },
  exerciseArea: { flex: 1 },
});
