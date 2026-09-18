import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Image, Modal } from 'react-native';
import LottieView from 'lottie-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import AuthRequiredModal from '../../components/AuthRequiredModal';
import MascotShadow from '../../components/MascotShadow';
import StreakCalendar from '../../components/StreakCalendar';
import { learningApi } from '../../api';
import type { StreakCalendar as StreakCalendarData } from '../../types/api';
import {
  clearPendingGuestProgress, isGuest, setUpgradePrompted, wasUpgradePrompted,
} from '../../utils/guest';
import { colors } from '../../theme/colors';
import {
  isStreakFrozen, streakColor, streakGradientColors, freezeDaysLabel, repairProgressLabel,
  STREAK_FROZEN_COLOR,
  STREAK_ACTIVE_ICON_SMALL, STREAK_FROZEN_ICON_SMALL,
} from '../../utils/streak';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp, RootStackParamList } from '../../navigation/types';

// Streak Milestones card is wired but hidden for now (2026-09-16 redesign) —
// flip back on when product wants the reward badges shown again.
const SHOW_STREAK_MILESTONES = false;

interface Props {
  navigation: RootNavProp;
  route: RouteProp<RootStackParamList, 'Streak'>;
}

export default function StreakScreen({ navigation, route }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
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
  const [helpVisible, setHelpVisible] = useState(false);
  const guest = isGuest(user);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real per-day history for the calendar below — only what the backend can
  // actually verify (see StreakCalendar.tsx). Silently absent on failure
  // rather than showing a fabricated grid.
  const [calendar, setCalendar] = useState<StreakCalendarData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await learningApi.streakCalendar();
        if (!cancelled) setCalendar(data);
      } catch {
        // Leave calendar null — the section just doesn't render.
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

    if (justIncremented) {
      Animated.spring(lumaScaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6, delay: 300 }).start();
      const timer = setTimeout(() => {
        setDisplayedStreak(streak);
        Animated.sequence([
          Animated.spring(numberScaleAnim, { toValue: 1.35, useNativeDriver: true, tension: 200, friction: 5 }),
          Animated.spring(numberScaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
        ]).start();
      }, 900);
      return () => { loop.stop(); clearTimeout(timer); };
    }
    return () => { loop.stop(); };
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Streak</Text>
        <TouchableOpacity style={styles.helpBtn} onPress={() => setHelpVisible(true)} accessibilityLabel="How streaks work">
          <Text style={styles.helpBtnText}>?</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {justIncremented && (
          <View style={{ width: 105, height: 105, marginBottom: 4 }}>
            <Animated.Image
              source={require('../../../assets/images/lumo_transparent.png')}
              style={[styles.celebrationLuma, { marginBottom: 0, transform: [{ scale: lumaScaleAnim }] }]}
              resizeMode="contain"
            />
            <MascotShadow width={105} />
          </View>
        )}

        {/* Hero row — streak number on the left, fire animation on the
            right (2026-09-16 redesign; previously stacked/centered). Frozen
            swaps in the blue recolor of the same Lottie (2026-08-28),
            replacing the ice-cube placeholder this comment used to describe
            as temporary (product decision 2026-08-05: "no blue-fire art
            exists yet"). streak_frozen.json is a direct derivative of
            streak.json — same shapes/timing, only the 4 named fill layers
            (base/dark/outer/light Outlines) recolored from the warm palette
            to blue, anchored on STREAK_FROZEN_COLOR (#2E90E5, the blue
            already used for "frozen" everywhere else in the app) for the
            flame body and a paler ice-blue for the glow. Regenerate by
            re-running the same layer-name -> RGB mapping over a future
            streak.json if the base animation is ever redesigned; don't
            hand-edit the derived file directly. */}
        {/* Hero card — a gradient panel behind the number + animation
            (Duolingo reference: the card visibly "glows" warmer while a
            streak is active than while it's frozen/broken, not a flat
            tint). streakGradientColors() lives next to streakColor() in
            utils/streak.ts so every place a streak renders stays in sync. */}
        <LinearGradient
          colors={streakGradientColors(learning?.streak_state)}
          style={styles.heroCard}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              {/* Soft glow disc behind the number — a plain RN Text can't be
                  gradient-filled without pulling in @react-native-masked-view
                  (not installed), so the "glamour" comes from a warm blurred
                  aura behind the digits plus a matching text-shadow glow on
                  the digits themselves, both keyed off streakColor(). */}
              <View
                pointerEvents="none"
                style={[styles.streakGlow, { backgroundColor: streakColor(learning?.streak_state) + '33' }]}
              />
              <Animated.Text
                style={[
                  styles.streakNum,
                  {
                    color: streakColor(learning?.streak_state),
                    textShadowColor: streakColor(learning?.streak_state) + '80',
                    transform: [{ scale: numberScaleAnim }],
                  },
                ]}
              >
                {displayedStreak}
              </Animated.Text>
              <Text style={styles.streakLabel}>day streak!</Text>
            </View>
            <Animated.View style={{ transform: [{ translateY: floatAnim }, { scale: scaleAnim }] }}>
              <LottieView
                renderMode="SOFTWARE"
                source={frozen
                  ? require('../../../assets/animations/streak_frozen.json')
                  : require('../../../assets/animations/streak.json')}
                autoPlay loop
                style={styles.streakAnim}
              />
            </Animated.View>
          </View>
        </LinearGradient>

        <Text style={styles.streakSub}>
          {frozen
            ? 'Your streak is on ice. Complete levels today to save it.'
            : justIncremented
            ? "MashaAllah! You've kept your streak alive."
            : displayedStreak === 0
            ? 'Start your streak today, practice for just 5 minutes!'
            : 'MashaAllah! Keep going, you are building a great habit.'}
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

        {/* Practice calendar — real per-day history from the backend
            (learningApi.streakCalendar), replacing the old single-week
            straight-line flame row. Absent until it loads/if it fails, no
            placeholder grid. */}
        {calendar && (
          <StreakCalendar
            startDate={calendar.start_date}
            practicedDates={calendar.practiced_dates}
            frozenDates={calendar.frozen_dates}
          />
        )}

        {/* Streak milestones — wired but hidden for now, see
            SHOW_STREAK_MILESTONES above. */}
        {SHOW_STREAK_MILESTONES && (
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
                {m.done && <View style={styles.milestoneDone}><Text style={{ fontSize: 10, color: '#F5F7FA' }}>✓</Text></View>}
              </View>
            ))}
          </View>
        )}

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

        {/* Was the footer CTA's job (it always just did goBack(), same as the
            header's ✕ — removed as a redundant second button) — keep the
            safe-area clearance it used to provide at the bottom. */}
        <View style={{ height: insets.bottom + 16 }} />
      </ScrollView>

      <AuthRequiredModal
        visible={upgradePromptVisible}
        title="Save your streak"
        body={`Your ${streak} day streak and the XP you just earned aren't saved yet. Create a free account to keep them, otherwise they'll be gone.`}
        ctaLabel="Create account"
        dismissLabel="Skip"
        onContinue={() => void handleCreateAccount()}
        onDismiss={() => void handleDeclineUpgrade()}
      />

      <Modal visible={helpVisible} transparent animationType="fade" onRequestClose={() => setHelpVisible(false)}>
        <View style={styles.helpBackdrop}>
          <View style={[styles.helpCard, { maxHeight: '80%' }]}>
            <View style={styles.helpCardHeader}>
              <Text style={styles.helpCardTitle}>How streaks work</Text>
              <TouchableOpacity style={styles.helpCloseBtn} onPress={() => setHelpVisible(false)}>
                <Text style={styles.helpCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Fire — the active streak */}
              <View style={styles.helpSection}>
                <View style={styles.helpSectionHeader}>
                  <Image source={STREAK_ACTIVE_ICON_SMALL} style={styles.helpSectionIcon} resizeMode="contain" />
                  <Text style={styles.helpSectionTitle}>Your streak</Text>
                </View>
                <Text style={styles.helpSectionBody}>
                  Your streak counts the number of days in a row you've completed at least one lesson. Every day you show up, it grows.
                </Text>
                <Text style={styles.helpSectionSubtitle}>How to keep it going</Text>
                <Text style={styles.helpSectionBody}>
                  Finish at least one lesson every day. It doesn't have to be a long session, one completed lesson is enough to keep the streak alive for that day.
                </Text>
              </View>

              {/* Ice — the frozen/grace state */}
              <View style={[styles.helpSection, { marginBottom: 0 }]}>
                <View style={styles.helpSectionHeader}>
                  <Image source={STREAK_FROZEN_ICON_SMALL} style={styles.helpSectionIcon} resizeMode="contain" />
                  <Text style={styles.helpSectionTitle}>Frozen streak</Text>
                </View>
                <Text style={styles.helpSectionBody}>
                  Miss a day and your streak doesn't disappear right away, it freezes instead. A frozen streak gives you a few extra days to save it before it resets to zero.
                </Text>
                <Text style={styles.helpSectionSubtitle}>How to repair it</Text>
                <Text style={styles.helpSectionBody}>
                  While frozen, complete a set number of different lesson levels before the countdown runs out to bring your streak back to active. Replaying the same level twice doesn't count, each repair level has to be a different one.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.helpGotItBtn} onPress={() => setHelpVisible(false)}>
              <Text style={styles.helpGotItBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  closeBtnText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.midText },
  headerTitle: { fontFamily: 'Nunito-Bold', fontSize: 17, color: colors.darkText },
  helpBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  helpBtnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.midText },
  helpBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  helpCard: {
    width: '100%', maxWidth: 420, backgroundColor: colors.white, borderRadius: 22,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  helpCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  helpCardTitle: { fontFamily: 'Nunito-Bold', fontSize: 19, color: colors.darkText },
  helpCloseBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.lightBg,
    alignItems: 'center', justifyContent: 'center',
  },
  helpCloseBtnText: { fontFamily: 'Nunito-Bold', fontSize: 12, color: colors.midText },
  helpSection: { marginBottom: 20 },
  helpSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  helpSectionIcon: { width: 30, height: 30 },
  helpSectionTitle: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.darkText },
  helpSectionSubtitle: {
    fontFamily: 'Nunito-Bold', fontSize: 12, color: colors.primary,
    letterSpacing: 0.3, marginTop: 10, marginBottom: 4,
  },
  helpSectionBody: { fontFamily: 'Nunito-Regular', fontSize: 13.5, color: colors.mutedText, lineHeight: 20 },
  helpGotItBtn: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  helpGotItBtnText: { fontFamily: 'Nunito-Bold', fontSize: 15, color: colors.white },
  scroll: { alignItems: 'center', paddingHorizontal: 22, paddingBottom: 16 },
  celebrationLuma: { width: 105, height: 105, marginBottom: 4 },
  // Hero card — gradient panel (Duolingo reference) behind the streak number
  // and fire animation; heroRow is the row layout inside it.
  heroCard: { width: '100%', borderRadius: 22, padding: 18, marginBottom: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLeft: { alignItems: 'flex-start', position: 'relative' },
  // A soft halo behind just the number — see the inline comment above the
  // JSX for why this (not a gradient fill) is the number's "glamour."
  streakGlow: { position: 'absolute', top: -14, left: -18, width: 104, height: 88, borderRadius: 52 },
  streakAnim: { width: 132, height: 132 },
  streakNum: {
    fontFamily: 'Nunito-Bold', fontSize: 62, color: '#EA580C', lineHeight: 66,
    letterSpacing: -1, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 10,
  },
  streakLabel: { fontFamily: 'Nunito-Bold', fontSize: 20, color: colors.darkText, letterSpacing: 0.2 },
  streakSub: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', lineHeight: 19, marginBottom: 14, paddingHorizontal: 16 },
  freezeCard: {
    width: '100%', backgroundColor: colors.blueBg, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16,
    borderWidth: 1, borderColor: STREAK_FROZEN_COLOR + '33', alignItems: 'center',
  },
  freezeCardTitle: { fontFamily: 'Nunito-Bold', fontSize: 14, color: STREAK_FROZEN_COLOR, marginBottom: 2, textAlign: 'center' },
  freezeCardBody: { fontFamily: 'Nunito-Bold', fontSize: 12, color: colors.midText, textAlign: 'center' },
  milestonesCard: {
    width: '100%', backgroundColor: colors.white, borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  milestonesTitle: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.darkText, marginBottom: 10 },
  milestoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },
  milestoneRowDone: { opacity: 0.9 },
  milestoneLabel: { flex: 1, fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.midText },
  milestoneReward: { fontFamily: 'Nunito-Bold', fontSize: 12, color: colors.primary },
  milestoneDone: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  guestCard: {
    width: '100%', backgroundColor: colors.white, borderRadius: 18, padding: 16, marginTop: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  guestCardLuma: { width: 52, height: 52 },
  guestCardText: { flex: 1 },
  guestCardTitle: { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.darkText, marginBottom: 2 },
  guestCardBody: { fontFamily: 'Nunito-Regular', fontSize: 11, color: colors.mutedText, lineHeight: 15 },
  guestCardBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  guestCardBtnText: { fontFamily: 'Nunito-Bold', fontSize: 12, color: colors.white },
});

