import React from 'react';
import { Platform, Text, TextStyle } from 'react-native';

type Props = {
  children: string;
  size?: number;
  style?: TextStyle;
};

/** System-font emoji text — avoids Nunito clipping emoji glyphs on Android. */
export function EmojiText({ children, size = 40, style }: Props) {
  const lineHeight = Math.round(size * 1.12);
  return (
    <Text
      allowFontScaling={false}
      style={[
        {
          fontSize: size,
          lineHeight,
          textAlign: 'center',
          ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
        },
        style,
      ]}>
      {children}
    </Text>
  );
}
