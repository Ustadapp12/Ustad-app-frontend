import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Image } from 'react-native';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import AuthRequiredModal from '../../components/AuthRequiredModal';
import MascotShadow from '../../components/MascotShadow';
import {
  clearPendingGuestProgress, isGuest, setUpgradePrompted, wasUpgradePrompted,
} from '../../utils/guest';
import { colors } from '../../theme/colors';
import {
  isStreakFrozen, streakColor, freezeDaysLabel, repairProgressLabel,
  STREAK_ACTIVE_COLOR, STREAK_FROZEN_COLOR, STREAK_FROZEN_ICON,
} from '../../utils/streak';
import type { RootNavProp, RootStackParamList } from '../../navigation/types';

interface Props {
  navigation: RootNavProp;
  route: RouteProp<RootStackParamList, 'Streak'>;
}

export default function StreakScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { learning, user } = useAuthStore();
  const streak = route.params?.currentStreak ?? learning?.current_streak ?? 0;
  const justIncremented = route.params?.justIncremented ?? false;
  // Read live, not from route params — unlike the streak number itself
  // (frozen at navigation time via currentStreak), streak_state can flip
  // from frozen to none purely from time passing while this screen sits
  // open (see App.tsx's foreground/poll refresh of `learning`). A missing
  // value (stale cache, field not deployed yet) is treated as "active" —
  // the same default the field's own type comment documents.
  const frozen = isStreakFrozen(learning?.streak_state);
  const freezeDaysRemaining = learning?.freeze_days_remaining ?? 0;
  const repairRequired = learning?.repair_levels_required ?? 0;
  const repairCompleted = learning?.repair_levels_completed ?? 0;

  // The conversion moment. A guest has just watched a streak land that the
  // server deliberately didn't keep — so ask for the account here, while the
  // thing they'd lose is on screen, rather than at some abstract later point.
  // Only after a genuine increment, and only once ever: asking again after
  // every level would cheapen it.
  const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);
  const guest = isGuest(user);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!guest || !justIncremented) return;
    void (async () => {
      if (await wasUpgradePrompted()) return;
      // Held back until the celebration has actually played.
      promptTimerRef.current = setTimeout(() => setUpgradePromptVisible(true), 2200);
    })();
    return () => { if (promptTimerRef.current) clearTimeout(promptTimerRef.current); };
  }, [guest, justIncremented]);

  async function handleCreateAccount() {
    await setUpgradePrompted();
    setUpgradePromptVisible(false);
    navigation.replace('SignUp');
  }

  async function handleDeclineUpgrade() {
    // Declining forfeits it for real — that's the deal the copy makes, and
    // keeping the totals around would quietly credit them on a later signup.
    await setUpgradePrompted();
    await clearPendingGuestProgress();
    setUpgradePromptVisible(false);
    navigation.navigate('MainTabs');
  }

  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const lumaScaleAnim = useRef(new Animated.Value(0)).current;
  const numberScaleAnim = useRef(new Animated.Value(1)).current;
  // Frozen state's ice placeholder used to be a static emoji — a plain PNG
  // next to the fire Lottie's constant motion read as "broken," not "on
  // ice." A slow breathing pulse gives it the same sense of being alive
  // without needing a real ice Lottie asset (none exists yet).
  const icePulseAnim = useRef(new Animated.Value(1)).current;
  // Celebration entrance: hold on streak-1, let Lumo + the flame settle in,
  // then pop the number up to the real total. A plain open (from the Map
  // HUD's streak pill) skips all of this and just shows the final number.
  const [displayedStreak, setDisplayedStreak] = useState(
    justIncremented ? Math.max(streak - 1, 0) : streak,
  );

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }).start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: -8, duration: 1200, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ]));
    loop.start();
    const iceLoop = Animated.loop(Animated.sequence([
      Animated.timing(icePulseAnim, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
      Animated.timing(icePulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
    ]));
    iceLoop.start();

    if (justIncremented) {
      Animated.spring(lumaScaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6, delay: 300 }).start();
      const timer = setTimeout(() => {
        setDisplayedStreak(streak);
        Animated.sequence([
          Animated.spring(numberScaleAnim, { toValue: 1.35, useNativeDriver: true, tension: 200, friction: 5 }),
          Animated.spring(numberScaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
        ]).start();
      }, 900);
      return () => { loop.stop(); iceLoop.stop(); clearTimeout(timer); };
    }
    return () => { loop.stop(); iceLoop.stop(); };
  }, []);

  // Single active-week card: 7 slots numbered by day-in-streak, not by
  // weekday letter — a 10-day streak reads as "Week 2, days 8-14 (4 filled)"
  // instead of looking identical to a 7-day streak (both fully filled at the
  // old fixed M-S/max-7 cap). Week N covers days (N-1)*7+1 .. N*7.
  const weekNum = displayedStreak > 0 ? Math.floor((displayedStreak - 1) / 7) + 1 : 1;
  const weekStartDay = (weekNum - 1) * 7 + 1;
  const weekDayNumbers = Array.from({ length: 7 }, (_, i) => weekStartDay + i);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Streak</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {justIncremented && (
          <View style={{ width: 90, height: 90, marginBottom: 4 }}>
            <Animated.Image
              source={require('../../../assets/images/lumo_transparent.png')}
              style={[styles.celebrationLuma, { marginBottom: 0, transform: [{ scale: lumaScaleAnim }] }]}
              resizeMode="contain"
            />
            <MascotShadow width={90} />
          </View>
        )}

        {/* Streak fire animation — frozen swaps in a blue/ice placeholder.
            No blue-fire art exists yet (product decision 2026-08-05): this
            is a deliberate placeholder occupying the same footprint as the
            Lottie, so dropping in a real asset/Lottie source later is a
            change to this one spot, not a layout change. */}
        <Animated.View style={{ transform: [{ translateY: floatAnim }, { scale: scaleAnim }] }}>
          {frozen ? (
            <View style={[styles.streakAnim, styles.frozenIconWrap]}>
              <Animated.Image
                source={STREAK_FROZEN_ICON}
                style={[styles.frozenIconImg, { transform: [{ scale: icePulseAnim }] }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <LottieView
              renderMode="SOFTWARE"
              source={require('../../../assets/animations/streak.json')}
              autoPlay loop
              style={styles.streakAnim}
            />
          )}
        </Animated.View>

        <Animated.Text
          style={[styles.streakNum, { color: streakColor(learning?.streak_state), transform: [{ scale: numberScaleAnim }] }]}
        >
          {displayedStreak}
        </Animated.Text>
        <Text style={styles.streakLabel}>day streak!</Text>
        <Text style={styles.streakSub}>
          {frozen
            ? 'Your streak is on ice. Complete levels today to save it.'
            : justIncremented
            ? "MashaAllah! You've kept your streak alive."
            : displayedStreak === 0
            ? 'Start your streak today, practice for just 5 minutes!'
            : displayedStreak < 7
            ? 'MashaAllah! Keep going, you are building a great habit.'
            : 'SubhanAllah! A full week streak, incredible dedication!'}
        </Text>

        {/* Freeze/repair banner — only while frozen. Gem-cost repair and push
            reminders are explicitly not built on the backend yet, so this
            stays to the two numbers the API actually gives: the countdown
            and today's distinct-level progress. */}
        {frozen && (
          <View style={styles.freezeCard}>
            <Text style={styles.freezeCardTitle}>❄️ {freezeDaysLabel(freezeDaysRemaining)}</Text>
            <Text style={styles.freezeCardBody}>{repairProgressLabel(repairCompleted, repairRequired)}</Text>
          </View>
        )}

        {/* XP earned badge */}
        <View style={styles.xpBadge}>
          <Text style={{ fontSize: 14 }}>⚡</Text>
          <Text style={styles.xpBadgeText}>+{displayedStreak * 5} XP earned from streaks</Text>
        </View>

        {/* Active week */}
        <View style={styles.weekCard}>
          <Text style={styles.weekTitle}>Week {weekNum}</Text>
          <View style={styles.daysRow}>
            {weekDayNumbers.map((dayNum, i) => {
              const filled = dayNum <= displayedStreak;
              return (
                <View key={i} style={styles.dayCol}>
                  <View style={[styles.dayDot, filled && { backgroundColor: STREAK_ACTIVE_COLOR, borderColor: STREAK_ACTIVE_COLOR }]}>
                    {filled && (
                      // Frozen reads via the ice-cube glyph itself, not by
                      // recoloring the dot blue — the dot stays the normal
                      // active color so "day completed" doesn't get
                      // overloaded with "streak currently frozen".
                      frozen
                        ? <Image source={STREAK_FROZEN_ICON} style={styles.dayIceIcon} resizeMode="contain" />
                        : <Text style={{ fontSize: 10 }}>✓</Text>
                    )}
                  </View>
                  <Text style={[styles.dayLabel, filled && { color: STREAK_ACTIVE_COLOR }]}>{dayNum}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Streak milestones */}
        <View style={styles.milestonesCard}>
          <Text style={styles.milestonesTitle}>Streak Milestones</Text>
          {[
            { days: 3, emoji: '🌱', label: '3-day streak', reward: '+20 XP', done: streak >= 3 },
            { days: 7, emoji: '⭐', label: '7-day streak', reward: '+50 XP', done: streak >= 7 },
            { days: 14, emoji: '🏅', label: '14-day streak', reward: '+100 XP', done: streak >= 14 },
            { days: 30, emoji: '🏆', label: '30-day streak', reward: '+250 XP', done: streak >= 30 },
          ].map(m => (
            <View key={m.days} style={[styles.milestoneRow, m.done && styles.milestoneRowDone]}>
              <Text style={{ fontSize: 18 }}>{m.emoji}</Text>
              <Text style={[styles.milestoneLabel, m.done && { color: colors.primary }]}>{m.label}</Text>
              <Text style={styles.milestoneReward}>{m.reward}</Text>
              {m.done && <View style={styles.milestoneDone}><Text style={{ fontSize: 10, color: 'white' }}>✓</Text></View>}
            </View>
          ))}
        </View>

        {/* Persistent reminder, not just the one-time post-increment modal
            below — a guest coming back to this screen later (e.g. tapping
            the streak HUD pill on the map) never triggers that modal at
            all, since it only fires right after a genuine increment. */}
        {guest && (
          <View style={styles.guestCard}>
            <Image
              source={require('../../../assets/images/lumo_transparent.png')}
              style={styles.guestCardLuma}
              resizeMode="contain"
            />
            <View style={styles.guestCardText}>
              <Text style={styles.guestCardTitle}>Save your progress</Text>
              <Text style={styles.guestCardBody}>This streak and XP aren't saved yet. Create a free account to keep them.</Text>
            </View>
            <TouchableOpacity style={styles.guestCardBtn} onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.guestCardBtnText}>Create account</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>{streak === 0 ? 'Start Today!' : 'Keep it up!'}</Text>
        </TouchableOpacity>
      </View>

      <AuthRequiredModal
        visible={upgradePromptVisible}
        title="Save your streak"
        body={`Your ${streak} day streak and the XP you just earned aren't saved yet. Create a free account to keep them, otherwise they'll be gone.`}
        ctaLabel="Create account"
        dismissLabel="Skip"
        onContinue={() => void handleCreateAccount()}
        onDismiss={() => void handleDeclineUpgrade()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.streakBg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.midText },
  headerTitle: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: colors.darkText },
  scroll: { alignItems: 'center', paddingHorizontal: 22, paddingBottom: 16 },
  celebrationLuma: { width: 90, height: 90, marginBottom: 4 },
  streakAnim: { width: 140, height: 140 },
  streakNum: { fontFamily: 'Nunito_700Bold', fontSize: 64, color: '#EA580C', lineHeight: 68 },
  streakLabel: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: colors.darkText, marginBottom: 6 },
  streakSub: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', lineHeight: 19, marginBottom: 14, paddingHorizontal: 16 },
  xpBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryBg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 20,
  },
  xpBadgeText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary },
  frozenIconWrap: { alignItems: 'center', justifyContent: 'center' },
  frozenIconImg: { width: 84, height: 84 },
  freezeCard: {
    width: '100%', backgroundColor: colors.blueBg, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16,
    borderWidth: 1, borderColor: STREAK_FROZEN_COLOR + '33', alignItems: 'center',
  },
  freezeCardTitle: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: STREAK_FROZEN_COLOR, marginBottom: 2, textAlign: 'center' },
  freezeCardBody: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.midText, textAlign: 'center' },
  weekCard: {
    width: '100%', backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  weekTitle: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.darkText, marginBottom: 12 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6 },
  dayDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.lightBg, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dayIceIcon: { width: 20, height: 20 },
  dayLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.mutedText },
  milestonesCard: {
    width: '100%', backgroundColor: colors.white, borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  milestonesTitle: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.darkText, marginBottom: 10 },
  milestoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },
  milestoneRowDone: { opacity: 0.9 },
  milestoneLabel: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.midText },
  milestoneReward: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.primary },
  milestoneDone: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  guestCard: {
    width: '100%', backgroundColor: colors.white, borderRadius: 18, padding: 16, marginTop: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  guestCardLuma: { width: 44, height: 44 },
  guestCardText: { flex: 1 },
  guestCardTitle: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.darkText, marginBottom: 2 },
  guestCardBody: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: colors.mutedText, lineHeight: 15 },
  guestCardBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  guestCardBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.white },
  footer: { paddingHorizontal: 22, paddingTop: 10 },
  btn: {
    backgroundColor: '#EA580C', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#EA580C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: 'white' },
});

