import { View, StyleSheet } from 'react-native';
import { useArabicFont, arabicTextStyle } from '../../../utils/arabicFont';
import { colors } from '../../../theme';
import type { ExerciseDict } from '../../../types/api';
import AyahText from '../../../components/lesson/AyahText';
import { PlayPauseBtn } from '../components/PlayPauseBtn';
import type { SpeakResult } from '../components/SpeakResultBanner';
import { BUBBLE_TEXT, type Character } from '../lessonShared';
import { useSpeakAttempt } from './speak/useSpeakAttempt';
import { SpeakExerciseShell } from './speak/SpeakExerciseShell';

// ── Read Ayah and Speak exercise ───────────────────────────────────
// Shows the full ayah with a play button (hear it first), then a mic to
// record the recitation. Scores via speak-attempt API then calls
// onSpeakScored so the parent can show the result banner.
//
// phase: "main"   — single ayah
// phase: "review" — same UX (side-by-side comparison is deferred)

export function ReadAyahAndSpeak({
  ex, surahName, character, onSpeakScored, onFinalize, onSkip,
}: {
  ex: ExerciseDict; surahName: string; character: Character; onSpeakScored: (result: SpeakResult) => void;
  onFinalize: (result: SpeakResult) => void;
  onSkip: () => void;
}) {
  const arabicFont = useArabicFont();
  const speak = useSpeakAttempt({
    ex,
    tag: 'ReadAyahAndSpeak',
    correctAyah: ex.ayah_ar ?? ex.expected_arabic ?? null,
    segmentAudioUrls: ex.segment_audio_urls ?? null,
    onSpeakScored,
    onFinalize,
  });

  return (
    <SpeakExerciseShell
      speak={speak}
      character={character}
      surahName={surahName}
      ayahNo={ex.ayah_no}
      bubbleText={BUBBLE_TEXT.read_ayah_and_speak}
      scoringText="Scoring your recitation…"
      onSkip={onSkip}
    >
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
        disabled={speak.speakState !== 'idle'}
      />
    </SpeakExerciseShell>
  );
}

const RAS = StyleSheet.create({
  ayahCard:       { width: '100%', backgroundColor: '#FFFBF0', borderRadius: 18, borderWidth: 1.5, borderColor: '#E8D8A0', padding: 24, alignItems: 'center', marginBottom: 16 },
  ayahText:       { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 28, color: colors.darkText, textAlign: 'center', lineHeight: 52 },
});
