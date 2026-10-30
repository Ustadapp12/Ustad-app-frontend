import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { onPlayingChange, stopAudio } from '../../../services/audioPlayer';
import { colors } from '../../../theme';
import PlayPauseIcon from '../../../components/PlayPauseIcon';
import { playUrl, playUrlSequenceFast } from '../lessonAudio';

// ── Segment play button with waveform signal ─────────────────────
// url: the full segment / ayah audio; urls: word-by-word clips played in
// sequence when no single url is given (mirrors PlayPauseBtn's pattern).

export const BAR_HEIGHTS = [7, 13, 20, 13, 7]; // waveform bar heights in px

export function SegmentPlayBtn({ url, urls }: { url?: string | null; urls?: string[] | null }) {
  const [playing, setPlaying] = useState(false);
  const mountedRef = useRef(true);
  const pulseAnims = useRef(BAR_HEIGHTS.map(() => new Animated.Value(1))).current;
  const hasAudio = !!(url || urls?.length);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { setPlaying(false); }, [url, urls]);

  // See PlayPauseBtn's identical subscription — an external stopAudio() call
  // (Check press) doesn't reliably fire playUrl's completion callback, so the
  // waveform pulse can keep animating after the sound has actually stopped.
  useEffect(() => onPlayingChange(isPlaying => {
    if (!isPlaying && mountedRef.current) setPlaying(false);
  }), []);

  useEffect(() => {
    if (playing) {
      const anims = pulseAnims.map((a, i) =>
        Animated.loop(Animated.sequence([
          Animated.timing(a, { toValue: 0.35, duration: 300 + i * 80, useNativeDriver: true }),
          Animated.timing(a, { toValue: 1, duration: 300 + i * 80, useNativeDriver: true }),
        ]))
      );
      anims.forEach(a => a.start());
      return () => anims.forEach(a => a.stop());
    } else {
      pulseAnims.forEach(a => a.setValue(1));
    }
  }, [playing, pulseAnims]);

  const handle = async () => {
    if (!hasAudio) return;
    if (playing) {
      // Stop, not pause: pausing one word of a sequence let the loop carry
      // on to the next word, and a tap during a slow load did nothing.
      setPlaying(false);
      stopAudio();
    } else {
      setPlaying(true); // set before awaiting — resolves only once playback finishes
      if (url) {
        await playUrl(url, () => { if (mountedRef.current) setPlaying(false); });
      } else if (urls?.length) {
        await playUrlSequenceFast(urls, () => { if (mountedRef.current) setPlaying(false); });
      }
    }
  };

  return (
    <TouchableOpacity style={SPB.row} onPress={handle} disabled={!hasAudio}>
      <View style={[SPB.btn, !hasAudio && SPB.btnDisabled]}>
        <PlayPauseIcon playing={playing} size={11} color="#F5F7FA" />
      </View>
      {/* Waveform signal bars — always visible, animate when playing */}
      <View style={SPB.waveform}>
        {BAR_HEIGHTS.map((h, i) => (
          <Animated.View
            key={i}
            style={[SPB.bar, { height: h, opacity: pulseAnims[i] }]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}

export const SPB = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  btn:      { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bar:      { width: 4, backgroundColor: colors.primary, borderRadius: 2 },
  btnDisabled: { opacity: 0.4 },
});
