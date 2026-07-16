import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface Props {
  playing: boolean;
  size?: number;
  color?: string;
}

/**
 * Real vector play/pause icon — used instead of the ▶/⏸ emoji glyphs, which
 * render inconsistently across Android OEM emoji fonts and don't read as
 * "actual" icons. Same icon-swap behavior as before (triangle <-> bars),
 * just drawn instead of relying on a font glyph.
 */
export default function PlayPauseIcon({ playing, size = 18, color = 'white' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {playing ? (
        <>
          <Rect x={5} y={4} width={5} height={16} rx={1.5} fill={color} />
          <Rect x={14} y={4} width={5} height={16} rx={1.5} fill={color} />
        </>
      ) : (
        <Path d="M7 4.5 L19 12 L7 19.5 Z" fill={color} />
      )}
    </Svg>
  );
}
