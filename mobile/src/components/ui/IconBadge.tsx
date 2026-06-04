import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { EmojiText } from './EmojiText';

type Props = {
  emoji: string;
  size?: number;
  style?: ViewStyle;
};

/** Rounded badge with a centered emoji that is not clipped by custom fonts. */
export function IconBadge({ emoji, size = 88, style }: Props) {
  const emojiSize = Math.round(size * 0.5);
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.27 }, style]}>
      <EmojiText size={emojiSize}>{emoji}</EmojiText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
