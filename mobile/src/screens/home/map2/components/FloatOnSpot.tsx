import React, { useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useFocusedLoop } from '../../../../hooks/useFocusedLoop';

interface Props {
  /** How far up it rises, in pt. */
  amplitude: number;
  /** One way, up or down. */
  halfCycleMs: number;
  children: React.ReactNode;
}

// Gently bobs its children up and down in place, the same float as Lumo on
// the Leaderboard (9pt, 1.3s each way). Used for the map's current node so it
// stands out from the rest (user, 2026-10-22). Runs only while the map is on
// screen (useFocusedLoop), and fills its parent so layout doesn't change.
export default function FloatOnSpot({ amplitude, halfCycleMs, children }: Props) {
  const float = useRef(new Animated.Value(0)).current;
  useFocusedLoop(float, halfCycleMs);
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -amplitude] });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY }] }]} pointerEvents="box-none">
      {children}
    </Animated.View>
  );
}
