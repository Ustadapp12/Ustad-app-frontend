import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import LottieView from 'lottie-react-native';
import { colors } from '../../../theme';
import { ANIMATIONS, MASCOT } from '../../../assets';

// ── Recitation Scoring Feedback ───────────────────────────────────
// During recitation scoring, show Lumo mascot + rotating hourglass + text
export function RecitationScoringFeedback() {
  const lottieRef = useRef<LottieView>(null);
  useEffect(() => {
    // autoPlay can silently fail to kick in for a LottieView mounted inside
    // a conditional branch during a batched re-render (this one appears
    // exactly when speakState flips to 'scoring') — explicitly start
    // playback too rather than relying on autoPlay alone.
    lottieRef.current?.play();
  }, []);
  return (
    <View style={RSF.container}>
      <View style={RSF.mascotBox}>
        <Image
          source={MASCOT.lumoKufi}
          style={RSF.lumo}
          resizeMode="contain"
        />
      </View>
      <LottieView
        ref={lottieRef}
        source={ANIMATIONS.loading}
        autoPlay
        loop
        style={RSF.hourglass}
      />
      <Text style={RSF.text}>Scoring your recitation please</Text>
    </View>
  );
}

export const RSF = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16, marginBottom: 16 },
  lumo: { width: 90, height: 90 },
  hourglass: { width: 70, height: 70 },
  text: { fontFamily: 'Nunito-Bold', fontSize: 12, color: colors.mutedText, marginTop: 4 },
  mascotBox: { width: 90, height: 90 },
});
