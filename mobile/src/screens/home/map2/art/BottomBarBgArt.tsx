import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { ArtProps } from './types';

// Source: assets/map2_assets/bottom_bar_bg.svg
export const BOTTOM_BAR_BG_W = 440;
export const BOTTOM_BAR_BG_H = 71;

function BottomBarBgArt({ width, height = (width * BOTTOM_BAR_BG_H) / BOTTOM_BAR_BG_W, style, fills }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 440 71" style={style}>
      <Path d="M0 12.305C0.55725 11.5782 1.1139 10.513 1.65856 9.71931C6.11842 3.21528 11.4484 0.403974 20.0362 0.424861C51.2626 0.495875 82.4839 0.495873 113.708 0.474986L325.721 0.487479L399.571 0.458261C416.973 0.449906 430.599 -3.46005 440 11.7118V71H0V12.305Z" fill={fills?.['#FCF9EB'] ?? '#FCF9EB'} fillOpacity={0.4} />
    </Svg>
  );
}

export default React.memo(BottomBarBgArt);
