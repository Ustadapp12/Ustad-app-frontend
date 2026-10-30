import React, { createContext } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { ANIMATIONS } from '../../assets';

/** True while lesson audio is audibly playing on an exercise that shows the
 * wave. Provided by LessonSessionScreen; the tour and the placement test
 * don't provide it, so they never show the wave. */
export const ExerciseWaveContext = createContext(false);

// The wave art's own width:height.
const WAVE_ASPECT = 220 / 60;
// Share of the screen width the wave spans (220pt on the 393pt baseline phone).
const WIDTH_PCT = 0.56;
// Breakpoint: short screens (iPhone SE size, and the iPhone app on Apple's
// review iPad) have tighter gaps under the options, so the wave starts smaller.
const COMPACT_HEIGHT = 700;
const COMPACT_WIDTH_PCT = 0.45;
// Clear space above and below the wave, as a share of the gap, so it never
// touches the options above it or the Check button below it.
const MARGIN_PCT = 0.08;
// In a tight gap the wave shrinks rather than hiding, down to this share of
// its full size; smaller than that its bars stop reading as a wave, so only
// then does it hide.
const MIN_SCALE = 0.6;

/** The playing wave, centred in the empty gap between an exercise's content
 * and its footer button (ExerciseLayout passes the gap). Sized from the
 * screen, shrunk to fit a tight gap, hidden only when even that won't fit. */
export default function ExerciseWave({ gapTop, gapHeight }: { gapTop: number; gapHeight: number }) {
  const { width, height } = useWindowDimensions();
  const fullH = (width * (height < COMPACT_HEIGHT ? COMPACT_WIDTH_PCT : WIDTH_PCT)) / WAVE_ASPECT;
  const h = Math.min(fullH, gapHeight * (1 - MARGIN_PCT * 2));
  if (h < fullH * MIN_SCALE) return null;
  return (
    <View pointerEvents="none" style={[S.wrap, { top: gapTop + (gapHeight - h) / 2 }]}>
      <LottieView source={ANIMATIONS.wave} autoPlay loop style={{ width: h * WAVE_ASPECT, height: h }} />
    </View>
  );
}

const S = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
