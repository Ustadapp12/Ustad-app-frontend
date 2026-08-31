import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { STREAK_FROZEN_COLOR, STREAK_FROZEN_ICON } from '../../utils/streak';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp, RootStackParamList } from '../../navigation/types';
import type { RouteProp } from '@react-navigation/native';

interface Props {
  navigation: RootNavProp;
  route: RouteProp<RootStackParamList, 'StreakRepairProgress'>;
}

function Snowflake({ left, top, delay, size }: { left: number; top: number; delay: number; size: number }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 2200, delay, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.Text
      style={[
        styles.snowflake,
        {
          left, top, fontSize: size,
          opacity: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] }),
          transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }],
        },
      ]}
    >
      ❄️
    </Animated.Text>
  );
}

// ── Mid repair progress — a level completed while frozen that didn't finish
// the repair yet. Deliberately its own screen (not a badge bolted onto
// LessonSummaryScreen) and laid out exactly like StreakCelebrationScreen's
// fire moment: same gradient, same hero slot/size, same number+label
// position, same button. Ice standing in for fire in that same spot, with
// falling snowflakes around it, is the whole visual idea — nothing about
// the layout changes between the two states, only what's in the hero. ──
export default function StreakRepairProgressScreen({ navigation, route }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const { repairLevelsCompleted, repairLevelsRequired } = route.params;
  const remaining = Math.max(repairLevelsRequired - repairLevelsCompleted, 1);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const iceScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.spring(iceScale, { toValue: 1, useNativeDriver: true, tension: 90, friction: 7, delay: 150 }),
    ]).start();
  }, []);

  // paddingBottom, not a shorter gradient — see StreakCelebrationScreen's
  // identical comment: padding is inside the border box, so the gradient
  // still bleeds to the true edge and only the centered content lifts.
  return (
    <LinearGradient colors={['#0D3B26', '#1A5C3A', '#0D2B1C']} style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={{ paddingTop: insets.top + 10 }} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Same footprint as StreakCelebrationScreen's fire Lottie. */}
        <View style={styles.animation}>
          <Snowflake left={18} top={30} delay={0} size={20} />
          <Snowflake left={70} top={70} delay={500} size={16} />
          <Snowflake left={230} top={40} delay={900} size={18} />
          <Snowflake left={270} top={110} delay={300} size={14} />
          <Snowflake left={40} top={160} delay={700} size={16} />
          <Snowflake left={250} top={190} delay={1100} size={20} />
          <Animated.Image
            source={STREAK_FROZEN_ICON}
            resizeMode="contain"
            style={[styles.iceImg, { transform: [{ scale: iceScale }] }]}
          />
        </View>

        <Text style={[styles.streakNumber, { color: STREAK_FROZEN_COLOR }]}>
          {repairLevelsCompleted}/{repairLevelsRequired}
        </Text>
        <Text style={styles.streakLabel}>levels done today</Text>
        <Text style={styles.hint}>
          Finish {remaining} more level{remaining === 1 ? '' : 's'} today to keep your streak.
        </Text>

        <TouchableOpacity style={styles.continueBtn} onPress={() => navigation.navigate('MainTabs')}>
          <Text style={styles.continueBtnText}>Continue  →</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:        { alignItems: 'center', paddingHorizontal: 28, width: '100%' },
  animation:      { width: '100%', height: 340, marginBottom: -10, alignItems: 'center', justifyContent: 'center' },
  snowflake:      { position: 'absolute' },
  iceImg:         { width: 128, height: 128 },
  streakNumber:   { fontFamily: 'Nunito_700Bold', fontSize: 72, lineHeight: 78 },
  streakLabel:    { fontFamily: 'Nunito_700Bold', fontSize: 22, color: 'white', marginBottom: 14 },
  hint:           { fontFamily: 'Nunito_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 28, paddingHorizontal: 12 },
  continueBtn:    { width: '100%', backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 17, alignItems: 'center', marginBottom: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  continueBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: 'white' },
});
