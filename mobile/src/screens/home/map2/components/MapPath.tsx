import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DAY } from '../map2Theme';
import type { Dash } from '../map2Model';

// The dotted trail, one rotated View per dash. Plain Views have no backing
// bitmap, unlike a tall Svg path, so the trail costs almost nothing.
// `offsetY` is the band's top: dashes carry map-wide positions.
function MapPath({ dashes, len, thick, offsetY }: { dashes: Dash[]; len: number; thick: number; offsetY: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dashes.map((d, i) => (
        <View
          key={i}
          style={[styles.dash, { left: d.x - len / 2, top: d.y - offsetY - thick / 2, width: len, height: thick, backgroundColor: DAY.pathDash, transform: [{ rotate: `${d.angle}deg` }] }]}
        />
      ))}
    </View>
  );
}

export default React.memo(MapPath);

const styles = StyleSheet.create({
  dash: { position: 'absolute' },
});
