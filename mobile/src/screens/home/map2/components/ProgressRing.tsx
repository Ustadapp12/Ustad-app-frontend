import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { DAY } from '../map2Theme';

// The full green ring around the current level (98pt, Figma "Progress
// illustration" size). Always whole: Figma's partial gold arc was a placeholder.
function ProgressRing({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 98 98">
      <Circle cx={49} cy={49} r={45.08} stroke={DAY.ringFill} strokeWidth={7.84} fill="none" />
    </Svg>
  );
}

export default React.memo(ProgressRing);
