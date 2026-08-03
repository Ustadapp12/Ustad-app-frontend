import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CHARACTERS, ExerciseSlide, FeedbackBanner, FillBlankOrNextWord, LessonHeader, ReadAndSpeak,
} from '../lesson/LessonSessionScreen';
import TourOverlay from '../../components/tour/TourOverlay';
import {
  TOUR_FEEDBACK_RESULT, TOUR_MISTAKES, TOUR_PROGRESS_FRACTION, TOUR_SURAH_NAME, tourExerciseForStep,
} from '../../components/tour/tourExercises';
import { FIRST_LESSON_STEP, TOUR_STEPS } from '../../components/tour/tourSteps';
import { useTourStore } from '../../store/tourStore';
import { colors } from '../../theme/colors';
import type { RootNavProp } from '../../navigation/types';
import type { TourTargetKey } from '../../components/tour/tourSteps';

interface Props { navigation: RootNavProp }

/**
 * The lesson half of the guided tour (spec steps 5–14).
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
 * microphone permission behind the overlay card. The feedback banner shown at
 * the "Instant feedback" / "Same feedback either way" steps is the same
 * component the real Check/mic flow shows, just driven by the tour's own step
 * instead of a real grade — see isFeedbackStep below.
 */
export default function TourLessonScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const stepIndex = useTourStore(s => s.stepIndex);
  const setRect = useTourStore(s => s.setRect);

  const progressRef = useRef<View>(null);
  const heartsRef = useRef<View>(null);
  const hintRef = useRef<View>(null);
  const exerciseRef = useRef<View>(null);
  // Live inside the swapping exercise child (see ExerciseSlide's key below),
  // not in the persistent LessonHeader — only one of these two is ever
  // actually mounted at a time (FillBlankOrNextWord vs ReadAndSpeak), the
  // other's .current stays null, which measure() already no-ops on safely.
  const checkRef = useRef<View>(null);
  const micRef = useRef<View>(null);
  const selectedOptionRef = useRef<View>(null);
  // Shared by both feedback steps (fill-blank's "Instant feedback" and
  // recitation's "Same feedback either way") — the same FeedbackBanner
  // component mounts fresh at each, so a fresh measure on entry is enough.
  const feedbackRef = useRef<View>(null);

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

  const step = TOUR_STEPS[stepIndex];
  const exercise = tourExerciseForStep(stepIndex, FIRST_LESSON_STEP);
  const isFeedbackStep = step?.target === 'lessonFeedback';

  // Which real element should glow itself for the CURRENT step — derived
  // straight from the step's own target, so it's never out of sync with
  // whatever the overlay's cutout is currently pointing at.
  const glowTarget: 'hint' | 'hearts' | 'progress' | null =
    step?.target === 'lessonHint' ? 'hint' :
    step?.target === 'lessonHearts' ? 'hearts' :
    step?.target === 'lessonProgress' ? 'progress' : null;
  const glowCheck = step?.target === 'lessonCheck';
  const glowMic = step?.target === 'lessonMic';

  // Check/mic/option live inside the exercise child, which remounts (new
  // ex.ex_id → new ExerciseSlide key) every time the tour swaps between the
  // fill-blank and read-and-speak exercises — re-measured on every such
  // swap, not just once on TourLessonScreen's own mount, or whichever one
  // wasn't there yet at that first pass would never get a rect.
  //
  // Two passes, not one: ExerciseSlide's own entrance animation (see
  // LessonSessionScreen) runs 260ms of translateX on the child these refs
  // live inside, and the first measure fired at a flat 220ms — before that
  // settles. On a mount (no slide, e.g. the very first fill-blank pass)
  // 220ms already lands on the true position, so that first pass is still
  // useful for showing a ring as early as possible; the second pass at
  // 420ms (260ms animation + the same 220ms's safety margin) re-measures to
  // correct anything the first pass caught mid-slide — confirmed necessary:
  // the mic ring reliably failed to appear without it.
  useEffect(() => {
    const t1 = setTimeout(() => {
      measure(checkRef, 'lessonCheck');
      measure(micRef, 'lessonMic');
      measure(selectedOptionRef, 'lessonOption');
    }, 220);
    const t2 = setTimeout(() => {
      measure(checkRef, 'lessonCheck');
      measure(micRef, 'lessonMic');
      measure(selectedOptionRef, 'lessonOption');
    }, 420);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [exercise.ex_id, measure]);

  // The feedback sheet mounts/unmounts on its own step (see isFeedbackStep),
  // independent of exercise swaps — re-measured every time that step is
  // entered rather than tied to ex.ex_id, since the fill-blank and
  // recitation feedback steps don't themselves change the exercise.
  useEffect(() => {
    if (!isFeedbackStep) return;
    const timer = setTimeout(() => measure(feedbackRef, 'lessonFeedback'), 220);
    return () => clearTimeout(timer);
  }, [isFeedbackStep, measure]);

  // Auto-selects the CORRECT option so the Check button reads as enabled
  // instead of permanently greyed out — the exercise area is
  // pointerEvents="none" (see above), so there's no real tap that could ever
  // set this otherwise. The correct answer for a fill-blank exercise is the
  // blanked token's own `.ar` (that's what fills the blank once picked);
  // falls back to the first option if that ever doesn't match one (should
  // not happen for real exercise data, just a defensive floor).
  const previewSelected = useMemo(() => {
    const correctAr = exercise.tokens?.find(t => t.blank)?.ar;
    return exercise.options?.find(o => o.ar === correctAr)?.ar ?? exercise.options?.[0]?.ar;
  }, [exercise.ex_id]);

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
        glowTarget={glowTarget}
      />

      <View ref={exerciseRef} collapsable={false} style={styles.exerciseArea} pointerEvents="none">
        <ExerciseSlide key={exercise.ex_id}>
          {exercise.type === 'read_and_speak' ? (
            <ReadAndSpeak
              ex={exercise}
              surahName={TOUR_SURAH_NAME}
              character={CHARACTERS[0]}
              onSpeakScored={() => { /* unreachable — the area is inert */ }}
              micButtonRef={micRef}
              glowMic={glowMic}
            />
          ) : (
            <FillBlankOrNextWord
              ex={exercise}
              surahName={TOUR_SURAH_NAME}
              character={CHARACTERS[0]}
              onSubmit={() => { /* narration only — the tour never grades */ }}
              previewSelected={previewSelected}
              checkButtonRef={checkRef}
              selectedOptionRef={selectedOptionRef}
              glowCheck={glowCheck}
            />
          )}
        </ExerciseSlide>
      </View>

      {/* Same FeedbackBanner the real Check/mic flow shows, driven by the
          tour's own step (isFeedbackStep) rather than a real grade — inert
          like the exercise area above, for the same reason. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {isFeedbackStep && (
          <FeedbackBanner
            result={TOUR_FEEDBACK_RESULT}
            onAdvance={() => { /* narration only — Next in the tour card advances instead */ }}
            bannerRef={feedbackRef}
            glow
          />
        )}
      </View>

      <TourOverlay
        screen="lesson"
        onFinish={() => navigation.goBack()}
        onBack={() => navigation.goBack()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.lightBg },
  exerciseArea: { flex: 1 },
});
