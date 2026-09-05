import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import LottieView from 'lottie-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { addPendingGuestProgress, isGuest } from '../../utils/guest';
import { playFeedbackSound } from '../../services/audioPlayer';
import { STREAK_FROZEN_COLOR, STREAK_FROZEN_ICON } from '../../utils/streak';
import MascotShadow from '../../components/MascotShadow';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';

interface Props {
  navigation: RootNavProp;
  route: {
    params: {
      xp: number; scorePct: number; stars: number;
      durationSec?: number;
      streakIncremented?: boolean; currentStreak?: number;
      // True only on the exact completion that unfreezes a frozen streak
      // (2nd distinct level, same local day) — a different moment from the
      // routine streakIncremented, which is also true on this completion.
      // See src/utils/streak.ts.
      streakRepaired?: boolean;
      // Present when this completion made repair progress but didn't finish
      // it (streakState still 'frozen') — drives the "1 of 2 done" badge,
      // a distinct moment from streakRepaired above.
      streakState?: 'active' | 'frozen' | 'none';
      repairLevelsCompleted?: number;
      repairLevelsRequired?: number;
    };
  };
}

// "45s" under a minute, "1:23" at or past it — matches how most timers read
// once a lesson runs long enough to cross the minute mark.
function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
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
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const {
    xp, scorePct, stars, durationSec, streakIncremented, currentStreak, streakRepaired,
    streakState, repairLevelsCompleted, repairLevelsRequired,
  } = route.params;
  // Made progress toward repair (frozen, level counted) but hasn't finished
  // it yet — streakRepaired below covers the completion that DOES finish it,
  // this covers the one(s) before that.
  const showRepairProgress = !streakRepaired && streakState === 'frozen'
    && (repairLevelsCompleted ?? 0) > 0 && (repairLevelsCompleted ?? 0) < (repairLevelsRequired ?? 0);

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
    // Ding in sync with the badge starting to fill, not the entrance fade.
    const xpSfxTimer = xp > 0 ? setTimeout(() => playFeedbackSound(true), 500) : null;
    return () => {
      entrance.stop();
      countUp.stop();
      xpCountAnim.removeAllListeners();
      if (xpSfxTimer) clearTimeout(xpSfxTimer);
    };
  }, []);

  // A guest was shown this XP but the server never banked it (see
  // utils/guest.ts). Park it locally so claiming the account can hand it back;
  // declining the prompt clears it and the XP is genuinely forfeited.
  // Latched, because addPendingGuestProgress accumulates: a re-run would credit
  // the same level's XP twice over.
  const isGuestUser = isGuest(useAuthStore(s => s.user));
  const bankedRef = useRef(false);
  useEffect(() => {
    if (!isGuestUser || bankedRef.current) return;
    bankedRef.current = true;
    void addPendingGuestProgress(xp);
  }, [isGuestUser, xp, currentStreak]);

  const grade = scorePct >= 90 ? 'Excellent!' : scorePct >= 70 ? 'Great job!' : scorePct >= 50 ? 'Good effort!' : 'Keep practicing!';
  const gradeColor = scorePct >= 90 ? colors.gold : scorePct >= 70 ? colors.primary : scorePct >= 50 ? colors.blue : colors.mutedText;

  // Background split from content — see StreakCelebrationScreen's identical
  // comment: a full-bleed LinearGradient sibling (no insets dependency)
  // guarantees the screen's own color always reaches the true edge, instead
  // of a possibly-stale insets.bottom (0 on this screen's very first render,
  // a known React Navigation timing gap on a freshly-pushed 'fade' screen)
  // leaving a gap that exposed the Stack.Navigator's own fallback color.
  return (
    <View style={{ flex: 1 }}>
    <LinearGradient colors={['#0D3B26', '#1A5C3A', '#0D2B1C']} style={StyleSheet.absoluteFill} />
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
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

        {/* Grade */}
        <Text style={[styles.grade, { color: gradeColor }]}>{grade}</Text>

        {/* Distinct from the routine streakIncremented case below — this is
            the exact completion that unfroze a frozen streak (2nd distinct
            level, same day), and deserves its own moment rather than being
            folded into the ordinary streak bump. Continue still proceeds
            into StreakCelebration as normal (streakIncremented is also true
            here), now showing the restored, active-colored number. */}
        {streakRepaired && (
          <View style={[styles.streakSavedBadge, styles.streakSavedBadgeRow]}>
            <Image source={STREAK_FROZEN_ICON} style={styles.streakSavedBadgeIcon} resizeMode="contain" />
            <Text style={styles.streakSavedBadgeText}>Streak saved!</Text>
          </View>
        )}

        {/* Congratulating Lumo — static image, not a second Lottie */}
        <View style={{ width: 84, height: 84, marginBottom: 12 }}>
          <Animated.Image
            source={require('../../../assets/images/lumo_xp.png')}
            style={[styles.lumaImg, { marginBottom: 0, transform: [{ scale: lumaScaleAnim }] }]}
            resizeMode="contain"
          />
          <MascotShadow width={84} />
        </View>

        {/* Stats row — time (left) / XP / accuracy (right), same gold-bordered
            box style throughout. Time box omitted when durationSec wasn't
            tracked (the placement-assessment completion path). */}
        <View style={styles.statsRow}>
          {durationSec != null && (
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{formatDuration(durationSec)}</Text>
              <Text style={styles.statLabel}>TIME</Text>
            </View>
          )}
          <View style={styles.statBox}>
            <Text style={styles.statValue}>+{displayedXp}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{scorePct}%</Text>
            <Text style={styles.statLabel}>ACCURACY</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => {
            if (streakIncremented) {
              // replace, not navigate — the celebration screen's own
              // continue button lands on MainTabs, never back here.
              navigation.replace('StreakCelebration', { currentStreak: currentStreak ?? 0, streakRepaired });
            } else if (showRepairProgress) {
              navigation.replace('StreakRepairProgress', {
                repairLevelsCompleted: repairLevelsCompleted ?? 0,
                repairLevelsRequired: repairLevelsRequired ?? 0,
              });
            } else {
              navigation.navigate('MainTabs');
            }
          }}
        >
          <Text style={styles.continueBtnText}>Continue  →</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { alignItems: 'center', paddingHorizontal: 28, width: '100%' },
  medal:        { width: '100%', aspectRatio: 300 / 180, marginBottom: -10 },
  starsRow:     { flexDirection: 'row', gap: 12, marginBottom: 16 },
  star:         { fontSize: 52 },
  grade:        { fontFamily: 'Nunito_700Bold', fontSize: 30, marginBottom: 14 },
  streakSavedBadge: {
    backgroundColor: 'rgba(0,0,0,0.40)', borderRadius: 20, borderWidth: 2, borderColor: STREAK_FROZEN_COLOR,
    paddingHorizontal: 18, paddingVertical: 8, marginBottom: 14, maxWidth: '100%',
  },
  streakSavedBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  streakSavedBadgeIcon: { width: 18, height: 18 },
  streakSavedBadgeText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: STREAK_FROZEN_COLOR, textAlign: 'center' },
  lumaImg:      { width: 84, height: 84, marginBottom: 12 },
  statsRow:     { flexDirection: 'row', width: '100%', gap: 10, marginBottom: 14 },
  statBox:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.40)',
                  borderRadius: 16, borderWidth: 2, borderColor: colors.gold, paddingVertical: 12, paddingHorizontal: 4 },
  statValue:    { fontFamily: 'Nunito_700Bold', fontSize: 22, color: colors.gold, lineHeight: 26 },
  statLabel:    { fontFamily: 'Nunito_700Bold', fontSize: 10.5, color: colors.gold, letterSpacing: 0.5, marginTop: 3, opacity: 0.85 },
  continueBtn:  { width: '100%', backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 17, alignItems: 'center', marginBottom: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  continueBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: 'white' },
});
