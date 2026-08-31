import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import LottieView from 'lottie-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import MascotShadow from '../../components/MascotShadow';
import { isGuest } from '../../utils/guest';
import { STREAK_FROZEN_ICON, STREAK_FROZEN_COLOR } from '../../utils/streak';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp, RootStackParamList } from '../../navigation/types';
import type { RouteProp } from '@react-navigation/native';

interface Props {
  navigation: RootNavProp;
  route: RouteProp<RootStackParamList, 'StreakCelebration'>;
}

// Which Lottie plays is purely a function of the new streak total: day 1 ever
// gets its own art, every multiple of 7 (7/14/21/...) gets the weekly one,
// everything else gets the plain daily loop.
function animationFor(streak: number) {
  if (streak === 1) return require('../../../assets/animations/1day.json');
  if (streak > 0 && streak % 7 === 0) return require('../../../assets/animations/7thday.json');
  return require('../../../assets/animations/allday.json');
}

// ── Post-lesson streak celebration — replaces the old jump into the full
// Streak stats page right after a level. Same shape as LessonSummaryScreen's
// XP celebration: one big looping Lottie with the count-up number under it,
// nothing else competing for attention. The stats page (day grid, milestones)
// is still reachable from the map HUD pill / profile menu — this screen is
// only the celebration moment. ────────────────────────────────────────────
export default function StreakCelebrationScreen({ navigation, route }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const { currentStreak, streakRepaired } = route.params;
  const guest = isGuest(useAuthStore(s => s.user));
  // Guests never actually bank a streak (see utils/guest.ts) — the backend
  // still reports a computed currentStreak so this screen has something to
  // animate, but showing that number here would be showing a lie (it always
  // reports "1", every single level, since nothing is ever persisted to
  // compare against). Pin the displayed value at 0 instead; the real pitch
  // to fix that lives on GuestStreakPitchScreen, right after this one.
  const displayStreak = guest ? 0 : currentStreak;
  const animationSource = animationFor(displayStreak);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayedStreak, setDisplayedStreak] = useState(0);

  // Repaired streaks get a short "ice breaks, fire resumes" beat before the
  // normal celebration content mounts. No ice/freeze Lottie asset exists
  // (STREAK_FROZEN_ICON is a static image — see utils/streak.ts), so this is
  // built from Animated: the ice icon shakes then pops/fades, and the usual
  // fire Lottie fades in right after.
  const [breakDone, setBreakDone] = useState(!streakRepaired);
  const iceShake = useRef(new Animated.Value(0)).current;
  const iceScale = useRef(new Animated.Value(1)).current;
  const iceOpacity = useRef(new Animated.Value(1)).current;
  // A soft blue flash that blooms outward (scales up, flashes bright then
  // fades) right as the ice lets go — reads as the freeze breaking apart in
  // a burst of cold light rather than just an icon fading out. Purely
  // Animated (no ice/freeze Lottie asset exists — see utils/streak.ts).
  const bloomScale = useRef(new Animated.Value(0.3)).current;
  const bloomOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!streakRepaired) return;
    const seq = Animated.sequence([
      Animated.timing(iceShake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(iceShake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(iceShake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(iceShake, { toValue: 0, duration: 60, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(iceScale, { toValue: 1.5, duration: 260, useNativeDriver: true }),
        Animated.timing(iceOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(bloomScale, { toValue: 2.6, duration: 420, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(bloomOpacity, { toValue: 0.65, duration: 120, useNativeDriver: true }),
          Animated.timing(bloomOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]),
    ]);
    seq.start(() => setBreakDone(true));
    return () => seq.stop();
  }, []);

  useEffect(() => {
    if (!breakDone) return;
    const entrance = Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]);
    entrance.start();
    countAnim.addListener(({ value }) => setDisplayedStreak(Math.round(value)));
    const countUp = Animated.timing(countAnim, { toValue: displayStreak, duration: 1000, delay: 500, useNativeDriver: false });
    countUp.start();
    return () => {
      entrance.stop();
      countUp.stop();
      countAnim.removeAllListeners();
    };
  }, [breakDone]);

  return (
    <LinearGradient colors={['#0D3B26', '#1A5C3A', '#0D2B1C']} style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={{ paddingTop: insets.top + 10 }} />

      {!breakDone && (
        <View style={styles.content}>
          <View style={styles.iceStage}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.bloom,
                { opacity: bloomOpacity, transform: [{ scale: bloomScale }] },
              ]}
            />
            <Animated.Image
              source={STREAK_FROZEN_ICON}
              resizeMode="contain"
              style={[
                styles.iceImg,
                {
                  opacity: iceOpacity,
                  transform: [
                    { translateX: iceShake.interpolate({ inputRange: [-1, 1], outputRange: [-14, 14] }) },
                    { scale: iceScale },
                  ],
                },
              ]}
            />
          </View>
        </View>
      )}

      {breakDone && (
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LottieView
            renderMode="SOFTWARE"
            source={animationSource}
            autoPlay
            loop
            resizeMode="contain"
            style={styles.animation}
          />

          <Text style={styles.streakNumber}>{displayedStreak}</Text>
          <Text style={styles.streakLabel}>day streak!</Text>

          {streakRepaired && (
            <View style={styles.repairedRow}>
              <View style={{ width: 56, height: 56, marginRight: 10 }}>
                <Image
                  source={require('../../../assets/images/lumo_xp.png')}
                  style={styles.repairedLuma}
                  resizeMode="contain"
                />
                <MascotShadow width={56} />
              </View>
              <View style={styles.repairedBubble}>
                <Text style={styles.repairedBubbleText}>You saved your streak! 🎉</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => navigation.navigate(guest ? 'GuestStreakPitch' : 'MainTabs')}
          >
            <Text style={styles.continueBtnText}>Continue  →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:        { alignItems: 'center', paddingHorizontal: 28, width: '100%' },
  animation:      { width: '100%', height: 340, marginBottom: -10 },
  streakNumber:   { fontFamily: 'Nunito_700Bold', fontSize: 72, color: '#EA580C', lineHeight: 78 },
  streakLabel:    { fontFamily: 'Nunito_700Bold', fontSize: 22, color: 'white', marginBottom: 28 },
  iceStage:       { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  bloom:          { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: STREAK_FROZEN_COLOR },
  iceImg:         { width: 96, height: 96 },
  repairedRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.30)', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 24, maxWidth: '100%' },
  repairedLuma:   { width: 56, height: 56 },
  repairedBubble: { flexShrink: 1 },
  repairedBubbleText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: 'white', lineHeight: 19 },
  continueBtn:    { width: '100%', backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 17, alignItems: 'center', marginBottom: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  continueBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: 'white' },
});
