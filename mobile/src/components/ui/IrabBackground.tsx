import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors } from '../../theme/colors';

const CHARS = [
  'بَ', 'تُ', 'ثِ', 'جْ', 'حَ', 'خُ', 'دِ', 'ذْ', 'رَ', 'زُ',
  'سِ', 'شْ', 'صَ', 'ضُ', 'طِ', 'ظْ', 'عَ', 'غُ', 'فِ', 'قْ',
  'كَ', 'لُ', 'مِ', 'نْ', 'هَ', 'وُ', 'يِ',
];

type Props = {
  color?: string;
  count?: number;
};

export function IrabBackground({
  color = colors.yellow,
  count = 48,
}: Props) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => {
        const x = ((i * 1618) % 9400) / 100;
        const y = ((i * 2347) % 9700) / 100;
        const size = 11 + (i % 6) * 4;
        const opacity = 0.04 + (i % 4) * 0.012;
        return (
          <AppText
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              fontSize: size,
              opacity,
              color,
            }}>
            {CHARS[i % CHARS.length]}
          </AppText>
        );
      })}
    </View>
  );
}
