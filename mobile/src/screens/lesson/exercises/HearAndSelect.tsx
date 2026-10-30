import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Pressable } from 'react-native';
import { useArabicFont, arabicTextStyle } from '../../../utils/arabicFont';
import { colors } from '../../../theme';
import type { ExerciseDict } from '../../../types/api';
import ExerciseLayout from '../../../components/lesson/ExerciseLayout';
import ExerciseFooterButton from '../../../components/lesson/ExerciseFooterButton';
import UstadSays from '../../../components/lesson/UstadSays';
import { EX } from './exerciseStyles';
import { playUrl, playUrlSequence } from '../lessonAudio';
import { SPEAKER_ICON, BUBBLE_TEXT, type Character } from '../lessonShared';

// ── Hear and Select exercise ──────────────────────────────────────
// Auto-plays segment audio on mount. Big speaker button to replay.
// Tap option = select. Long-press option = hear its audio. Submit = ar string.

export function HearAndSelect({
  ex, surahName, character, locked, onSubmit,
}: {
  ex: ExerciseDict;
  surahName: string;
  character: Character;
  locked?: boolean;
  onSubmit: (ans: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const seqGenRef = useRef(0);
  const mountedRef = useRef(true);
  const arabicFont = useArabicFont();
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // REMOVED 2026-08-28 (real bug, not the onLongPress issue reported
  // alongside it): this subscription used to fire on EVERY between-word gap
  // in the sequence below, not just a genuine external stop -- each clip in
  // segment_audio_urls independently goes true->false as it plays, so on a
  // 3-word phrase this fired twice before the phrase was even half heard.
  // Bumping seqGenRef here made the loop below see "seqGenRef.current !==
  // gen" on its very next iteration and return early -- so only the FIRST
  // word of any multi-word phrase ever actually played, and the button
  // flipped back to its idle icon at that same moment (both halves of "I'm
  // holding the options but audio is not playing" / "the play/pause
  // changes"). The loop's own natural-completion branch at the bottom of
  // startPlayback already sets playing=false correctly once every word has
  // genuinely finished -- this handler was never needed for that case, only
  // for a real external stop (Check press mid-phrase), and playToken (see
  // services/audioPlayer.ts) now makes that case safe without it: stopAudio()
  // bumps playToken, so every remaining queued clip's on-demand load sees a
  // stale token and resolves near-instantly without playing, instead of
  // hanging for its full duration -- the loop reaches its own natural end
  // (and sets playing=false itself) within a beat either way.

  const startPlayback = () => {
    const urls = ex.segment_audio_urls ?? [];
    if (!urls.length) return;
    seqGenRef.current += 1;
    const gen = seqGenRef.current;
    if (mountedRef.current) setPlaying(true);
    void (async () => {
      await playUrlSequence(urls);
      if (seqGenRef.current === gen && mountedRef.current) setPlaying(false);
    })();
  };

  useEffect(() => {
    setSelected(null);
  }, [ex.ex_id]);

  return (
    <ExerciseLayout
      footer={<ExerciseFooterButton onPress={() => { if (selected) onSubmit(selected); }} disabled={!selected || locked} />}
    >
      <UstadSays
        character={character}
        text={BUBBLE_TEXT.hear_and_select}
        label={`Surah ${surahName} · Verse ${ex.ayah_no}`}
        retry={ex.phase === 'mistakes_review'}
      />

      {/* Big speaker button */}
      <TouchableOpacity
        style={[HAS.speakerBtn, playing && HAS.speakerBtnActive]}
        onPress={startPlayback}
        disabled={locked}
        activeOpacity={0.8}
      >
        {playing
          ? <View style={HAS.pauseIcon}><View style={HAS.pauseBar} /><View style={HAS.pauseBar} /></View>
          : <Image source={SPEAKER_ICON} style={HAS.speakerIcon} resizeMode="contain" />
        }
        <Text style={[HAS.speakerLabel, playing && HAS.speakerLabelPlaying]}>
          {playing ? 'Playing…' : 'Tap to hear'}
        </Text>
      </TouchableOpacity>

      {/* Option cards */}
      <View style={EX.optionsColumn}>
        {(ex.options ?? []).map((o, i) => (
          <Pressable
            key={i}
            style={[EX.optionBtnFull, selected === o.ar && EX.optionSelected, locked && EX.locked]}
            // Re-enabled 2026-09-13 alongside the identical change in
            // FillBlankOrNextWord's options above — see that one's full
            // comment. Switched to Pressable (rather than restoring
            // onLongPress on TouchableOpacity) since that's the specific
            // pairing that was reported unreliable on-device.
            onLongPress={() => { if (!locked && o.audio_url) void playUrl(o.audio_url); }}
            delayLongPress={350}
            onPress={() => { if (!locked) setSelected(o.ar); }}
          >
            <Text style={[arabicTextStyle(EX.optionTextArabic as any, arabicFont) as any, selected === o.ar && EX.optionTextSelected]}>{o.ar}</Text>
          </Pressable>
        ))}
      </View>
    </ExerciseLayout>
  );
}

export const HAS = StyleSheet.create({
  speakerBtn: {
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.primaryBg, borderWidth: 3, borderColor: colors.primary,
    marginBottom: 24,
    shadowColor: colors.primary, shadowOpacity: 0.28, shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  speakerBtnActive: { backgroundColor: colors.primary },
  speakerIcon:  { width: 36, height: 36 },
  speakerLabel: { fontFamily: 'Nunito-Bold', fontSize: 11, color: colors.primary, marginTop: 6, textAlign: 'center' },
  pauseIcon:    { flexDirection: 'row', gap: 7, alignItems: 'center' },
  pauseBar:     { width: 7, height: 30, backgroundColor: '#F5F7FA', borderRadius: 3 },
  speakerLabelPlaying: { color: 'rgba(255,255,255,0.85)' },
});
