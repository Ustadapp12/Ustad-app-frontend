import React from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { usePredictedProgress } from '../hooks/usePredictedProgress';

interface Props {
  active: boolean;
  estimatedMs: number;
  realDurationMs?: number | null;
  width?: number;
  color?: string;
  trackColor?: string;
  style?: ViewStyle;
}

/** Thin rounded progress bar driven by usePredictedProgress — animates based on
 * realDurationMs if provided (measured actual time), otherwise uses estimatedMs */
export default function PredictedProgressBar({
  active, estimatedMs, realDurationMs, width = 140, color = '#37A168', trackColor = 'rgba(255,255,255,0.28)', style,
}: Props) {
  const progress = usePredictedProgress(active, estimatedMs, realDurationMs ?? undefined);
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={[S.track, { width, backgroundColor: trackColor }, style]}>
      <Animated.View style={[S.fill, { width: barWidth, backgroundColor: color }]} />
    </View>
  );
}

const S = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
