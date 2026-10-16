import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { ArtProps } from './types';

// Source: assets/map2_assets/icon_jump.svg
export const ICON_JUMP_W = 42;
export const ICON_JUMP_H = 34;

function IconJumpArt({ width, height = (width * ICON_JUMP_H) / ICON_JUMP_W, style }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 42 34" style={style}>
      <Path fillRule="evenodd" d="M22.0423 14.9989C23.4698 15.8749 23.4698 17.9491 22.0423 18.825L8.91839 26.8783C7.42288 27.796 5.5 26.7199 5.5 24.9653V8.85865C5.5 7.10401 7.42288 6.02791 8.9184 6.94562L22.0423 14.9989Z" fill="white" />
      <Path fillRule="evenodd" d="M35.4535 14.9989C36.881 15.8749 36.881 17.9491 35.4535 18.825L22.3296 26.8783C20.8341 27.796 18.9112 26.7199 18.9112 24.9653V8.85865C18.9112 7.10401 20.8341 6.02791 22.3296 6.94562L35.4535 14.9989Z" fill="white" />
    </Svg>
  );
}

export default React.memo(IconJumpArt);
