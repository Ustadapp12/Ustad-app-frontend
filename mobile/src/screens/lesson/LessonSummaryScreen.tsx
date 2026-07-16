import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import type { RootNavProp } from '../../navigation/types';

interface Props {
  navigation: RootNavProp;
  route: {
    params: {
      xp: number; scorePct: number; stars: number;
      streakIncremented?: boolean; currentStreak?: number;
    };
  };
}

function Star({ filled, delay }: { filled: boolean; delay: number }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 6 }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);
  return (
    <Animated.Text style={[styles.star, { transform: [{ scale: scaleAnim }] }, !filled && { opacity: 0.25 }]}>
      ⭐
    </Animated.Text>
  );
}

// ── Summary screen — single layout, no tap-through ────────────────
// One screen: a big, continuously-looping medal Lottie plus the
// stars/grade/XP UI all at once. Lumo stays stationary (only a one-time
// entrance scale-in, no idle float loop) — the float loop was previously
// the concurrent animation competing with the Lottie for JS/UI thread
// time, so dropping it (rather than splitting into two screens) is how
// this avoids the earlier full-screen-Lottie perf problem.
export default function LessonSummaryScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { xp, scorePct, stars, streakIncremented, currentStreak } = route.params;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const lumaScaleAnim = useRef(new Animated.Value(0)).current;
  const xpCountAnim = useRef(new Animated.Value(0)).current;
  const [displayedXp, setDisplayedXp] = useState(0);

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.spring(lumaScaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6, delay: 200 }),
    ]);
    entrance.start();
    xpCountAnim.addListener(({ value }) => setDisplayedXp(Math.round(value)));
    const countUp = Animated.timing(xpCountAnim, { toValue: xp, duration: 1000, delay: 500, useNativeDriver: false });
    countUp.start();
    return () => {
      entrance.stop();
      countUp.stop();
      xpCountAnim.removeAllListeners();
    };
  }, []);

  const grade = scorePct >= 90 ? 'Excellent!' : scorePct >= 70 ? 'Great job!' : scorePct >= 50 ? 'Good effort!' : 'Keep practicing!';
  const gradeColor = scorePct >= 90 ? colors.gold : scorePct >= 70 ? colors.primary : scorePct >= 50 ? colors.blue : colors.mutedText;

  return (
    <LinearGradient colors={['#0D3B26', '#1A5C3A', '#0D2B1C']} style={styles.container}>
      <View style={{ paddingTop: insets.top + 10 }} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Medal animation — big and continuously looping. */}
        <LottieView
          renderMode="SOFTWARE"
          source={require('../../../assets/animations/congrats.json')}
          autoPlay
          loop
          resizeMode="contain"
          style={styles.medal}
        />

        {/* Stars row */}
        <View style={styles.starsRow}>
          <Star filled={stars >= 1} delay={300} />
          <Star filled={stars >= 2} delay={500} />
          <Star filled={stars >= 3} delay={700} />
        </View>

        {/* Grade + percentage */}
        <Text style={[styles.grade, { color: gradeColor }]}>{grade}</Text>
        <Text style={styles.scorePct}>{scorePct}% accuracy</Text>

        {/* Congratulating Lumo — static image, not a second Lottie */}
        <Animated.Image
          source={require('../../../assets/images/lumo_xp.png')}
          style={[styles.lumaImg, { transform: [{ scale: lumaScaleAnim }] }]}
          resizeMode="contain"
        />

        {/* XP — gold-bordered badge */}
        <View style={styles.xpBadge}>
          <Text style={styles.xpPlus}>+</Text>
          <Text style={styles.xpNumber}>{displayedXp}</Text>
          <Text style={styles.xpLabel}> XP</Text>
        </View>

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => {
            if (streakIncremented) {
              // replace, not navigate — Streak's own close button goBack()s,
              // and it shouldn't be able to land back on this congrats screen.
              navigation.replace('Streak', { justIncremented: true, currentStreak });
            } else {
              navigation.navigate('MainTabs');
            }
          }}
        >
          <Text style={styles.continueBtnText}>Continue  →</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { alignItems: 'center', paddingHorizontal: 28, width: '100%' },
  medal:        { width: '100%', aspectRatio: 300 / 180, marginBottom: -10 },
  starsRow:     { flexDirection: 'row', gap: 12, marginBottom: 16 },
  star:         { fontSize: 52 },
  grade:        { fontFamily: 'Nunito_700Bold', fontSize: 30, marginBottom: 4 },
  scorePct:     { fontFamily: 'Nunito_700Bold', fontSize: 16, color: 'rgba(255,255,255,0.65)', marginBottom: 14 },
  lumaImg:      { width: 84, height: 84, marginBottom: 12 },
  xpBadge:      { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: 'rgba(0,0,0,0.40)', borderRadius: 20,
                  paddingHorizontal: 22, paddingVertical: 10, borderWidth: 2, borderColor: colors.gold, marginBottom: 14 },
  xpPlus:       { fontFamily: 'Nunito_700Bold', fontSize: 22, color: colors.gold, marginBottom: 2 },
  xpNumber:     { fontFamily: 'Nunito_700Bold', fontSize: 36, color: colors.gold, lineHeight: 40 },
  xpLabel:      { fontFamily: 'Nunito_700Bold', fontSize: 20, color: colors.gold, marginBottom: 2 },
  continueBtn:  { width: '100%', backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 17, alignItems: 'center', marginBottom: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  continueBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: 'white' },
});
