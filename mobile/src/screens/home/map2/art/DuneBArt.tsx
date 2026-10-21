import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { ArtProps } from './types';

// Source: assets/screens/home/map2/svg/dune_b.svg
export const DUNE_B_W = 162.251;
export const DUNE_B_H = 50.1348;

function DuneBArt({ width, height = (width * DUNE_B_H) / DUNE_B_W, style, fills }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 162.251 50.1348" style={style}>
      <Path d="M162.251 41.0825C162.251 46.0819 158.198 50.1348 153.199 50.1348H23.4292C18.4298 50.1348 14.377 46.0819 14.377 41.0825C14.377 36.0831 18.4298 32.0303 23.4292 32.0303H31.375C35.2205 32.0303 38.3379 28.9129 38.3379 25.0674C38.3379 21.2219 35.2205 18.1045 31.375 18.1045H9.05225C4.05283 18.1045 0 14.0517 0 9.05225C0 4.05283 4.05283 0 9.05225 0H93.6382C98.6376 0 102.69 4.05283 102.69 9.05225C102.69 14.0517 98.6376 18.1045 93.6382 18.1045H86.377C82.5315 18.1045 79.4141 21.2219 79.4141 25.0674C79.4141 28.9129 82.5315 32.0303 86.377 32.0303H153.199C158.198 32.0303 162.251 36.0831 162.251 41.0825Z" fill={fills?.['#FFFBE9'] ?? '#FFFBE9'} />
    </Svg>
  );
}

export default React.memo(DuneBArt);
