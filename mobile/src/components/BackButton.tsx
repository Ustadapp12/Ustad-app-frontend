import React from 'react';
import { Image, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme';
import { ICONS } from '../assets';

interface Props {
  onPress: () => void;
  /** The touchable's own container (size, border, position) -- every
   * screen's header shape differs, so that part stays per-screen. */
  style?: StyleProp<ViewStyle>;
  size?: number;
  accessibilityLabel?: string;
}

// The back-arrow icon + require() + resizeMode was copy-pasted across 14+
// screens; this is the one place that duplication lives now, so swapping
// the asset or its default styling again only needs one edit. Always the
// same charcoal (colors.darkText): no colour override, since per-screen
// tints are how the arrows ended up mixed (2026-10-22).
export default function BackButton({
  onPress, style, size = 20, accessibilityLabel = 'Back',
}: Props) {
  const tintColor = colors.darkText;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={style}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        source={ICONS.backArrow}
        style={{ width: size, height: size, tintColor }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}
