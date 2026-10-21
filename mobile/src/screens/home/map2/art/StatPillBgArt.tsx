import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { ArtProps } from './types';

// Source: assets/screens/home/map2/svg/stat_pill_bg.svg
export const STAT_PILL_BG_W = 82.5037;
export const STAT_PILL_BG_H = 34.9999;

function StatPillBgArt({ width, height = (width * STAT_PILL_BG_H) / STAT_PILL_BG_W, style, fills }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 82.5037 34.9999" style={style}>
      <Path d="M14.1006 0.25045L51.5388 0.210603C58.3419 0.206244 71.9542 -1.29101 77.0809 3.76179C80.1031 6.7697 82.0326 11.1771 82.4339 15.9896C83.2307 26.1373 77.1028 33.9306 69.1711 34.773L31.0029 34.8161C25.9495 34.8237 16.0423 35.4288 11.4786 34.4011C-4.39452 30.8257 -4.068 1.973 14.1006 0.25045Z" fill={fills?.['#F9FCFD'] ?? '#F9FCFD'} fillOpacity={0.4} />
    </Svg>
  );
}

export default React.memo(StatPillBgArt);
