import React from 'react';
import { Path, G } from 'react-native-svg';

// ── Pathway — the walkable road itself, textured with the brick pattern.
// One function so the whole road is a single reusable unit; every dimension
// comes from `sc()`, so it resizes with the model instead of being frozen at
// whatever width the app first mounted at. ──
export function Pathway({ d, sc, patternId }: { d: string; sc: (n: number) => number; patternId: string }) {
  return (
    <G>
      {/* Beveled undercoat so the road reads as carved into the ground —
          kept light so it doesn't read as a heavy shadow. */}
      <Path d={d} stroke="rgba(60,38,8,0.14)" strokeWidth={sc(64)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={d} stroke="rgba(60,38,8,0.18)" strokeWidth={sc(50)} fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(0, ${sc(2)})`} />
      {/* Brick texture — the actual walkable surface */}
      <Path d={d} stroke={`url(#${patternId})`} strokeWidth={sc(40)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={d} stroke="rgba(20,10,4,0.14)" strokeWidth={sc(3)} fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(0, ${sc(2)})`} />
      {/* Thin top-edge highlight for a subtle 3D pop */}
      <Path d={d} stroke="rgba(255,248,220,0.32)" strokeWidth={sc(3)} fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(0, ${-sc(1)})`} />
    </G>
  );
}
