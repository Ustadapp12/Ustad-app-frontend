import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Pressable } from 'react-native';
import LottieView from 'lottie-react-native';
import { requestMicPermission } from '../../../services/audioRecorder';
import { captureError } from '../../../services/crashReporter';
import { useArabicFont, arabicTextStyle } from '../../../utils/arabicFont';
import { colors } from '../../../theme';
import type { ExerciseDict } from '../../../types/api';
import AyahText from '../../../components/lesson/AyahText';
import ExerciseLayout from '../../../components/lesson/ExerciseLayout';
import UstadSays from '../../../components/lesson/UstadSays';
import { PlayPauseBtn } from '../components/PlayPauseBtn';
import { RecitationScoringFeedback } from '../components/RecitationScoringFeedback';
import { SpeakResultBanner, type SpeakResult } from '../components/SpeakResultBanner';
import { startRecording, stopRecording } from '../lessonAudio';
import { BUBBLE_TEXT, RETRY_BUBBLE_TEXT, type Character } from '../lessonShared';
import { ANIMATIONS, LESSON_IMAGES } from '../../../assets';
import { useRecitationScoring } from '../../../hooks/api';

// ── Read Ayah and Speak exercise ───────────────────────────────────
// Shows the full ayah with a play button (hear it first), then a
// press-and-hold mic to record recitation. Scores via speak-attempt
// API then calls onSpeakScored so the parent can show the result banner.
//
// phase: "main"   — single ayah
// phase: "review" — same UX (side-by-side comparison is deferred)

// retry_choice: sits between a failed first attempt and the final result —
// the user picks Try Again (one more recording, self-contained inside the
// exercise component) or Next (accept the failed attempt as final).
export type SpeakState = 'idle' | 'recording' | 'scoring' | 'retry_choice' | 'done';

