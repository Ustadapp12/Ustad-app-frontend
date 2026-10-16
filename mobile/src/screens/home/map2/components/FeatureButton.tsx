import React from 'react';
import { Image, Text, TouchableOpacity, View, type ImageSourcePropType } from 'react-native';
import type { Map2Styles } from '../styles';

// One of the four corner buttons (Search, Journey, Review x2). Every box is in
// Figma points relative to the button's own frame.
export interface FeatureSpec {
  left: number; top: number; w: number; h: number;
  bg: { left: number; top: number; w: number; h: number };
  image: { src: ImageSourcePropType; left: number; top: number; size: number; rotate: number };
  // Centred over the button's background box.
  label: { text: string; top: number };
  // Figma draws the label under the icon on some buttons and over it on others.
  labelUnderImage?: boolean;
}

interface Props {
  S: Map2Styles;
  s: number;
  topInset: number;
  spec: FeatureSpec;
  onPress: () => void;
  children?: React.ReactNode;
}

function FeatureButton({ S, s, topInset, spec, onPress, children }: Props) {
  const { bg, image, label } = spec;
  const labelEl = (
    <Text style={[S.featureLabel, { left: bg.left * s, width: bg.w * s, top: label.top * s }]} numberOfLines={1}>
      {label.text}
    </Text>
  );
  return (
    <TouchableOpacity
      style={[S.feature, { left: spec.left * s, top: topInset + spec.top * s, width: spec.w * s, height: spec.h * s }]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityLabel={label.text}
    >
      <View style={[S.featureBg, { left: bg.left * s, top: bg.top * s, width: bg.w * s, height: bg.h * s }]} />
      {spec.labelUnderImage && labelEl}
      <Image
        source={image.src}
        style={{
          position: 'absolute', left: image.left * s, top: image.top * s,
          width: image.size * s, height: image.size * s, transform: [{ rotate: `${image.rotate}deg` }],
        }}
        resizeMode="contain"
      />
      {!spec.labelUnderImage && labelEl}
      {children}
    </TouchableOpacity>
  );
}

export default React.memo(FeatureButton);
