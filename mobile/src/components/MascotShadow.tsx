import React from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';

// Ground shadow for Lumo (and any similar standalone mascot art) — sized off
// the character's own width so it scales consistently whether he's a 32px
// inline badge or a 150px hero image. Drop it as the last child inside a
// `position: relative` (React Native's default) wrapper around the existing
// <Image>, sized to roughly match that Image's own width/height — it
// positions itself via `bottom`, so it doesn't require the wrapper to be any
// particular size beyond that.
//
// Lumo's art stands on two close-set feet, not one wide base (see
// lumo_transparent.png) — a single broad oval spanning his full shoulder
// width read as a generic "character shadow" rather than his actual
// footprint. Two smaller, overlapping blobs approximate the twin-foot stance
// instead of one wide pill.
// Three concentric layers per foot, each bigger and fainter than the last,
// instead of one flat-opacity oval — approximates a soft blurred edge
// without an actual blur. Deliberately not an SVG radial gradient: this app
// has a confirmed react-native-svg bug where `url(#id)` fill references
// silently mis-resolve on remount (see MapScreen.tsx's mapInstanceId
// comment and TourOverlay.tsx's own note on the same bug) and this
// component remounts constantly across screens, so a gradient fill here
// would risk quietly degrading back to a flat blob at random.
function Foot({ width, height }: { width: number; height: number }) {
  return (
    <View style={{ width, height }}>
      <View style={[shadowLayerStyle(width * 1.7, height * 1.7, 0.07), { top: -height * 0.35, left: -width * 0.35 }]} />
      <View style={[shadowLayerStyle(width * 1.3, height * 1.3, 0.12), { top: -height * 0.15, left: -width * 0.15 }]} />
      <View style={shadowLayerStyle(width, height, 0.22)} />
    </View>
  );
}

function shadowLayerStyle(width: number, height: number, opacity: number): ViewStyle {
  return {
    position: 'absolute', width, height, borderRadius: 999,
    backgroundColor: `rgba(0,0,0,${opacity})`,
  };
}

export default function MascotShadow({ width, style }: { width: number; style?: StyleProp<ViewStyle> }) {
  const footWidth = width * 0.17;
  const footHeight = width * 0.075;
  const gap = width * 0.05;

  return (
    <View
      pointerEvents="none"
      style={[
        { position: 'absolute', bottom: -width * 0.03, alignSelf: 'center', flexDirection: 'row' },
        style,
      ]}
    >
      <Foot width={footWidth} height={footHeight} />
      <View style={{ width: gap }} />
      <Foot width={footWidth} height={footHeight} />
    </View>
  );
}
