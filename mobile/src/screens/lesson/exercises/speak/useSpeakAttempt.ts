import { useEffect, useRef, useState } from 'react';
import { requestMicPermission } from '../../../../services/audioRecorder';
import { captureError } from '../../../../services/crashReporter';
import type { ExerciseDict } from '../../../../types/api';
import type { SpeakResult } from '../../components/SpeakResultBanner';
import { startRecording, stopRecording } from '../../lessonAudio';
import { useRecitationScoring } from '../../../../hooks/api';

// retry_choice: sits between a failed first attempt and the final result —
// the user picks Try Again (one more recording, self-contained inside the
// exercise component) or Next (accept the failed attempt as final).
export type SpeakState = 'idle' | 'recording' | 'scoring' | 'retry_choice' | 'done';

// Auto-stop-and-submit this long after recording starts, same as a manual
// second tap — stops the recorder from being used to burn long/wasteful
// speak-attempt API calls.
const MAX_RECORDING_MS = 60000;

/**
 * Record → score → (one retry on a first fail) flow shared by ReadAndSpeak
 * and ReadAyahAndSpeak. Tap the mic once to start recording, again to stop
 * and submit it for scoring (no separate Check step).
 */
export function useSpeakAttempt({
  ex, tag, correctAyah, segmentAudioUrls, onSpeakScored, onFinalize,
}: {
  ex: ExerciseDict;
  /** Crashlytics/console tag, e.g. 'ReadAndSpeak'. */
  tag: string;
  /** What the result banner shows as the correct ayah, and the clips it can replay. */
  correctAyah: string | null;
  segmentAudioUrls: string[] | null;
  onSpeakScored: (result: SpeakResult) => void;
  /** Declining the retry (tapping Next in the retry-choice) — the user has
   * already seen that result's feedback there, so this advances straight to
   * the next question instead of routing back through onSpeakScored, which
   * would show the same feedback sheet a second time. */
  onFinalize: (result: SpeakResult) => void;
}) {
  const scoreRecitation = useRecitationScoring();
  const [speakState, setSpeakState] = useState<SpeakState>('idle');
  const [error, setError] = useState<string | null>(null);
  // The failed 1st-attempt result, held here (not sent to onSpeakScored) while
  // the user is deciding Try Again vs Next.
  const [pendingResult, setPendingResult] = useState<SpeakResult | null>(null);
  const mountedRef = useRef(true);
  // 1 on the first attempt, 2 on the retry — a fail on attempt 2 is always
  // final, no second retry offered.
  const attemptNumRef = useRef(1);
  // Guards against a second tap landing before the first tap's state update
  // has taken effect — only one recording/scoring attempt in flight at a time.
  const busyRef = useRef(false);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearRecordingTimer();
      // Clean up any in-flight recording if the component unmounts mid-session
      void stopRecording().catch(() => {});
    };
  }, []);

  // Reset state when the exercise changes (e.g. two speak exercises in a row)
  useEffect(() => {
    setSpeakState('idle');
    setError(null);
    setPendingResult(null);
    attemptNumRef.current = 1;
    clearRecordingTimer();
  }, [ex.ex_id]);

  const handleMicTap = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      if (speakState === 'idle') {
        setError(null);
        const granted = await requestMicPermission();
        if (!granted) {
          if (mountedRef.current) setError('Microphone permission is required to record your recitation.');
          return;
        }
        try {
          await startRecording();
          if (mountedRef.current) {
            setSpeakState('recording');
            clearRecordingTimer();
            // Through the ref, not handleMicTap itself: this render's
            // handleMicTap still sees speakState 'idle' and would start a
            // second recording instead of stopping this one.
            recordingTimerRef.current = setTimeout(() => { void handleMicTapRef.current(); }, MAX_RECORDING_MS);
          }
        } catch (e) {
          console.warn(`[${tag}] startRecording failed:`, e);
          captureError(e, { where: `${tag}.startRecording` });
          if (mountedRef.current) setError('Could not start recording. Please try again.');
        }
        return;
      }

      if (speakState === 'recording') {
        clearRecordingTimer();
        let uri: string | null = null;
        try {
          uri = await stopRecording();
          if (!uri) throw new Error('No audio captured');
        } catch (e) {
          console.warn(`[${tag}] stopRecording failed:`, e);
          captureError(e, { where: `${tag}.stopRecording` });
          if (mountedRef.current) {
            setError('Could not capture your recording. Please try again.');
            setSpeakState('idle');
          }
          return;
        }
        if (mountedRef.current) setSpeakState('scoring');

        try {
          const scored = await scoreRecitation(ex.expected_arabic ?? '', uri);
          if (mountedRef.current) {
            const result: SpeakResult = {
              passed: scored.passed, score_pct: scored.score_pct, transcript: scored.transcript,
              correctAyah, ayahAudioUrl: ex.ayah_audio_url ?? null, segmentAudioUrls,
              expectedWords: scored.expected_words,
            };
            // A pass is always final. A fail on the retry (attempt 2) is also
            // final — only a fail on attempt 1 gets the retry choice.
            if (scored.passed || attemptNumRef.current >= 2) {
              setSpeakState('done');
              onSpeakScored(result);
            } else {
              setPendingResult(result);
              setSpeakState('retry_choice');
            }
          }
        } catch (e) {
          console.warn(`[${tag}] speak-attempt failed:`, e);
          captureError(e, { where: `${tag}.speakAttempt` });
          if (mountedRef.current) {
            setError('Scoring failed. Tap the mic to try again.');
            setSpeakState('idle');
          }
        }
      }
    } finally {
      busyRef.current = false;
    }
  };
  const handleMicTapRef = useRef(handleMicTap);
  handleMicTapRef.current = handleMicTap;

  const handleRetry = () => {
    attemptNumRef.current = 2;
    setPendingResult(null);
    setError(null);
    setSpeakState('idle');
  };

  const handleDeclineRetry = () => {
    if (!pendingResult) return;
    setSpeakState('done');
    onFinalize(pendingResult);
  };

  const dismissError = () => {
    setError(null);
    setSpeakState('idle');
  };

  return { speakState, error, pendingResult, handleMicTap, handleRetry, handleDeclineRetry, dismissError };
}

export type SpeakAttempt = ReturnType<typeof useSpeakAttempt>;
