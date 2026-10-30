import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { ArtProps } from './types';

// Source: assets/screens/home/map2/svg/dune_pills.svg
export const DUNE_PILLS_W = 78.2861;
export const DUNE_PILLS_H = 16.8896;

function DunePillsArt({ width, height = (width * DUNE_PILLS_H) / DUNE_PILLS_W, style, fills }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 78.2861 16.8896" style={style}>
      <Path d="M43.748 8.44482C43.748 13.1088 39.9672 16.8896 35.3032 16.8896H8.44482C3.78088 16.8896 0 13.1088 0 8.44482C0 3.78088 3.78088 0 8.44482 0H35.3032C39.9672 0 43.748 3.78088 43.748 8.44482ZM78.2861 8.44482C78.2861 13.1088 74.5053 16.8896 69.8413 16.8896H63.7056C59.0416 16.8896 55.2607 13.1088 55.2607 8.44482C55.2607 3.78088 59.0416 0 63.7056 0H69.8413C74.5053 0 78.2861 3.78088 78.2861 8.44482Z" fill={fills?.['#FFFBE9'] ?? '#FFFBE9'} />
    </Svg>
  );
}

export default React.memo(DunePillsArt);
