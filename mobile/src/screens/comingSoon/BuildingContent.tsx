import React, { useRef } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { FIGMA_W, FONTS } from '../home/map2/map2Theme';
import { useLottieWhileVisible } from '../../hooks/useScreenVisible';
import { ANIMATIONS } from '../../assets';

// Figma 1151:9846's centre: the book and "BUILDING YOUR EXERCISES ....". The
// static book icon was swapped for a looping pen-writing-on-a-book animation
// (user-supplied, 2026-10-20) wherever this "being built" placeholder shows.
export default function BuildingContent({ label = 'Building your exercises ....' }: { label?: string }) {
  const { width } = useWindowDimensions();
  const s = width / FIGMA_W;
  // Paused whenever this page isn't on screen (2026-10-22 audit).
  const bookRef = useRef<LottieView>(null);
  useLottieWhileVisible(bookRef);
  return (
    <View style={styles.body}>
      <LottieView
        ref={bookRef}
        source={ANIMATIONS.writingOnBook}
        autoPlay loop
        style={{ width: 140 * s, height: 140 * s }}
      />
      <Text style={[styles.text, { fontSize: 20 * s, width: 330 * s, marginTop: 20 * s }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: FONTS.caption, color: '#5A5D68', textAlign: 'center', textTransform: 'uppercase' },
});
