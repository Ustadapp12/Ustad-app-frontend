import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Alert, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStatusBarStyle } from '../../hooks/useStatusBarStyle';
import { stopAudio, onPlayingChange, playFeedbackSound, preloadFeedbackSounds } from '../../services/audioPlayer';
import { useLessonStore } from '../../store/lessonStore';
import { useAuthStore } from '../../store/authStore';
import { captureError } from '../../services/crashReporter';
import { safeBottomInset } from '../../utils/responsive';
import { starsFromAccuracy } from '../../utils/stars';
import LumoInfoModal from '../../components/LumoInfoModal';
import ResumeLevelModal from '../../components/ResumeLevelModal';
import type { ExerciseDict, FormulaAttemptOut } from '../../types/api';
import type { RootNavProp } from '../../navigation/types';
import LessonHeader, { MAX_MISTAKES } from '../../components/lesson/LessonHeader';
import { BismillahIntro } from './components/BismillahIntro';
import { ExerciseSlide } from './components/ExerciseSlide';
import { FeedbackBanner } from './components/FeedbackBanner';
import { SpeakResultBanner, type SpeakResult } from './components/SpeakResultBanner';
import { SubmittingSpinner } from './components/SubmittingSpinner';
import ExerciseSwitch from './components/ExerciseSwitch';
import { LessonLoadError, LessonNotReady, LessonLoading } from './components/LessonStates';
import { NoHeartsModal, ExitConfirmModal, ConfettiOverlay } from './components/LessonOverlays';
import { ExerciseWaveContext } from '../../components/lesson/ExerciseWave';
import { stopRecording, setActiveExerciseId } from './lessonAudio';
import { HANDLED_EXERCISE_TYPES, CHARACTERS, shuffleIndices, characterForIndex, accuracyPct } from './lessonShared';
import { S } from './styles';
import {
  selectLessonSessionId, selectLessonFirstExercise, selectLessonError, selectLessonLoading, selectLessonGroup, selectLessonReset,
  selectLessonLoadGroup, selectLessonStartSession, selectLessonCompleteSession, selectLessonAbandonSession, selectLessonGroupId, selectLessonProgressPct,
  selectLessonResumed, selectLessonCorrectCount, selectLessonMistakes, selectLessonWrongCount, selectLessonSessionStartedAt, selectLessonXpEarnedSoFar,
} from '../../store/selectors/lesson';
import { useLessonAttempt } from '../../hooks/api';

// ── Main screen ────────────────────────────────────────────────────

interface Props {
  navigation: RootNavProp;
  route: { params: { groupId: string; surahName: string; surahNumber: number; isSpecial?: boolean } };
}

