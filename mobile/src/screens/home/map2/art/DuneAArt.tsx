import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { ArtProps } from './types';

// Source: assets/map2_assets/dune_a.svg
export const DUNE_A_W = 162.251;
export const DUNE_A_H = 50.7979;

function DuneAArt({ width, height = (width * DUNE_A_H) / DUNE_A_W, style, fills }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 162.251 50.7979" style={style}>
      <Path d="M162.251 41.626C162.251 46.6915 158.145 50.7979 153.079 50.7979H23.5488C18.4833 50.7979 14.377 46.6915 14.377 41.626C14.377 36.5605 18.4833 32.4541 23.5488 32.4541H31.2827C35.1792 32.4541 38.3379 29.2954 38.3379 25.3989C38.3379 21.5025 35.1792 18.3438 31.2827 18.3438H9.17187C4.10639 18.3438 0 14.2374 0 9.17188C0 4.10639 4.10639 0 9.17188 0H93.5186C98.584 0 102.69 4.10639 102.69 9.17188C102.69 14.2374 98.584 18.3438 93.5186 18.3438H86.4692C82.5728 18.3438 79.4141 21.5025 79.4141 25.3989C79.4141 29.2954 82.5728 32.4541 86.4692 32.4541H153.079C158.145 32.4541 162.251 36.5605 162.251 41.626Z" fill={fills?.['#FFFBE9'] ?? '#FFFBE9'} />
    </Svg>
  );
}

export default React.memo(DuneAArt);
