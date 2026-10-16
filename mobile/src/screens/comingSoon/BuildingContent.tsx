import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import IconBuildingBookArt from '../home/map2/art/IconBuildingBookArt';
import { FIGMA_W, FONTS } from '../home/map2/map2Theme';

// Figma 1151:9846's centre: the book and "BUILDING YOUR EXERCISES ....".
export default function BuildingContent() {
  const { width } = useWindowDimensions();
  const s = width / FIGMA_W;
  return (
    <View style={styles.body}>
      <IconBuildingBookArt width={69 * s} />
      <Text style={[styles.text, { fontSize: 20 * s, width: 330 * s, marginTop: 20 * s }]}>Building your exercises ....</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: FONTS.caption, color: '#5A5D68', textAlign: 'center', textTransform: 'uppercase' },
});
