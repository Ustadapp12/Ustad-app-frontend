import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useArabicFont, arabicTextStyle } from '../../../utils/arabicFont';
import { colors } from '../../../theme';
import type { ExerciseDict } from '../../../types/api';
import HearButton from '../../../components/lesson/HearButton';
import type { SpeakResult } from '../components/SpeakResultBanner';
import { playUrl, playUrlSequenceFast } from '../lessonAudio';
import { BUBBLE_TEXT, type Character } from '../lessonShared';
import { useSpeakAttempt } from './speak/useSpeakAttempt';
import { SpeakExerciseShell } from './speak/SpeakExerciseShell';

// ── Read and Speak exercise ────────────────────────────────────────
// Shows a row of tappable word chips (each plays its audio_url).
// Tap the mic to record reading all the words aloud.
// Scores via speak-attempt API and shows result inline.

export function ReadAndSpeak({
  ex, surahName, character, onSpeakScored, onFinalize, onSkip, micButtonRef, glowMic,
}: {
  ex: ExerciseDict; surahName: string; character: Character; onSpeakScored: (result: SpeakResult) => void;
  onFinalize: (result: SpeakResult) => void;
  onSkip: () => void;
  /** Tour-only: lets TourLessonScreen measure the real mic button, for the cutout hole. */
  micButtonRef?: React.Ref<View>;
  /** Tour-only: glow the real mic button itself. */
  glowMic?: boolean;
}) {
  const arabicFont = useArabicFont();
  const tokens = ex.tokens ?? [];
  const speak = useSpeakAttempt({
    ex,
    tag: 'ReadAndSpeak',
    correctAyah: ex.expected_arabic ?? null,
    segmentAudioUrls: ex.tokens?.map(t => t.audio_url).filter((u): u is string => !!u?.trim()) ?? null,
    onSpeakScored,
    onFinalize,
  });
  const { speakState } = speak;
  // True only while the "Hear" (whole-phrase) audio is actually playing —
  // used to disable the individual word chips so their taps don't overlap
  // the sequential playback. Never hides the chips themselves.
  const [hearingAll, setHearingAll] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  useEffect(() => { setHearingAll(false); }, [ex.ex_id]);

  // Collect all audio URLs for the "hear them all" sequential playback
  const allAudioUrls = tokens.map(t => t.audio_url).filter(Boolean) as string[];

  return (
    <SpeakExerciseShell
      speak={speak}
      character={character}
      surahName={surahName}
      ayahNo={ex.ayah_no}
      bubbleText={BUBBLE_TEXT.read_and_speak}
      onSkip={onSkip}
      micButtonRef={micButtonRef}
      glowMic={glowMic}
    >
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
    </SpeakExerciseShell>
  );
}

const RANS = StyleSheet.create({
  // Words wrap into multiple lines for longer ayahs
  wordRow:        { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 16, width: '100%' },
  wordChip:       { backgroundColor: '#FFFBF0', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#E8D8A0' },
  wordChipDisabled: { opacity: 0.4 },
  wordText:       { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 22, color: colors.darkText },
});
