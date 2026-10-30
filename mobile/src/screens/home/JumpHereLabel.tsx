import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Nunito's cap height is 705/1000 of the font size.
const NUNITO_CAP_HEIGHT = 0.705;

interface Props {
  /** The label's text style; must set fontSize and color. */
  style: TextStyle;
}

// "JUMP HERE ▸▸" on the search page. The arrows used to be ▸ glyphs, whose
// drawn size depends on the font and the phone, so they never matched the
// label. Now two drawn triangles exactly the label's cap height, sitting on
// its baseline (an inline view in Text bottom-aligns to the baseline), so
// they line up with the capital letters at any size (2026-10-25).
export default function JumpHereLabel({ style }: Props) {
  const fontSize = style.fontSize ?? 13;
  const h = Math.round(fontSize * NUNITO_CAP_HEIGHT);
  const color = typeof style.color === 'string' ? style.color : '#047A56';
  return (
    <Text style={style as StyleProp<TextStyle>} numberOfLines={1}>
      {'JUMP HERE '}
      <Svg width={h * 1.8} height={h} viewBox="0 0 18 10">
        <Path d="M0 0L8 5L0 10Z M10 0L18 5L10 10Z" fill={color} />
      </Svg>
    </Text>
  );
}
