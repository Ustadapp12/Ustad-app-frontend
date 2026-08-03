import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import AuthRequiredModal from '../../components/AuthRequiredModal';
import { clearPendingGuestProgress, isGuest, setUpgradePrompted, wasUpgradePrompted } from '../../utils/guest';
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
  const insets = useSafeAreaInsets();
  const { currentStreak } = route.params;
  const animationSource = animationFor(currentStreak);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayedStreak, setDisplayedStreak] = useState(0);

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]);
    entrance.start();
    countAnim.addListener(({ value }) => setDisplayedStreak(Math.round(value)));
    const countUp = Animated.timing(countAnim, { toValue: currentStreak, duration: 1000, delay: 500, useNativeDriver: false });
    countUp.start();
    return () => {
      entrance.stop();
      countUp.stop();
      countAnim.removeAllListeners();
    };
  }, []);

  // The conversion moment, ported from the old StreakScreen's justIncremented
  // path: a guest's streak is computed by the server but never banked (see
  // utils/guest.ts), so this is the one place to ask before it's gone. Only
  // once ever — nagging after every level would sour the thing it's selling.
  const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);
  const guest = isGuest(useAuthStore(s => s.user));
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!guest) return;
    void (async () => {
      if (await wasUpgradePrompted()) return;
      promptTimerRef.current = setTimeout(() => setUpgradePromptVisible(true), 2200);
    })();
    return () => { if (promptTimerRef.current) clearTimeout(promptTimerRef.current); };
  }, [guest]);

  async function handleCreateAccount() {
    await setUpgradePrompted();
    setUpgradePromptVisible(false);
    navigation.replace('SignUp');
  }

  async function handleDeclineUpgrade() {
    await setUpgradePrompted();
    await clearPendingGuestProgress();
    setUpgradePromptVisible(false);
    navigation.navigate('MainTabs');
  }

  return (
    <LinearGradient colors={['#0D3B26', '#1A5C3A', '#0D2B1C']} style={styles.container}>
      <View style={{ paddingTop: insets.top + 10 }} />

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

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <Text style={styles.continueBtnText}>Continue  →</Text>
        </TouchableOpacity>
      </Animated.View>

      <AuthRequiredModal
        visible={upgradePromptVisible}
        title="Save your streak"
        body={`Your ${currentStreak}-day streak and the XP you just earned aren't saved yet. Create a free account to keep them — otherwise they'll be gone.`}
        ctaLabel="Create account"
        dismissLabel="Skip"
        onContinue={() => void handleCreateAccount()}
        onDismiss={() => void handleDeclineUpgrade()}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:        { alignItems: 'center', paddingHorizontal: 28, width: '100%' },
  animation:      { width: '100%', height: 340, marginBottom: -10 },
  streakNumber:   { fontFamily: 'Nunito_700Bold', fontSize: 72, color: '#EA580C', lineHeight: 78 },
  streakLabel:    { fontFamily: 'Nunito_700Bold', fontSize: 22, color: 'white', marginBottom: 28 },
  continueBtn:    { width: '100%', backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 17, alignItems: 'center', marginBottom: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  continueBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: 'white' },
});
