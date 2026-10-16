import React from 'react';
import { Image, TouchableOpacity, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  onPress: () => void;
  /** Container (size, bg, border) -- differs per screen, stays per-screen. */
  style?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<ImageStyle>;
}

// The chest-icon badge used wherever a reward isn't claimable yet
// (SearchSurahsScreen, SurahProgressScreen) -- was the same
// TouchableOpacity+Image+require() copy-pasted at each call site. Pair with
// ChestInfoModal for the "coming soon" popup it should open.
export default function RewardChestButton({ onPress, style, iconStyle }: Props) {
  return (
    <TouchableOpacity
      style={style}
      activeOpacity={0.7}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel="Reward chest"
    >
      <Image
        source={require('../../assets/images/chest.png')}
        style={iconStyle}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}
