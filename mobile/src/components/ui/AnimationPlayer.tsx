import LottieView, { AnimationObject } from 'lottie-react-native';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  source: string | AnimationObject | { uri: string };
  size?: number;
  loop?: boolean;
  autoPlay?: boolean;
  style?: object;
};

export default function AnimationPlayer({
  source,
  size = 200,
  loop = false,
  autoPlay = true,
  style,
}: Props) {
  const ref = useRef<LottieView>(null);

  return (
    <View style={[styles.container, style]}>
      <LottieView
        ref={ref}
        source={source}
        autoPlay={autoPlay}
        loop={loop}
        style={{ width: size, height: size }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
