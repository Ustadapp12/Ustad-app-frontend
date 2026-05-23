import React, { useEffect, useRef } from 'react';
import { Image, Animated, StyleSheet, ImageStyle, StyleProp } from 'react-native';

const mascotSource = require('../../../assets/images/mascot.png');

interface Props {
  size?: number;
  bounce?: boolean;
  style?: StyleProp<ImageStyle>;
}

export function Mascot({ size = 120, bounce = false, style }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!bounce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: -10,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounce, anim]);

  return (
    <Animated.Image
      source={mascotSource}
      style={[
        styles.img,
        { width: size, height: size, transform: [{ translateY: anim }] },
        style,
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  img: {},
});
