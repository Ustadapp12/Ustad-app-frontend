import React, { createContext } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { ANIMATIONS } from '../../assets';

/** True while lesson audio is audibly playing on an exercise that shows the
 * wave. Provided by LessonSessionScreen; the tour and the placement test
 * don't provide it, so they never show the wave. */
export const ExerciseWaveContext = createContext(false);

const WAVE_W = 220;
const WAVE_H = 60;
// In a tight gap the wave shrinks (same aspect) rather than hiding; below
// this height its bars stop reading as a wave, so only then does it hide.
const MIN_WAVE_H = 36;
// Clear space kept above and below, so it never touches the options above
// it or the Check button below it.
const WAVE_MARGIN = 4;

/** The playing wave, centred in the empty gap between an exercise's content
 * and its footer button (ExerciseLayout passes the gap). Shrinks to fit a
 * tight gap and renders nothing only when even the smallest wave won't fit. */
export default function ExerciseWave({ gapTop, gapHeight }: { gapTop: number; gapHeight: number }) {
  const h = Math.min(WAVE_H, gapHeight - WAVE_MARGIN * 2);
  if (h < MIN_WAVE_H) return null;
  return (
    <View pointerEvents="none" style={[S.wrap, { top: gapTop + (gapHeight - h) / 2 }]}>
      <LottieView source={ANIMATIONS.wave} autoPlay loop style={{ width: (WAVE_W * h) / WAVE_H, height: h }} />
    </View>
  );
}

const S = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
