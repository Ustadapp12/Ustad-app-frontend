import React from 'react';
import { Image, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  onPress: () => void;
  /** The touchable's own container (size, border, position) -- every
   * screen's header shape differs, so that part stays per-screen. */
  style?: StyleProp<ViewStyle>;
  size?: number;
  tintColor?: string;
  accessibilityLabel?: string;
}

// The back-arrow icon + require() + resizeMode was copy-pasted across 14+
// screens; this is the one place that duplication lives now, so swapping
// the asset or its default styling again only needs one edit.
export default function BackButton({
  onPress, style, size = 20, tintColor = colors.darkText, accessibilityLabel = 'Back',
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={style}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        source={require('../../assets/back_arrow.png')}
        style={{ width: size, height: size, tintColor }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}