export default function LessonSessionScreen({ navigation, route }: Props) {
  const { groupId, surahName, surahNumber, isSpecial } = route.params;
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };

  // Exact values only (store/selectors/lesson.ts), never the whole store: it
  // changes on every answer. (`user` from authStore was read here but never
  // used, so it's gone.) The store* values are only for resuming a session
  // the app already made progress in, see lessonStore.startSession.
  const sessionId = useLessonStore(selectLessonSessionId);
  const firstExercise = useLessonStore(selectLessonFirstExercise);
  const error = useLessonStore(selectLessonError);
  const loading = useLessonStore(selectLessonLoading);
  const group = useLessonStore(selectLessonGroup);
  const reset = useLessonStore(selectLessonReset);
  const loadGroup = useLessonStore(selectLessonLoadGroup);
  const startSession = useLessonStore(selectLessonStartSession);
  const completeSession = useLessonStore(selectLessonCompleteSession);
  const abandonSession = useLessonStore(selectLessonAbandonSession);
  const storeGroupId = useLessonStore(selectLessonGroupId);
  const storeProgressPct = useLessonStore(selectLessonProgressPct);
  const storeResumed = useLessonStore(selectLessonResumed);
  const storeCorrectCount = useLessonStore(selectLessonCorrectCount);
  const storeMistakes = useLessonStore(selectLessonMistakes);
  const storeWrongCount = useLessonStore(selectLessonWrongCount);
  const storeSessionStartedAt = useLessonStore(selectLessonSessionStartedAt);
  const storeXpEarnedSoFar = useLessonStore(selectLessonXpEarnedSoFar);
  const submitAttempt = useLessonAttempt();

  const [exercise, setExercise] = useState<ExerciseDict | null>(null);
  // Plain statement, not an effect — see activeExerciseId's own comment for
  // why this has to land during render, before any effect (this component's
  // or a child exercise's) can run and capture a stale value.
  setActiveExerciseId(exercise?.ex_id ?? null);
  const [showBismillah, setShowBismillah] = useState(false);
  // White icons over the dark Bismillah intro only.
  useStatusBarStyle(showBismillah && exercise ? 'light' : 'dark');
  const [feedback, setFeedback] = useState<FormulaAttemptOut | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  // Accuracy tally, deliberately separate from `mistakes` (hearts): every
  // wrong graded attempt counts here, including "Try again" rounds,
  // remediation and review levels, which cost no hearts. Mirrors the
  // backend's correct_count/wrong_count, the same numbers stored for the map.
  const accuracyRef = useRef({ correct: 0, wrong: 0 });
  const [submitting, setSubmitting] = useState(false);
  // Tracks real system-audio play/pause/stop state (audioPlayer.ts pub-sub)
  // so the wave animation shows exactly while audio is audibly playing.
  const [systemPlaying, setSystemPlaying] = useState(false);
  useEffect(() => onPlayingChange(setSystemPlaying), []);
  // Cuts off anything already mid-playback the instant the exercise changes
  // — activeExerciseId (set above, during render) stops a still-QUEUED play
  // from starting late on the next exercise, but a clip already partway
  // through needs this to stop audibly rather than finish out on its own.
  useEffect(() => { stopAudio(); }, [exercise?.ex_id]);
  // Clears the submitting spinner only once the NEW exercise has actually
  // committed and rendered, rather than synchronously the instant advanceFn
  // calls setExercise(next). That synchronous clear (the original fix for a
  // 2-3s frozen-spinner bug) just swapped which thing sat blank on screen
  // for the same real mount cost — a spinner disappearing early doesn't make
  // the next exercise render any faster, it just uncovers whatever's behind
  // it (nothing) until the mount finishes. Reported 2026-09-05 as "the
  // screen stays white" recurring ~6 times in a single level — i.e. on most
  // question transitions, not just the final one. iOS-only because its main
  // thread blocks visibly on the mount instead of holding the previous
  // frame the way Android's compositor does. This ties the spinner's
  // lifetime to a real signal (the exercise that's now on screen) instead of
  // guessing the mount is fast enough not to matter.
  useEffect(() => { setSubmitting(false); }, [exercise?.ex_id]);
  const [noHeartsVisible, setNoHeartsVisible] = useState(false);
  // "Continue where you left off?" for a resumed session (see the seeding
  // effect below and handleStartOver).
  const [resumePromptVisible, setResumePromptVisible] = useState(false);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [heartRefillInfoVisible, setHeartRefillInfoVisible] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [speakResult, setSpeakResult] = useState<SpeakResult | null>(null);
  const exerciseIndexRef = useRef(0);
  // Submit lock. `submitting` is React state, so it does NOT close this: two
  // taps landing in the same frame both read it as false before the setter
  // has committed, and both fire a formula-attempt for the SAME ex_id. The
  // backend answers a duplicate/stale ex_id by returning its own current
  // exercise as `next_exercise` (process_answer's "ex_id mismatch" branch),
  // so a double tap could hand the client back a card it had already cleared.
  // A ref flips synchronously inside the first tap's handler, so the second
  // tap in the same frame sees it.
  const submitLockRef = useRef(false);
  // Every ex_id this session has already answered. The engine never reuses an
  // ex_id — even a wrong-answer replay in the review phase is minted a fresh
  // one (_build_review_queue: replay["ex_id"] = fx._new_id()) — so an ex_id
  // coming back is always a resync artefact, never real new work. Once the
  // user has cleared a card, it does not come back.
  const answeredExIdsRef = useRef<Set<string>>(new Set());
  const charOrderRef = useRef<number[]>(shuffleIndices(CHARACTERS.length));
  const startedAt = useRef(Date.now());
  // Whole-session clock, separate from startedAt above (which resets every
  // exercise for per-exercise timing) — set once at mount, read once at
  // completion to report total time on LessonSummaryScreen.
  const sessionStartedAtRef = useRef(Date.now());
  const pendingAdvanceFn = useRef<(() => void) | null>(null);
  const ayahDisplayCountRef = useRef(0);
  const totalXpRef = useRef(0); // accumulates xp_awarded across all formulaAttempt calls
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards the resumed-with-nothing-left effect below against firing twice —
  // sessionId eventually goes null once finishLevel succeeds (completeSession
  // clears it), which would otherwise re-satisfy that effect's own condition.
  const autoFinishTriggeredRef = useRef(false);

  // Tell the backend this level is done and show the summary screen — shared
  // by submitAnswer's advanceFn (right after the last real answer) and the
  // resumed-with-nothing-left effect below (the app died, or the request
  // failed, in the gap between the last answer and this call actually
  // landing — the session is still active with these exact final counts
  // sitting in Redis, see start_session's resume branch, so calling this
  // again is always safe and never re-awards anything twice).
  //
  // Never fakes a celebration screen on failure. Before the session-resume
  // fix existed, a failed /complete usually meant the session was lost
  // outright, so showing SOME "done" screen with a guessed XP value was the
  // least-bad option available. Now that resuming is real, that's no longer
  // true — the session stays exactly this resumable until /complete actually
  // succeeds, so lying about it here only cost the user a level that never
  // actually got marked done on the map, for no benefit.
  const finishLevel = useCallback(async (scorePct: number) => {
    setSubmitting(true);
    try {
      const summary = await completeSession();
      console.warn('[Lesson] completeSession OK. totalXpRef:', totalXpRef.current, 'summary:', JSON.stringify(summary));
      // Merge the fresh streak/XP straight from this response into the
      // shared learning store — refreshLearning() is throttled and nothing
      // else calls it after a lesson, so without this the Map HUD's
      // flame/XP silently stayed stale until the next cold launch.
      if (typeof summary.current_streak === 'number') {
        const currentLearning = useAuthStore.getState().learning;
        if (currentLearning) {
          useAuthStore.setState({
            learning: {
              ...currentLearning,
              current_streak: summary.current_streak,
              xp_total: currentLearning.xp_total + (totalXpRef.current || summary.xp_awarded),
              streak_state: summary.streak_state ?? currentLearning.streak_state,
              freeze_days_remaining: summary.freeze_days_remaining ?? currentLearning.freeze_days_remaining,
              repair_levels_required: summary.repair_levels_required ?? currentLearning.repair_levels_required,
              repair_levels_completed: summary.repair_levels_completed ?? currentLearning.repair_levels_completed,
            },
          });
        }
      }
      navigation.replace('LessonComplete', {
        xp: totalXpRef.current || summary.xp_awarded,
        scorePct,
        stars: starsFromAccuracy(scorePct),
        durationSec: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
        streakIncremented: summary.streak_incremented ?? false,
        currentStreak: summary.current_streak,
        streakRepaired: summary.streak_repaired ?? false,
        streakState: summary.streak_state,
        repairLevelsCompleted: summary.repair_levels_completed,
        repairLevelsRequired: summary.repair_levels_required,
      });
    } catch (e) {
      console.warn('[Lesson] completeSession FAILED. totalXpRef:', totalXpRef.current, 'error:', e);
      captureError(e, { where: 'finishLevel' });
      setSubmitting(false);
      Alert.alert(
        'Could not save your completion',
        'Your progress is safe. Please check your connection, then reopen this level to pick up right where you left off.',
        [{ text: 'OK', onPress: () => navigation.popTo('MainTabs') }],
      );
    }
  }, [completeSession, navigation]);

  // Mount: reset store, load group, start session
  useEffect(() => {
    let cancelled = false;
    reset();
    (async () => {
      try {
        await loadGroup(groupId);
        if (!cancelled) await startSession();
      } catch { /* error shown via store.error */ }
    })();
    return () => {
      cancelled = true;
      pendingAdvanceFn.current = null;
      stopAudio();
      void stopRecording().catch(() => {});
      if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    };
  }, [groupId, reset, loadGroup, startSession]);

  // Ready the correct/wrong chimes while the level loads, so the first
  // answer's ding plays at once (they are no longer loaded at app start).
  useEffect(() => { preloadFeedbackSounds(); }, []);

  // Silently skip any exercise type the app doesn't handle yet — user never sees it
  useEffect(() => {
    if (exercise && !HANDLED_EXERCISE_TYPES.has(exercise.type) && !submitting) {
      void submitAnswer(null);
    }
    // Once per exercise: re-running on submitting/submitAnswer changes could
    // submit the same skipped exercise twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise?.ex_id]);

  // Stop audio and reset playing state immediately when navigating away
  useEffect(() => {
    const unsub = navigation.addListener('blur', () => {
      stopAudio();
      // Also abort any in-flight recording
      void stopRecording().catch(() => {});
    });
    return unsub;
  }, [navigation]);

  // Once session starts, show bismillah intro then seed the first exercise.
  // Guard: storeGroupId must match the nav-param groupId to avoid seeding a
  // stale firstExercise that belongs to the previous lesson (race on first render).
  useEffect(() => {
    if (firstExercise && !exercise && storeGroupId === groupId) {
      setExercise(firstExercise);
      startedAt.current = Date.now();
      setProgressPct(storeProgressPct);
      if (storeResumed) {
        // Reconnecting to a session the app already made progress in (it was
        // killed or backgrounded mid-level, see lessonStore.startSession) —
        // pick up accuracy/XP/timer where the backend says they left off
        // instead of restarting them at zero, and skip the "Begin Lesson"
        // splash since this isn't actually the start of the level.
        setCorrectCount(storeCorrectCount);
        setMistakes(storeMistakes);
        accuracyRef.current = { correct: storeCorrectCount, wrong: storeWrongCount };
        totalXpRef.current = storeXpEarnedSoFar;
        sessionStartedAtRef.current = storeSessionStartedAt ?? Date.now();
        // The app can die in the gap between hearts hitting 0 and the user
        // tapping through the No Hearts modal (which is what normally calls
        // abandonSession) — that leaves the session resumable instead of
        // ended. Re-run the same MAX_MISTAKES check submitAnswer uses so a
        // resume into an already-exhausted session shows the existing
        // "Retry Level" modal instead of letting play continue unchecked.
        if (storeMistakes >= MAX_MISTAKES) {
          setNoHeartsVisible(true);
        } else {
          // Ask before dropping the learner back mid-level (user, 2026-10-13:
          // reopening a level after an app update landed on an old exercise
          // with no intro and no explanation).
          setResumePromptVisible(true);
        }
      } else {
        setShowBismillah(true);
      }
    }
    // Seeds once per session start. The store values are read as they are at
    // that moment; re-running on them could re-seed the first exercise later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstExercise, storeGroupId]);

  // Resumed into a session that already answered every exercise before the
  // app died (or the /complete call itself failed) — start_session's resume
  // branch hands this back as resumed=True with first_exercise=None rather
  // than restarting the whole level, so there's nothing to seed `exercise`
  // with; just finish completing it with the real final counts.
  useEffect(() => {
    if (
      storeResumed && sessionId && !firstExercise && !exercise && !loading
      && !autoFinishTriggeredRef.current
    ) {
      autoFinishTriggeredRef.current = true;
      void finishLevel(accuracyPct({ correct: storeCorrectCount, wrong: storeWrongCount }));
    }
  }, [storeResumed, sessionId, firstExercise, exercise, loading, storeCorrectCount, storeWrongCount, finishLevel]);

  const submitAnswer = useCallback(async (
    userAnswer: string | string[] | number[] | null,
    correctOverride?: boolean,
    // Real Deepgram-verified outcome for a speak exercise's one-and-only
    // formula-attempt call (sent after the retry choice resolves, or on
    // Skip) — see backend/app/learning/schemas.py FormulaAttemptIn.
    speakOutcome?: 'passed' | 'failed' | 'skipped',
  ) => {
    if (!sessionId || !exercise || submitting || submitLockRef.current) return;
    submitLockRef.current = true;
    // Every exercise's Check button funnels through here — stop whatever
    // audio is still playing (and its icon/waveform animation, via each
    // component's onPlayingChange subscription) the instant Check is pressed.
    stopAudio();
    setSubmitting(true);
    answeredExIdsRef.current.add(exercise.ex_id);
    const ms = Date.now() - startedAt.current;

    // ── Formula engine flow ──────────────────────────────────────────
    try {
      const result = await submitAttempt(sessionId, {
        ex_id: exercise.ex_id,
        user_answer: userAnswer,
        response_ms: ms,
        ...(speakOutcome ? { speak_result: speakOutcome } : {}),
      });

      // Speak exercises score correctness client-side (via Deepgram speak-attempt,
      // passed in as correctOverride) since formulaAttempt gets no user_answer to grade.
      const effectiveCorrect = correctOverride !== undefined ? correctOverride : result.correct;

      // ayah_display is a listen-along card, not a graded question — no ding
      // for it. A skipped recitation is the same: the user opted out, not a
      // wrong answer, so no buzzer.
      if (exercise.type !== 'ayah_display' && speakOutcome !== 'skipped') {
        playFeedbackSound(effectiveCorrect);
      }

      // remediation_up = reinforcement phase, no hearts lost even on wrong.
      // ayah_display is a listen-along card, not a gradable exercise — never
      // cut a heart for it regardless of what the backend reports, so this
      // doesn't depend on the backend always grading it as correct.
      // A skipped recitation is heart-neutral the same way — every
      // recitation question is skippable with no penalty. Special (merged/
      // review) levels are heart-exempt for their entire duration, not just
      // specific phases within them — hearts aren't even shown there (see
      // LessonHeader's hideHearts below).
      const isNoMistake = exercise.phase === 'mistakes_review' || exercise.phase === 'remediation_up' || exercise.type === 'ayah_display' || speakOutcome === 'skipped' || !!isSpecial;
      const snapCorrect  = correctCount + (effectiveCorrect ? 1 : 0);
      const snapMistakes = mistakes + (!effectiveCorrect && !isNoMistake ? 1 : 0);

      // Track cumulative XP earned across all exercises for the session-end screen
      totalXpRef.current += result.xp_awarded ?? 0;

      // Server-computed, monotonic % of the level's total work done (NOT an
      // accuracy score) — see session_engine.py's _progress_snapshot().
      if (typeof result.progress_pct === 'number') setProgressPct(result.progress_pct);

      if (!effectiveCorrect && !isNoMistake) setMistakes(snapMistakes);
      else if (effectiveCorrect) {
        setCorrectCount(snapCorrect);
        // Confetti: XP awarded on normal questions only (not listen steps, speak exercises, or session end)
        const isSpeakExercise = exercise.type === 'read_ayah_and_speak' || exercise.type === 'read_and_speak';
        if ((result.xp_awarded ?? 0) > 0 && exercise.type !== 'ayah_display' && !isSpeakExercise && !result.done) {
          setShowConfetti(true);
          if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
          confettiTimerRef.current = setTimeout(() => setShowConfetti(false), 1500);
        }
      }

      // Hearts exhausted — end attempt immediately (skip in no-mistake phases)
      if (!effectiveCorrect && !isNoMistake && snapMistakes >= MAX_MISTAKES) {
        submitLockRef.current = false;
        setSubmitting(false);
        setNoHeartsVisible(true);
        return;
      }

      // Accuracy: the backend's running counts when it sends them (it grades
      // every attempt, so this matches the score stored for the map); a local
      // tally of graded, non-skipped attempts as a fallback.
      if (typeof result.correct_count === 'number' && typeof result.wrong_count === 'number') {
        accuracyRef.current = { correct: result.correct_count, wrong: result.wrong_count };
      } else if (exercise.type !== 'ayah_display' && speakOutcome !== 'skipped') {
        if (effectiveCorrect) accuracyRef.current.correct += 1;
        else accuracyRef.current.wrong += 1;
      }
      const scorePct = accuracyPct(accuracyRef.current);

      const advanceFn = async () => {
        setFeedback(null);
        if (result.done) {
          // Re-arm the spinner specifically for this branch: completeSession()
          // is a real network round-trip (unlike next_exercise, which just
          // mounts an already-loaded component), and by the time advanceFn
          // runs here `submitting` has already been cleared — either by the
          // immediateAdvance call site below (fired right after void
          // advanceFn()) or, on the feedback-banner Continue path, long
          // before that when the original answer was first submitted. Without
          // this, the screen shows nothing at all for the full duration of
          // the request — reported 2026-09-05 as "the screen stays white and
          // then goes on to next level," iOS only (Android's UI thread
          // apparently keeps enough painted mid-navigation to hide the same
          // gap). finishLevel re-sets it itself either way, so nothing extra
          // needed here beyond calling it.
          await finishLevel(scorePct);
        } else if (result.next_exercise) {
          const next = result.next_exercise;
          // Never go back to a card the user has already cleared. The backend
          // hands back its OWN current exercise as `next_exercise` whenever it
          // receives a stale or duplicate ex_id (process_answer's "ex_id
          // mismatch" resync branch) — so this field is not always forward
          // progress, and mounting it blind is how an already-answered ayah
          // could reappear. The engine never reuses an ex_id (review replays
          // are minted fresh ones), so "already in the answered set" always
          // means echo, never new work. Ignoring it leaves the current card
          // up rather than rewinding; nothing deadlocks, since the user can
          // still answer that card and the server will move on.
          if (answeredExIdsRef.current.has(next.ex_id)) {
            console.warn('[Lesson] ignoring resync echo of an already-answered exercise:', next.ex_id);
          } else {
            exerciseIndexRef.current += 1;  // advance character only when moving to next exercise
            setExercise(next);
            startedAt.current = Date.now();
          }
        }
        submitLockRef.current = false;
      };

      // Speak exercises handle their own result UI internally; advance
      // immediately after formulaAttempt(null) without showing FeedbackBanner.
      // ayah_display also advances immediately (no feedback).
      const immediateAdvance =
        exercise.type === 'ayah_display' ||
        exercise.type === 'read_ayah_and_speak' ||
        exercise.type === 'read_and_speak';

      if (immediateAdvance) {
        void advanceFn();
        // Not cleared here at all anymore. For next_exercise, the ex_id
        // effect above clears it once the new exercise actually renders; for
        // result.done, advanceFn's own branch keeps it true through
        // completeSession(). Clearing it synchronously here raced ahead of
        // both.
      } else {
        // Show feedback banner; user presses Continue / GOT IT to advance
        pendingAdvanceFn.current = advanceFn;
        setFeedback(result);
      }
    } catch (e: any) {
      // Defensive reset, not an active retry path: every branch below ends by
      // abandoning the session and navigating away, so in normal operation
      // nothing ever re-renders this card unlocked. This exists purely so
      // that IF abandonSession/navigation ever fails to actually leave the
      // screen, the Check button and this ex_id aren't left permanently
      // locked (that dead-end — Check re-enabled, no feedback, no way
      // forward but force-closing the app — is exactly what the branches
      // below were added to stop; see their own comments).
      //
      // If some future path *does* resubmit this ex_id (a session resume
      // after the original request actually reached and was graded by the
      // server, e.g. a cold start slow enough that the client timed out
      // first), that's safe: the backend's process_answer() replays the
      // original grading for a repeat ex_id instead of re-grading or failing
      // it (see backend CHANGES.md, 2026-08-31).
      submitLockRef.current = false;
      answeredExIdsRef.current.delete(exercise.ex_id);
      setSubmitting(false);
      if (e?.status === 404 || e?.status === 400) {
        navigation.replace('LessonComplete', {
          xp: 0, scorePct: 0, stars: 1,
        });
      } else if (e?.status === 0) {
        // status 0 = fetch never got an HTTP response (client.ts) — no signal,
        // DNS/TLS failure, or our own 30s timeout. Answer was never scored, so
        // there's no partial progress to protect; bail out to the home screen
        // rather than leaving the exercise frozen on a submit that'll never resolve.
        Alert.alert(
          'Connection lost',
          'You lost connection. Please check your internet and try again.',
          [{ text: 'OK', onPress: () => {
            abandonSession({ silent: true }).catch(() => {});
            navigation.popTo('MainTabs');
          } }],
        );
      } else {
        // Everything else — 500, 502, 422, 403, a rate limit, a refresh that
        // could not be recovered. Previously this branch did not exist, so the
        // Check button simply re-enabled and nothing else happened: the user
        // tapped, saw no feedback, tapped again, and had no way forward except
        // force-closing the app. It also never reached Crashlytics, so the
        // failure was invisible in production too. Report it, then let the user
        // out the same way the no-connection branch does.
        captureError(e, {
          where: 'submitAnswer',
          status: e?.status ?? 'unknown',
          ex_id: exercise.ex_id,
          exercise_type: exercise.type,
        });
        Alert.alert(
          'Something went wrong',
          'We could not save that answer. Please try again in a moment.',
          [{ text: 'OK', onPress: () => {
            abandonSession({ silent: true }).catch(() => {});
            navigation.popTo('MainTabs');
          } }],
        );
      }
    }
  }, [sessionId, exercise, submitting, correctCount, mistakes, isSpecial, finishLevel, abandonSession, navigation, submitAttempt]);

  const handleBack = useCallback(() => {
    abandonSession({ silent: true }).catch(() => {});
    navigation.goBack();
  }, [abandonSession, navigation]);

  // Resume prompt's "Start over": end the unfinished session on the server
  // first (awaited, or the server would just resume it again), then reopen
  // this same level as a fresh screen, which starts a new session with the
  // Bismillah intro and fresh hearts/score.
  const handleStartOver = async () => {
    setResumePromptVisible(false);
    await abandonSession({ silent: true }).catch(() => {});
    navigation.replace('LessonSession', { groupId, surahName, surahNumber, isSpecial });
  };

  // Hardware back during a live exercise must ask before throwing progress
  // away, exactly like the X button does — not silently pop the screen (the
  // previous default) or land on some other screen entirely. While the
  // exit-confirm Modal is already open, Android routes the back press to its
  // own onRequestClose directly (RN Modals capture hardware back at the
  // native window level ahead of any BackHandler listener), so this only
  // fires for that case when it's not yet open.
  //
  // The no-hearts overlay is a plain absolutely-positioned View, not a
  // Modal — it doesn't get that native interception, and today it has no
  // leave affordance at all (Buy Hearts is a coming-soon no-op, Retry starts
  // the level over). Back is the only way out of it, so it skips the confirm
  // (there's no fresh progress left to protect at that point) and leaves
  // straight away.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (noHeartsVisible) {
        setNoHeartsVisible(false);
        handleBack();
        return true;
      }
      setExitConfirmVisible(true);
      return true;
    });
    return () => sub.remove();
  }, [noHeartsVisible, handleBack]);

  // Shared by the error and not-ready states.
  const retryLoad = () => {
    reset();
    loadGroup(groupId).then(() => startSession()).catch(() => {});
  };
  const abandonAndGoBack = () => {
    abandonSession({ silent: true }).catch(() => {});
    navigation.goBack();
  };

  if (error && !loading) {
    return <LessonLoadError insetTop={insets.top} error={error} onRetry={retryLoad} onBack={() => navigation.goBack()} />;
  }

  // Session loaded but the backend has no exercises yet.
  if (!loading && !error && !firstExercise && !exercise) {
    return <LessonNotReady insetTop={insets.top} onRetry={retryLoad} onBackToMap={abandonAndGoBack} />;
  }

  if (showBismillah && exercise) {
    return (
      <BismillahIntro
        surahName={surahName}
        surahNumber={surahNumber}
        insetTop={insets.top}
        onBegin={() => {
          setShowBismillah(false);
          startedAt.current = Date.now();
        }}
      />
    );
  }

  if (!exercise || loading) {
    return <LessonLoading insetTop={insets.top} onBackToMap={abandonAndGoBack} />;
  }

  // ── Exercise header ──────────────────────────────────────────────
  // Bar is a server-computed, monotonic % of the level's total work done —
  // NOT an accuracy/score value. It only ever moves forward (a mistake adds
  // remediation work but holds the bar rather than dipping it) and hits 100%
  // only when the session is done. See session_engine.py's _progress_snapshot().
  const progressFraction = Math.min(Math.max(progressPct / 100, 0), 1);
  const character = characterForIndex(charOrderRef.current, exerciseIndexRef.current);
  const hintAyah = group?.ayahs.find(a => a.ayah_number === exercise.ayah_no);
  const showHint = exercise.type !== 'ayah_display' && exercise.type !== 'hear_and_select' && exercise.type !== 'sequence';
  // The wave (drawn by ExerciseLayout in the gap between the options and the
  // Check button, see ExerciseWave) is suppressed where the exercise already shows its own
  // playing state: recitation (SpeakResultBanner's waveform), audio_fill
  // (each option's play circle) and hear_and_select (its big speaker button
  // turns into pause + "Playing…"; user 2026-08-28: "not needed").
  const showWaveBar = systemPlaying && exercise.type !== 'read_ayah_and_speak' && exercise.type !== 'read_and_speak'
    && exercise.type !== 'audio_fill' && exercise.type !== 'hear_and_select';

  return (
    <View style={[S.screen, { paddingTop: insets.top }]}>
      {/* Top bar: X + progress bar + 5 hearts + Hint */}
      <LessonHeader
        mistakes={mistakes}
        progressFraction={progressFraction}
        hintUrl={showHint ? exercise.ayah_audio_url : null}
        hintAyahAr={showHint ? (exercise.ayah_ar ?? hintAyah?.arabic ?? null) : null}
        hintAyahTranslation={showHint ? (exercise.ayah_translation ?? hintAyah?.translation_en ?? null) : null}
        onExit={() => setExitConfirmVisible(true)}
        hideHearts={isSpecial}
      />

      {/* paddingBottom here, not only on each exercise's own ScrollView: an
          exercise short enough not to scroll would otherwise put its Check
          button at the true bottom of the screen, since S.screen only
          reserves insets.top. */}
      <View style={[S.exerciseArea, { paddingBottom: insets.bottom }]}>
        <ExerciseWaveContext.Provider value={showWaveBar}>
        <ExerciseSlide key={exercise.ex_id}>
          <ExerciseSwitch
            exercise={exercise}
            surahName={surahName}
            character={character}
            locked={!!feedback}
            transliteration={hintAyah?.transliteration ?? null}
            showLumo={ayahDisplayCountRef.current < 3}
            onAyahContinue={() => {
              stopAudio();
              ayahDisplayCountRef.current += 1;
              submitAnswer(null);
            }}
            onSubmit={submitAnswer}
            onSpeakScored={setSpeakResult}
            onSpeakFinalize={(result) => { void submitAnswer(null, result.passed, result.passed ? 'passed' : 'failed'); }}
            onSpeakSkip={() => { void submitAnswer(null, false, 'skipped'); }}
          />
        </ExerciseSlide>
        </ExerciseWaveContext.Provider>
      </View>

      {submitting && !feedback && (
        <View style={S.spinnerOverlay}>
          <SubmittingSpinner />
        </View>
      )}

      {/* Shown after the FINAL speak attempt scores. Continue calls
          submitAnswer(null, passed, ...) so a failed recitation costs a heart
          like any wrong answer; a wrong FIRST attempt never reaches here (see
          each recitation exercise's own retry-choice state). */}
      {speakResult && !feedback && (
        <SpeakResultBanner
          result={speakResult}
          onAdvance={() => {
            const passed = speakResult.passed;
            setSpeakResult(null);
            void submitAnswer(null, passed, passed ? 'passed' : 'failed');
          }}
        />
      )}

      {feedback && (
        <FeedbackBanner result={feedback} onAdvance={() => { void pendingAdvanceFn.current?.(); }} />
      )}

      {showConfetti && <ConfettiOverlay />}

      {noHeartsVisible && (
        <NoHeartsModal
          onBuyHearts={() => setHeartRefillInfoVisible(true)}
          onRetry={() => {
            setNoHeartsVisible(false);
            abandonSession({ silent: true }).catch(() => {});
            navigation.replace('LessonSession', { groupId, surahName, surahNumber });
          }}
        />
      )}

      <ExitConfirmModal
        visible={exitConfirmVisible}
        onLeave={() => {
          setExitConfirmVisible(false);
          handleBack();
        }}
        onStay={() => setExitConfirmVisible(false)}
      />

      <ResumeLevelModal
        visible={resumePromptVisible}
        onContinue={() => setResumePromptVisible(false)}
        onStartOver={() => { void handleStartOver(); }}
      />

      <LumoInfoModal
        visible={heartRefillInfoVisible}
        onClose={() => setHeartRefillInfoVisible(false)}
        title="Coming soon!"
        message="Heart refills will be available soon. Stay tuned!"
      />

    </View>
  );
}