export function ReadAyahAndSpeak({
  ex, surahName, character, onSpeakScored, onFinalize, onSkip,
}: {
  ex: ExerciseDict; surahName: string; character: Character; onSpeakScored: (result: SpeakResult) => void;
  /** Declining the retry (tapping Next in the retry-choice) — the user has
   * already seen that result's feedback there, so this advances straight to
   * the next question instead of routing back through onSpeakScored, which
   * would show the same feedback sheet a second time. */
  onFinalize: (result: SpeakResult) => void;
  onSkip: () => void;
}) {
  const scoreRecitation = useRecitationScoring();
  const arabicFont = useArabicFont();
  const [speakState, setSpeakState] = useState<SpeakState>('idle');
  const [error, setError]           = useState<string | null>(null);
  // The failed 1st-attempt result, held here (not sent to onSpeakScored) while
  // the user is deciding Try Again vs Next.
  const [pendingResult, setPendingResult] = useState<SpeakResult | null>(null);
  const mountedRef  = useRef(true);
  const recordedUriRef = useRef<string | null>(null);
  // 1 on the first attempt, 2 on the retry — a fail on attempt 2 is always
  // final, no second retry offered.
  const attemptNumRef = useRef(1);
  // Guards against a second tap landing before the first tap's state update
  // has taken effect — only one recording/scoring attempt in flight at a time.
  const busyRef = useRef(false);
  // Auto-stop-and-submit 60s after recording starts — see handleMicTap.
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

  // Reset state when the exercise changes (e.g. phase=review, two in a row)
  useEffect(() => {
    setSpeakState('idle');
    setError(null);
    setPendingResult(null);
    recordedUriRef.current = null;
    attemptNumRef.current = 1;
    clearRecordingTimer();
  }, [ex.ex_id]);

  /**
   * Tap the mic — first tap starts recording, second tap stops it and
   * immediately submits it for scoring (no separate Check step).
   */
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
            // Auto-stop-and-submit at 60s, same as a manual second tap —
            // stops the recorder from being used to burn long/wasteful
            // speak-attempt API calls.
            clearRecordingTimer();
            recordingTimerRef.current = setTimeout(() => { void handleMicTap(); }, 60000);
          }
        } catch (e) {
          console.warn('[ReadAyahAndSpeak] startRecording failed:', e);
          // This error only ever reached console.warn before — invisible to
          // Crashlytics, so a persistent real-world failure here (as opposed
          // to the already-patched stuck-recorder case the retry above
          // handles silently) had no trace to diagnose from. Recorded here so
          // the next occurrence actually carries the real native message.
          captureError(e, { where: 'ReadAyahAndSpeak.startRecording' });
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
          console.warn('[ReadAyahAndSpeak] stopRecording failed:', e);
          captureError(e, { where: 'ReadAyahAndSpeak.stopRecording' });
          if (mountedRef.current) {
            setError('Could not capture your recording. Please try again.');
            setSpeakState('idle');
          }
          return;
        }
        recordedUriRef.current = uri;
        if (mountedRef.current) setSpeakState('scoring');

        try {
          const scored = await scoreRecitation(ex.expected_arabic ?? '', uri);

          if (mountedRef.current) {
            const result: SpeakResult = { passed: scored.passed, score_pct: scored.score_pct, transcript: scored.transcript, correctAyah: ex.ayah_ar ?? ex.expected_arabic ?? null, ayahAudioUrl: ex.ayah_audio_url ?? null, segmentAudioUrls: ex.segment_audio_urls ?? null, expectedWords: scored.expected_words };
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
          console.warn('[ReadAyahAndSpeak] speak-attempt failed:', e);
          captureError(e, { where: 'ReadAyahAndSpeak.speakAttempt' });
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

  // Pinned below the content so the mic is always reachable on every screen size.
  const micArea = speakState !== 'done' && speakState !== 'retry_choice' ? (
    <View style={RAS.micArea}>
      <Text style={RAS.micInstruction}>
        {speakState === 'recording'
          ? 'Recording… tap to stop'
          : speakState === 'scoring'
          ? 'Scoring your recitation…'
          : 'Tap the mic to start, tap again to stop and check'}
      </Text>

      {speakState === 'scoring' ? (
        <RecitationScoringFeedback />
      ) : (
        <Pressable
          onPress={handleMicTap}
          style={({ pressed }) => [RAS.micBtn, pressed && RAS.micBtnActive]}
        >
          {speakState === 'recording' ? (
            <LottieView
              source={ANIMATIONS.listen}
              autoPlay
              loop
              style={RAS.listenAnim}
            />
          ) : (
            <Image
              source={LESSON_IMAGES.mic}
              style={RAS.micImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      )}

      {/* Every recitation question is skippable — for people who don't
          want to attempt speaking at all. Only offered before a
          recording is made; once there's an attempt in flight/scored,
          the retry-choice's own Next button covers "move on" instead. */}
      {speakState === 'idle' && (
        <TouchableOpacity style={RAS.skipBtn} onPress={onSkip}>
          <Text style={RAS.skipBtnText}>Skip</Text>
        </TouchableOpacity>
      )}

      {!!error && (
        <View style={RAS.errorBox}>
          <Text style={RAS.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => { setError(null); setSpeakState('idle'); }}>
            <Text style={RAS.retryLink}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ) : null;

  return (
    <View style={RAS.outer}>
      <ExerciseLayout footer={micArea}>
        <UstadSays
          character={character}
          text={speakState === 'retry_choice' ? RETRY_BUBBLE_TEXT : BUBBLE_TEXT.read_ayah_and_speak}
          label={`Surah ${surahName} · Verse ${ex.ayah_no}`}
        />

        {/* Ayah card — the text the user will recite */}
        <View style={RAS.ayahCard}>
          <AyahText
            text={ex.ayah_ar ?? ''}
            style={arabicTextStyle(RAS.ayahText as any, arabicFont) as any}
          />
        </View>

        {/* Hear it first — prefer full ayah URL, fall back to segment URLs.
            Disabled from the moment recording starts through scoring/done —
            not just while actively recording: once an attempt has been
            submitted there's nothing left to prepare for, so replaying the
            hint no longer makes sense (and during recording it'd get picked
            up by the mic and corrupt the recitation being scored). */}
        <PlayPauseBtn
          url={ex.ayah_audio_url}
          urls={ex.segment_audio_urls}
          label="Hear the Ayah"
          disabled={speakState !== 'idle'}
        />

      </ExerciseLayout>

      {/* Retry-choice bottom sheet — same visual treatment as the final
          result banner, just with Try Again / Next instead of Continue. */}
      {speakState === 'retry_choice' && pendingResult && (
        <SpeakResultBanner result={pendingResult} onAdvance={handleDeclineRetry} onRetry={handleRetry} />
      )}
    </View>
  );
}

export const RAS = StyleSheet.create({
  outer:          { flex: 1 },
  ayahCard:       { width: '100%', backgroundColor: '#FFFBF0', borderRadius: 18, borderWidth: 1.5, borderColor: '#E8D8A0', padding: 24, alignItems: 'center', marginBottom: 16 },
  ayahText:       { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 28, color: colors.darkText, textAlign: 'center', lineHeight: 52 },
  // Fixed bottom area — always visible above the result sheet
  micArea:        { alignItems: 'center', paddingTop: 12, paddingBottom: 16 },
  micInstruction: { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.mutedText, marginBottom: 20, textAlign: 'center' },
  spinner:        { marginTop: 16, marginBottom: 16 },
  // White background with green border makes the mic.png icon clearly visible
  // against the button surface. Press → slight scale-down.
  micBtn:         { width: 108, height: 108, borderRadius: 54, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  micBtnActive:   { transform: [{ scale: 0.93 }], shadowOpacity: 0.25 },
  micBtnRecorded: { width: 76, height: 76, borderRadius: 38, opacity: 0.7 },
  micImage:       { width: 52, height: 52, tintColor: '#F5F7FA' },
  listenAnim:     { width: 88, height: 88 },
  skipBtn:        { marginTop: 18, paddingVertical: 4, paddingHorizontal: 10 },
  skipBtnText:    { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.mutedText, textDecorationLine: 'underline' },
  errorBox:       { marginTop: 20, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, alignItems: 'center', width: '100%' },
  errorText:      { fontFamily: 'Nunito-Regular', fontSize: 13, color: '#991B1B', textAlign: 'center', marginBottom: 8 },
  retryLink:      { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.primary },
});
