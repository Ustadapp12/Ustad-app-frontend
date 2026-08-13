import React, { useMemo } from 'react';
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
import { useTourTarget } from '../../components/tour/useTourTarget';

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
  // Every tour target on this screen publishes its own measured box through
  // useTourTarget, which re-measures on layout and again whenever the tour
  // advances. That replaces a measure() helper here which added `insets.top`
  // to every y: a correction derived on one device to reconcile the overlay's
  // old Modal window with this one. The overlay renders in this same window
  // now, so there is nothing to correct. The pair of fixed 220ms/420ms timers
  // that used to chase ExerciseSlide's 260ms entrance animation lives inside
  // the hook too, rather than being restated per screen.
  // Each radius below is the real host element's own borderRadius (see
  // useTourTarget's own comment) — not a guess made here from the measured
  // box's aspect ratio:
  // - progress/hearts/hint are bare wrapper Views with no radius of their
  //   own, glowed via TOUR_GLOW_ROUND (LessonSessionScreen.tsx) — 'round'
  //   matches that same clamp-to-circle/pill behaviour for the hole.
  // - lessonExercise's radius is unused: skipHole (in TourOverlay) keeps the
  //   plain uniform dim for it regardless.
  // - lessonCheck: EX.continueBtn's real borderRadius (16).
  // - lessonMic: RAS.micBtn is always exactly circular in both its states
  //   (108/54 and 76/38 both simplify to radius = half the measured side),
  //   so 'round' reproduces the true shape in either state without needing
  //   to know which one is currently mounted.
  // - lessonOption: AF.optionBtn's real borderRadius (16).
  // - lessonFeedback: FB.sheet's real top-corner borderRadius (24); its
  //   flush-bottom position (see TourOverlay) zeroes the bottom two corners,
  //   matching the sheet's actual top-only rounding.
  const progressTarget = useTourTarget('lessonProgress', 'round');
  const heartsTarget = useTourTarget('lessonHearts', 'round');
  const hintTarget = useTourTarget('lessonHint', 'round');
  const exerciseTarget = useTourTarget('lessonExercise', 0);
  // Check/mic/option live inside the swapping exercise child (see
  // ExerciseSlide's key below). Only one of check/mic is ever mounted at a
  // time (FillBlankOrNextWord vs ReadAndSpeak), and the hook no-ops safely on
  // whichever ref is currently null.
  const checkTarget = useTourTarget('lessonCheck', 16);
  const micTarget = useTourTarget('lessonMic', 'round');
  const optionTarget = useTourTarget('lessonOption', 16);
  // Shared by both feedback steps (fill-blank's "Instant feedback" and
  // recitation's "Same feedback either way") — the same FeedbackBanner
  // component mounts fresh at each.
  const feedbackTarget = useTourTarget('lessonFeedback', 24);

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
        targets={{ progress: progressTarget.ref, hearts: heartsTarget.ref, hint: hintTarget.ref }}
        glowTarget={glowTarget}
      />

      <View {...exerciseTarget} collapsable={false} style={styles.exerciseArea} pointerEvents="none">
        <ExerciseSlide key={exercise.ex_id}>
          {exercise.type === 'read_and_speak' ? (
            <ReadAndSpeak
              ex={exercise}
              surahName={TOUR_SURAH_NAME}
              character={CHARACTERS[0]}
              onSpeakScored={() => { /* unreachable — the area is inert */ }}
              micButtonRef={micTarget.ref}
              glowMic={glowMic}
            />
          ) : (
            <FillBlankOrNextWord
              ex={exercise}
              surahName={TOUR_SURAH_NAME}
              character={CHARACTERS[0]}
              onSubmit={() => { /* narration only — the tour never grades */ }}
              previewSelected={previewSelected}
              checkButtonRef={checkTarget.ref}
              selectedOptionRef={optionTarget.ref}
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
            bannerRef={feedbackTarget.ref}
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
