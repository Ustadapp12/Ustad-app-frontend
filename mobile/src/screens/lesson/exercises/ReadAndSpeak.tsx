import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Pressable } from 'react-native';
import LottieView from 'lottie-react-native';
import { requestMicPermission } from '../../../services/audioRecorder';
import { captureError } from '../../../services/crashReporter';
import { useArabicFont, arabicTextStyle } from '../../../utils/arabicFont';
import { colors } from '../../../theme';
import type { ExerciseDict } from '../../../types/api';
import { TOUR_GLOW } from '../../../components/tour/tourGlow';
import ExerciseLayout from '../../../components/lesson/ExerciseLayout';
import UstadSays from '../../../components/lesson/UstadSays';
import HearButton from '../../../components/lesson/HearButton';
import { RecitationScoringFeedback } from '../components/RecitationScoringFeedback';
import { SpeakResultBanner, type SpeakResult } from '../components/SpeakResultBanner';
import { type SpeakState } from './ReadAyahAndSpeak';
import { playUrl, playUrlSequenceFast, startRecording, stopRecording } from '../lessonAudio';
import { BUBBLE_TEXT, RETRY_BUBBLE_TEXT, type Character } from '../lessonShared';
import { ANIMATIONS, LESSON_IMAGES } from '../../../assets';
import { useRecitationScoring } from '../../../hooks/api';

// ── Read and Speak exercise ────────────────────────────────────────
// Shows a row of tappable word chips (each plays its audio_url).
// Press-and-hold the mic to record reading all the words aloud.
// Scores via speak-attempt API and shows result inline.

