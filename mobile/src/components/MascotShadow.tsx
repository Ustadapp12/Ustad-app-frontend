import React from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';

// Flat dark ground shadow for Lumo (and any similar standalone mascot art)
// — sized off the character's own width so it scales consistently whether
// he's a 32px inline badge or a 150px hero image. Drop it as the last child
// inside a `position: relative` (React Native's default) wrapper around the
// existing <Image>, sized to roughly match that Image's own width/height —
// it positions itself via `bottom`, so it doesn't require the wrapper to be
// any particular size beyond that.
export default function MascotShadow({ width, style }: { width: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          bottom: -width * 0.04,
          alignSelf: 'center',
          width: width * 0.58,
          height: width * 0.14,
          borderRadius: 999,
          backgroundColor: 'rgba(0,0,0,0.22)',
        },
        style,
      ]}
    />
  );
}
