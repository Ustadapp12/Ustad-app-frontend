import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { preloadAudioUrls, evictPreloadedUrls, onPlayingChange, isAudioPlaying } from '../../../services/audioPlayer';
import { colors } from '../../../theme';
import type { ExerciseDict } from '../../../types/api';
import ExerciseLayout from '../../../components/lesson/ExerciseLayout';
import ExerciseFooterButton from '../../../components/lesson/ExerciseFooterButton';
import UstadSays from '../../../components/lesson/UstadSays';
import AyahWithBlank from '../../../components/lesson/AyahWithBlank';
import HearButton from '../../../components/lesson/HearButton';
import { EX } from './exerciseStyles';
import { playUrl, playUrlSequence, pauseCurrentAudio } from '../lessonAudio';
import { BUBBLE_TEXT, type Character } from '../lessonShared';

// ── Audio Fill exercise ───────────────────────────────────────────
// Same layout as fill_blank but options show play buttons only — no Arabic text visible.

export function AudioFill({
  ex, surahName, character, locked, onSubmit,
}: {
  ex: ExerciseDict;
  surahName: string;
  character: Character;
  locked?: boolean;
  onSubmit: (ans: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  // The option the user last started, and whether audio is audibly playing
  // right now. A circle shows pause exactly while both hold, so it follows
  // the real sound: it goes back to play the moment the clip ends, is
  // paused, or is stopped (Check, another tap, leaving).
  //
  // This used to be one playingIdx set on tap and cleared on any "stopped"
  // event. But playUrl() calls stopAudio() before it plays, and that stop
  // fired the clear right after the tap set it, so a playing option showed
  // the play icon for its whole clip.
  const [startedIdx, setStartedIdx] = useState<number | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(isAudioPlaying());
  const playingIdx = audioPlaying ? startedIdx : null;
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => onPlayingChange(p => { if (mountedRef.current) setAudioPlaying(p); }), []);

  useEffect(() => {
    setSelected(null);
    setStartedIdx(null);

    // Preload all audio for this exercise in the background so taps play instantly.
    // Options first, segment audio after: preloadAudioUrls loads BATCH=4 at a
    // time in array order, and the options are what the user actually taps —
    // putting segment_audio_urls ahead of them meant whichever option someone
    // reached for first (almost always option 1) routinely lost the preload
    // race and fell through to a cold on-demand load, while later options
    // (tapped after the race had more time to finish) felt instant by
    // comparison. Reported as "the first option is always really slow."
    const allUrls = [
      ...(ex.options?.map(o => o.audio_url).filter(Boolean) ?? []),
      ...(ex.segment_audio_urls ?? []),
    ] as string[];
    void preloadAudioUrls(allUrls);

    return () => { evictPreloadedUrls(allUrls); };
  }, [ex.ex_id]);

  const handleOptionTap = async (ar: string, audioUrl: string | null | undefined, idx: number) => {
    if (locked) return;
    setSelected(ar);
    if (playingIdx === idx) {
      await pauseCurrentAudio();
      if (mountedRef.current) setStartedIdx(null);
    } else {
      setStartedIdx(idx);
      await playUrl(audioUrl);
    }
  };

  const blankIdx = ex.tokens?.findIndex(t => t.blank) ?? -1;
  const isCorner = blankIdx === 0 || (ex.tokens != null && blankIdx === ex.tokens.length - 1);
  const wordAudioUrls = isCorner && ex.segment_audio_urls?.length ? ex.segment_audio_urls : null;

  return (
    <ExerciseLayout
      footer={<ExerciseFooterButton onPress={() => { if (selected) onSubmit(selected); }} disabled={!selected || locked} />}
    >
      <UstadSays
        character={character}
        text={BUBBLE_TEXT.audio_fill}
        label={`Surah ${surahName} · Verse ${ex.ayah_no}`}
        retry={ex.phase === 'mistakes_review'}
      />

      {/* "Hear the word" button — user must press to hear; not auto-played */}
      {ex.segment_audio_urls?.length ? (
        <HearButton label="Hear the word" onPress={() => { setStartedIdx(null); void playUrlSequence(ex.segment_audio_urls!); }} />
      ) : null}

      {/* Options are audio-only, so a pick shows "?" rather than the word */}
      <View style={EX.questionCard}>
        <AyahWithBlank before={ex.context_before} tokens={ex.tokens} after={ex.context_after} blankText={selected ? '?' : null} />
      </View>

      {/* Audio-only options — numbered play circles, no Arabic text shown */}
      <View style={AF.optionsGrid}>
        {(ex.options ?? []).map((o, i) => (
          <TouchableOpacity
            key={i}
            style={[AF.optionBtn, selected === o.ar && AF.optionSelected, locked && { opacity: 0.7 }]}
            onPress={() => { void handleOptionTap(o.ar, o.audio_url, i); }}
            activeOpacity={0.8}
          >
            <View style={[AF.playCircle, selected === o.ar && AF.playCircleSelected, playingIdx === i && AF.playCirclePlaying]}>
              {playingIdx === i
                ? <View style={AF.pauseRow}><View style={AF.pauseBar} /><View style={AF.pauseBar} /></View>
                : <Text style={[AF.playIcon, selected === o.ar && { color: '#F5F7FA' }]}>▶</Text>
              }
            </View>
            <Text style={[AF.optionNum, selected === o.ar && { color: colors.primary }]}>{i + 1}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ExerciseLayout>
  );
}

export const AF = StyleSheet.create({
  optionsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  optionBtn:         { flexBasis: '45%', flexGrow: 1, backgroundColor: '#F5F7FA', borderWidth: 1.5, borderColor: colors.border, borderRadius: 16, paddingVertical: 12, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  optionSelected:    { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  playCircle:        { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryBg, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  playCircleSelected:{ backgroundColor: colors.primary },
  playCirclePlaying: { backgroundColor: colors.primaryDark },
  playIcon:          { fontSize: 18, color: colors.primary },
  pauseRow:          { flexDirection: 'row', gap: 4 },
  pauseBar:          { width: 4, height: 14, backgroundColor: '#F5F7FA', borderRadius: 2 },
  optionNum:         { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.mutedText },
});
