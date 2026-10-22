import { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { onPlayingChange } from '../../../services/audioPlayer';
import { colors } from '../../../theme';
import PlayPauseIcon from '../../../components/PlayPauseIcon';
import { playUrl, playUrlSequence, pauseCurrentAudio, resumeCurrentAudio } from '../lessonAudio';

export function PlayPauseBtn({
  url, urls, label = 'Listen', darkMode = false, disabled = false,
}: { url?: string | null; urls?: string[] | null; label?: string; darkMode?: boolean; disabled?: boolean }) {
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const mountedRef = useRef(true);

  // Normalise: prefer single url, fall back to playing urls in sequence
  const hasAudio = !!(url || urls?.length);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { setState('idle'); }, [url]);

  // External stop (e.g. Check pressed mid-playback) doesn't always fire
  // playUrl's own completion callback (Sound.stop() on Android skips it) —
  // without this, the icon can keep showing "playing" for several seconds
  // after the audio itself has actually stopped.
  useEffect(() => onPlayingChange(playing => {
    if (!playing && mountedRef.current) setState(s => (s === 'playing' ? 'idle' : s));
  }), []);

  const handlePress = async () => {
    if (disabled) return;
    if (state === 'idle') {
      setState('playing'); // set before awaiting — playUrl only resolves once playback finishes
      if (url) {
        await playUrl(url, () => { if (mountedRef.current) setState('idle'); });
      } else if (urls?.length) {
        void playUrlSequence(urls, () => { if (mountedRef.current) setState('idle'); });
      }
    } else if (state === 'playing') {
      setState('paused');
      await pauseCurrentAudio();
    } else {
      setState('playing');
      await resumeCurrentAudio();
    }
  };

  const btnLabel = state === 'playing' ? 'Pause' : state === 'paused' ? 'Resume' : label;

  if (!hasAudio) return null;
  return (
    <TouchableOpacity
      style={[PP.btn, darkMode && PP.btnDark, disabled && PP.btnDisabled]}
      onPress={handlePress}
      disabled={disabled}
    >
      <PlayPauseIcon playing={state === 'playing'} size={14} color={darkMode ? '#E0BC4E' : colors.primary} />
      <Text style={[PP.text, darkMode && PP.textDark]}>{`  ${btnLabel}`}</Text>
    </TouchableOpacity>
  );
}

export const PP = StyleSheet.create({
  btn:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(42,125,79,0.12)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'center', marginBottom: 14 },
  btnDark: { backgroundColor: 'rgba(224,188,78,0.15)' },
  btnDisabled: { opacity: 0.4 },
  text:    { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.primary },
  textDark:{ color: '#E0BC4E' },
});
