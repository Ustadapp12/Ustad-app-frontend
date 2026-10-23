import React from 'react';
import { View, Text } from 'react-native';
import type { Styles } from '../mapStyles';

// ── Speech bubble — pure CSS, sizes to text content ───────────────
// tailAngle rotates the tail away from its default straight-down point —
// Lumo stands beside the active node (left or right, see scrollIsLeft), not
// under it, so a straight-down tail pointed at Lumo's own head instead of
// what the speech is actually about. Rotating it toward whichever side the
// node is on (the opposite side from Lumo) reads as "pointing at the node"
// without needing to reposition the bubble itself off of Lumo.
export function SpeechBubble({ text, SB, tailAngle }: { text: string; SB: Styles['SB']; tailAngle?: number }) {
  return (
    <View style={SB.wrapper}>
      <View style={SB.bubble}>
        <Text style={SB.text}>{text}</Text>
      </View>
      <View style={[SB.tail, tailAngle ? { transform: [{ rotate: `${tailAngle}deg` }] } : null]} />
    </View>
  );
}
