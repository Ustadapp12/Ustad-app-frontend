import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface Props {
  colors: React.ComponentProps<typeof LinearGradient>['colors'];
  locations?: number[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const RADIUS_KEYS = [
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
] as const;

// A View with a gradient behind it. Use this instead of giving LinearGradient
// padding and children: on iOS the library is a legacy view that Fabric
// mounts inside the padding (RCTViewComponentView sets the content view to
// the content frame), so a padded gradient starts below the top padding,
// stops short of the bottom padding, and clips its children (seen on the
// Pray card, 2026-10-22). Here the View owns layout and padding, and the
// gradient just fills it edge to edge with the same rounded corners.
export default function GradientBox({ colors, locations, style, children }: Props) {
  const flat = StyleSheet.flatten(style) ?? {};
  const radii: ViewStyle = {};
  for (const k of RADIUS_KEYS) if (flat[k] != null) radii[k] = flat[k] as number;
  return (
    <View style={style}>
      <LinearGradient
        colors={colors}
        locations={locations}
        style={[StyleSheet.absoluteFill, radii]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}
