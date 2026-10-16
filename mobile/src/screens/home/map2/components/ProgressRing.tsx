import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { DAY } from '../map2Theme';

// Ring around the current node (Figma "Progress illustration", 98pt): grey
// track, yellow arc clockwise from 12 o'clock, with the thin white leading
// edge the Figma ring has just past the arc's tip.
const R = 45.08;
const STROKE = 7.84;
const C = 2 * Math.PI * R;
const LEAD = (6 / 360) * C;

function ProgressRing({ size, progress }: { size: number; progress: number }) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <Svg width={size} height={size} viewBox="0 0 98 98">
      <Circle cx={49} cy={49} r={R} stroke={DAY.ringTrack} strokeWidth={STROKE} fill="none" />
      {p > 0 && (
        <>
          <Circle cx={49} cy={49} r={R} stroke="#FFFFFF" strokeWidth={STROKE} fill="none" strokeLinecap="round"
            strokeDasharray={`${Math.min(C, p * C + LEAD)} ${C}`} transform="rotate(-90 49 49)" />
          <Circle cx={49} cy={49} r={R} stroke={DAY.ringFill} strokeWidth={STROKE} fill="none" strokeLinecap="round"
            strokeDasharray={`${p * C} ${C}`} transform="rotate(-90 49 49)" />
        </>
      )}
    </Svg>
  );
}

export default React.memo(ProgressRing);