export function ReadAndSpeak({
  ex, surahName, character, onSpeakScored, onFinalize, onSkip, micButtonRef, glowMic,
}: {
  ex: ExerciseDict; surahName: string; character: Character; onSpeakScored: (result: SpeakResult) => void;
  /** Declining the retry (tapping Next in the retry-choice) — the user has
   * already seen that result's feedback there, so this advances straight to
   * the next question instead of routing back through onSpeakScored, which
   * would show the same feedback sheet a second time. */
  onFinalize: (result: SpeakResult) => void;
  onSkip: () => void;
  /** Tour-only: lets TourLessonScreen measure the real mic button, for the cutout hole. */
  micButtonRef?: React.Ref<View>;
  /** Tour-only: glow the real mic button itself. */
  glowMic?: boolean;
}) {
  const scoreRecitation = useRecitationScoring();
  const arabicFont = useArabicFont();
  const [speakState, setSpeakState] = useState<SpeakState>('idle');
  const [error, setError]           = useState<string | null>(null);
  // The failed 1st-attempt result, held here (not sent to onSpeakScored) while
  // the user is deciding Try Again vs Next.
  const [pendingResult, setPendingResult] = useState<SpeakResult | null>(null);
  // True only while the "Hear" (whole-phrase) audio is actually playing —
  // used to disable the individual word chips so their taps don't overlap
  // the sequential playback. Never hides the chips themselves.
  const [hearingAll, setHearingAll] = useState(false);
  const mountedRef = useRef(true);
  // 1 on the first attempt, 2 on the retry — a fail on attempt 2 is always
  // final, no second retry offered.
  const attemptNumRef = useRef(1);
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
      void stopRecording().catch(() => {});
    };
  }, []);

  const recordedUriRef = useRef<string | null>(null);
  // Guards against a second tap landing before the first tap's state update
  // has taken effect — only one recording/scoring attempt in flight at a time.
  const busyRef = useRef(false);

  useEffect(() => {
    setSpeakState('idle');
    setError(null);
    setPendingResult(null);
    setHearingAll(false);
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
          console.warn('[ReadAndSpeak] startRecording failed:', e);
          captureError(e, { where: 'ReadAndSpeak.startRecording' });
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
          console.warn('[ReadAndSpeak] stopRecording failed:', e);
          captureError(e, { where: 'ReadAndSpeak.stopRecording' });
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
            const wordAudioUrls = ex.tokens?.map(t => t.audio_url).filter((u): u is string => !!u?.trim()) ?? null;
            const result: SpeakResult = { passed: scored.passed, score_pct: scored.score_pct, transcript: scored.transcript, correctAyah: ex.expected_arabic ?? null, ayahAudioUrl: ex.ayah_audio_url ?? null, segmentAudioUrls: wordAudioUrls, expectedWords: scored.expected_words };
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
          console.warn('[ReadAndSpeak] speak-attempt failed:', e);
          captureError(e, { where: 'ReadAndSpeak.speakAttempt' });
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

  const tokens = ex.tokens ?? [];

  // Collect all audio URLs for the "hear them all" sequential playback
  const allAudioUrls = tokens.map(t => t.audio_url).filter(Boolean) as string[];

  // Pinned below the content so the mic is always reachable on every screen size.
  const micArea = speakState !== 'done' && speakState !== 'retry_choice' ? (
    <View style={RANS.micArea}>
      {speakState !== 'scoring' && (
        <Text style={RANS.micInstruction}>
          {speakState === 'recording'
            ? 'Recording… tap to stop'
            : 'Tap the mic to start, tap again to stop and check'}
        </Text>
      )}

      {speakState === 'scoring' ? (
        <RecitationScoringFeedback />
      ) : (
        <View ref={micButtonRef} collapsable={false}>
          <Pressable
            onPress={handleMicTap}
            style={({ pressed }) => [RANS.micBtn, pressed && RANS.micBtnActive, glowMic && TOUR_GLOW]}
          >
            {speakState === 'recording' ? (
              <LottieView
                source={ANIMATIONS.listen}
                autoPlay
                loop
                style={RANS.listenAnim}
              />
            ) : (
              <Image
                source={LESSON_IMAGES.mic}
                style={RANS.micImage}
                resizeMode="contain"
              />
            )}
          </Pressable>
        </View>
      )}

      {/* Every recitation question is skippable — for people who don't
          want to attempt speaking at all. Only offered before a
          recording is made; once there's an attempt in flight/scored,
          the retry-choice's own Next button covers "move on" instead. */}
      {speakState === 'idle' && (
        <TouchableOpacity style={RANS.skipBtn} onPress={onSkip}>
          <Text style={RANS.skipBtnText}>Skip</Text>
        </TouchableOpacity>
      )}

      {!!error && (
        <View style={RANS.errorBox}>
          <Text style={RANS.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => { setError(null); setSpeakState('idle'); }}>
            <Text style={RANS.retryLink}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ) : null;

  return (
    <View style={RANS.outer}>
      <ExerciseLayout footer={micArea}>
        <UstadSays
          character={character}
          text={speakState === 'retry_choice' ? RETRY_BUBBLE_TEXT : BUBBLE_TEXT.read_and_speak}
          label={`Surah ${surahName} · Verse ${ex.ayah_no}`}
        />

        {/* Word chips — displayed RTL (right-to-left, Arabic reading order).
            Always stay visible; only disabled from the moment recording
            starts through scoring/done (mid-recording a tap would get
            picked up by the mic, and once an attempt is submitted there's
            nothing left to prepare for), or while "Hear" is playing all
            words back-to-back (avoids overlapping audio). */}
        <View style={RANS.wordRow}>
          {tokens.map((token, i) => (
            <TouchableOpacity
              key={i}
              style={[RANS.wordChip, (speakState !== 'idle' || hearingAll) && RANS.wordChipDisabled]}
              onPress={() => { void playUrl(token.audio_url); }}
              disabled={speakState !== 'idle' || hearingAll}
            >
              <Text style={arabicTextStyle(RANS.wordText as any, arabicFont) as any}>
                {token.ar}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* "Hear" — pre-loads all word audio then plays in rapid succession.
            Disabled from the moment recording starts through scoring/done,
            same as the word chips, and while its own playback is in flight. */}
        {allAudioUrls.length > 0 && (
          <HearButton
            label="Hear"
            onPress={() => {
              setHearingAll(true);
              void playUrlSequenceFast(allAudioUrls, () => { if (mountedRef.current) setHearingAll(false); });
            }}
            disabled={speakState !== 'idle' || hearingAll}
          />
        )}

      </ExerciseLayout>

      {/* Retry-choice bottom sheet — same visual treatment as the final
          result banner, just with Try Again / Next instead of Continue. */}
      {speakState === 'retry_choice' && pendingResult && (
        <SpeakResultBanner result={pendingResult} onAdvance={handleDeclineRetry} onRetry={handleRetry} />
      )}
    </View>
  );
}

export const RANS = StyleSheet.create({
  outer:          { flex: 1 },
  // Words wrap into multiple lines for longer ayahs
  wordRow:        { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 16, width: '100%' },
  wordChip:       { backgroundColor: '#FFFBF0', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#E8D8A0' },
  wordChipDisabled: { opacity: 0.4 },
  wordText:       { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 22, color: colors.darkText },
  micArea:        { alignItems: 'center', paddingTop: 12, paddingBottom: 16 },
  micInstruction: { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.mutedText, marginBottom: 20, textAlign: 'center' },
  spinner:        { marginTop: 16, marginBottom: 16 },
  // White background with green border makes mic.png clearly visible
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
