import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';

interface Props {
  size: number;
  fill?: string;
  stroke?: string;
}

export default function ShieldIcon({ size, fill = colors.primary, stroke = colors.primaryDark }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2.2 L20 5.2 V11.2 C20 16.2 16.6 20.1 12 21.8 C7.4 20.1 4 16.2 4 11.2 V5.2 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Path
        d="M8.2 12.1 L10.9 14.8 L15.9 9.4"
        fill="none"
        stroke={colors.white}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
