import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import type { RootNavProp } from '../../navigation/types';

interface Props {
  navigation: RootNavProp;
  route: { params: { xp: number; scorePct: number; stars: number; heartsRemaining?: number } };
}

function Star({ filled, delay }: { filled: boolean; delay: number }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    setTimeout(() => {
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 6 }).start();
    }, delay);
  }, []);
  return (
    <Animated.Text style={[styles.star, { transform: [{ scale: scaleAnim }] }, !filled && { opacity: 0.25 }]}>
      ⭐
    </Animated.Text>
  );
}

// ── XP Celebration phase ──────────────────────────────────────────
function XPCelebration({ xp, onDone }: { xp: number; onDone: () => void }) {
  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const floatAnim  = useRef(new Animated.Value(0)).current;
  const xpCountAnim = useRef(new Animated.Value(0)).current;
  const [displayedXp, setDisplayedXp] = useState(0);

  useEffect(() => {
    // Lumo bounces in
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6, delay: 200 }).start();
    // Float loop
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 1100, useNativeDriver: true }),
    ])).start();
    // XP count-up
    xpCountAnim.addListener(({ value }) => setDisplayedXp(Math.round(value)));
    Animated.timing(xpCountAnim, { toValue: xp, duration: 1000, delay: 900, useNativeDriver: false }).start();
    return () => xpCountAnim.removeAllListeners();
  }, []);

  const lumaY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Full-screen looping background animations */}
      <LottieView
        source={require('../../../assets/animations/congrats.json')}
        autoPlay loop
        style={StyleSheet.absoluteFill}
      />
      <LottieView
        source={require('../../../assets/animations/celebration.json')}
        autoPlay loop
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />

      {/* Lumo — pinned to upper portion of screen, large */}
      <View style={xp_styles.lumoZone} pointerEvents="none">
        <Animated.Image
          source={require('../../../assets/images/lumo_xp.png')}
          style={[xp_styles.lumo, { transform: [{ scale: scaleAnim }, { translateY: lumaY }] }]}
          resizeMode="contain"
        />
      </View>

      {/* Title + XP badge + sub-text + button — pinned to bottom, never overlaps Lumo */}
      <View style={xp_styles.bottomZone}>
        <Text style={xp_styles.title}>Level Complete!</Text>
        <View style={xp_styles.xpBadge}>
          <Text style={xp_styles.xpPlus}>+</Text>
          <Text style={xp_styles.xpNumber}>{displayedXp}</Text>
          <Text style={xp_styles.xpLabel}> XP</Text>
        </View>
        <Text style={xp_styles.sub}>Keep going — you're on a roll!</Text>
        <TouchableOpacity style={xp_styles.btn} onPress={onDone} activeOpacity={0.85}>
          <Text style={xp_styles.btnText}>Awesome  →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const xp_styles = StyleSheet.create({
  // Lumo occupies the top ~45% of the screen
  lumoZone: {
    position: 'absolute', top: '8%', left: 0, right: 0,
    alignItems: 'center',
  },
  lumo: { width: 180, height: 180 },
  // All text + button pinned to bottom — starts below the 50% mark
  bottomZone: {
    position: 'absolute', bottom: 52, left: 28, right: 28,
    alignItems: 'center', gap: 14,
  },
  title:   { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: 'white',
             textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  xpBadge: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: 'rgba(0,0,0,0.40)', borderRadius: 20,
             paddingHorizontal: 26, paddingVertical: 12,
             borderWidth: 2, borderColor: colors.gold },
  xpPlus:  { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: colors.gold, marginBottom: 2 },
  xpNumber:{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 44, color: colors.gold, lineHeight: 48 },
  xpLabel: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, color: colors.gold, marginBottom: 3 },
  sub:     { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  btn:     { width: '100%', backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 17,
             alignItems: 'center',
             shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 8 },
  btnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 17, color: 'white' },
});

// ── Summary screen ────────────────────────────────────────────────
export default function LessonSummaryScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { xp, scorePct, stars, heartsRemaining = 5 } = route.params;
  const [phase, setPhase] = useState<'celebrate' | 'summary'>('celebrate');

  const floatAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (phase === 'summary') {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]).start();
      Animated.loop(Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])).start();
    }
  }, [phase]);

  const lumaY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const grade = scorePct >= 90 ? 'Excellent!' : scorePct >= 70 ? 'Great job!' : scorePct >= 50 ? 'Good effort!' : 'Keep practicing!';
  const gradeColor = scorePct >= 90 ? colors.gold : scorePct >= 70 ? colors.primary : scorePct >= 50 ? colors.blue : colors.mutedText;

  return (
    <LinearGradient colors={['#0D3B26', '#1A5C3A', '#0D2B1C']} style={styles.container}>
      <View style={{ paddingTop: insets.top + 10 }} />

      {/* Phase 1: XP celebration overlay */}
      {phase === 'celebrate' && (
        <XPCelebration xp={xp} onDone={() => setPhase('summary')} />
      )}

      {/* Phase 2: Summary */}
      {phase === 'summary' && (
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Stars row */}
          <View style={styles.starsRow}>
            <Star filled={stars >= 1} delay={300} />
            <Star filled={stars >= 2} delay={500} />
            <Star filled={stars >= 3} delay={700} />
          </View>

          {/* Grade */}
          <Text style={[styles.grade, { color: gradeColor }]}>{grade}</Text>
          <Text style={styles.scorePct}>{scorePct}% accuracy</Text>

          {/* Lumo / success animation */}
          {stars === 3 ? (
            <LottieView
              source={require('../../../assets/animations/success.json')}
              autoPlay
              loop={false}
              style={styles.lumaImg}
            />
          ) : (
            <Animated.Image
              source={require('../../../assets/images/lumo_transparent.png')}
              style={[styles.lumaImg, { transform: [{ translateY: lumaY }] }]}
              resizeMode="contain"
            />
          )}

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Image source={require('../../../assets/images/lumo_xp.png')} style={{ width: 28, height: 28 }} resizeMode="contain" />
              <Text style={styles.statVal}>+{xp}</Text>
              <Text style={styles.statLbl}>XP Earned</Text>
            </View>
            <View style={[styles.statCell, styles.statBorder]}>
              <Text style={styles.statEmoji}>❤️</Text>
              <Text style={styles.statVal}>{heartsRemaining}</Text>
              <Text style={styles.statLbl}>Hearts Left</Text>
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.continueBtnText}>Continue  →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.reviewBtnText}>Review Lesson</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { alignItems: 'center', paddingHorizontal: 28, width: '100%' },
  starsRow:     { flexDirection: 'row', gap: 12, marginBottom: 16 },
  star:         { fontSize: 52 },
  grade:        { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 32, marginBottom: 4 },
  scorePct:     { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, color: 'rgba(255,255,255,0.65)', marginBottom: 16 },
  lumaImg:      { width: 110, height: 110, marginBottom: 16 },
  statsGrid:    { flexDirection: 'row', width: '100%', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 24, overflow: 'hidden' },
  statCell:     { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statBorder:   { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.12)' },
  statEmoji:    { fontSize: 22 },
  statVal:      { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 20, color: 'white' },
  statLbl:      { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.55)' },
  continueBtn:  { width: '100%', backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 17, alignItems: 'center', marginBottom: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  continueBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 17, color: 'white' },
  reviewBtn:    { width: '100%', borderRadius: 18, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)' },
  reviewBtnText:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: 'rgba(255,255,255,0.75)' },
});
