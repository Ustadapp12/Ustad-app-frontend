import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import type { RootNavProp, RootStackParamList } from '../../navigation/types';

interface Props {
  navigation: RootNavProp;
  route: RouteProp<RootStackParamList, 'Streak'>;
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function StreakScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { learning } = useAuthStore();
  const streak = route.params?.currentStreak ?? learning?.current_streak ?? 0;
  const justIncremented = route.params?.justIncremented ?? false;

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
    return () => loop.stop();
  }, []);

  // How many days filled this week (up to current streak, max 7)
  const filledDays = Math.min(displayedStreak, 7);

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
          <Animated.Image
            source={require('../../../assets/images/lumo_transparent.png')}
            style={[styles.celebrationLuma, { transform: [{ scale: lumaScaleAnim }] }]}
            resizeMode="contain"
          />
        )}

        {/* Streak fire animation */}
        <Animated.View style={{ transform: [{ translateY: floatAnim }, { scale: scaleAnim }] }}>
          <LottieView
        renderMode="SOFTWARE"
            source={require('../../../assets/animations/streak.json')}
            autoPlay loop
            style={styles.streakAnim}
          />
        </Animated.View>

        <Animated.Text style={[styles.streakNum, { transform: [{ scale: numberScaleAnim }] }]}>{displayedStreak}</Animated.Text>
        <Text style={styles.streakLabel}>day streak!</Text>
        <Text style={styles.streakSub}>
          {justIncremented
            ? "MashaAllah! You've kept your streak alive."
            : displayedStreak === 0
            ? 'Start your streak today — practice for just 5 minutes!'
            : displayedStreak < 7
            ? 'MashaAllah! Keep going, you are building a great habit.'
            : 'SubhanAllah! A full week streak — incredible dedication!'}
        </Text>

        {/* XP earned badge */}
        <View style={styles.xpBadge}>
          <Text style={{ fontSize: 14 }}>⚡</Text>
          <Text style={styles.xpBadgeText}>+{displayedStreak * 5} XP earned from streaks</Text>
        </View>

        {/* This week */}
        <View style={styles.weekCard}>
          <Text style={styles.weekTitle}>This Week</Text>
          <View style={styles.daysRow}>
            {DAYS.map((day, i) => {
              const filled = i < filledDays;
              return (
                <View key={i} style={styles.dayCol}>
                  <View style={[styles.dayDot, filled && styles.dayDotFilled]}>
                    {filled && <Text style={{ fontSize: 10 }}>✓</Text>}
                  </View>
                  <Text style={[styles.dayLabel, filled && styles.dayLabelFilled]}>{day}</Text>
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
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>{streak === 0 ? 'Start Today!' : 'Keep it up!'}</Text>
        </TouchableOpacity>
      </View>
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
  dayDotFilled: { backgroundColor: '#EA580C', borderColor: '#EA580C' },
  dayLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.mutedText },
  dayLabelFilled: { color: '#EA580C' },
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
  footer: { paddingHorizontal: 22, paddingTop: 10 },
  btn: {
    backgroundColor: '#EA580C', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#EA580C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: 'white' },
});

