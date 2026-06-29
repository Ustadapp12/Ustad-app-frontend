import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';


const QUESTS = [
  {
    id: 1, icon: '📖', title: 'Complete a Lesson', desc: 'Finish any lesson in the map',
    xp: 20, status: 'done' as const, progress: null,
  },
  {
    id: 2, icon: '🎯', title: 'Perfect Recall', desc: 'Answer 5 questions correctly',
    xp: 15, status: 'inprogress' as const, progress: { current: 3, total: 5 },
  },
  {
    id: 3, icon: '🔥', title: 'Daily Streak', desc: 'Practice for 3 days in a row',
    xp: 25, status: 'locked' as const, progress: null,
  },
];

export default function DailyQuestScreen() {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={['#0D3B26', '#1A5C3A', '#0D3B26']} style={styles.container}>
      {/* Coming Soon banner */}
      <View style={[styles.comingSoonBanner, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.comingSoonText}>🚧  Coming Soon!  🚧</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>⭐ DAILY QUESTS</Text>
          <Text style={styles.headerTitle}>Today's Challenges</Text>
        </View>
        <Image source={require('../../../assets/images/lumo_transparent.png')} style={styles.lumaAvatar} resizeMode="contain" />
      </View>

      {/* Progress summary */}
      <View style={styles.progressCard}>
        <View style={styles.progressTopRow}>
          <View>
            <Text style={styles.progressFraction}>2 / 3</Text>
            <Text style={styles.progressLabel}>Quests Complete</Text>
          </View>
          <View style={styles.bonusBadge}>
            <Image source={require('../../../assets/images/lumo_xp.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
            <Text style={styles.bonusText}>+50 XP bonus</Text>
          </View>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: '67%' }]} />
        </View>
        <Text style={styles.progressHint}>Complete 1 more to earn today's full reward!</Text>
      </View>

      {/* Quest cards */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {QUESTS.map(q => (
          <View key={q.id} style={[styles.questCard, q.status === 'done' && styles.questCardDone, q.status === 'locked' && styles.questCardLocked]}>
            {/* Icon */}
            <View style={[styles.questIcon, q.status === 'done' && { backgroundColor: colors.successBg }, q.status === 'locked' && { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <Text style={{ fontSize: 20 }}>{q.icon}</Text>
            </View>

            {/* Content */}
            <View style={styles.questContent}>
              <Text style={[styles.questTitle, q.status === 'locked' && styles.questTitleLocked]}>{q.title}</Text>
              <Text style={[styles.questDesc, q.status === 'locked' && styles.questDescLocked]}>{q.desc}</Text>
              {q.progress && (
                <View style={styles.miniProgressWrap}>
                  <View style={styles.miniProgressTrack}>
                    <View style={[styles.miniProgressFill, { width: `${(q.progress.current / q.progress.total) * 100}%` as any }]} />
                  </View>
                  <Text style={styles.miniProgressLabel}>{q.progress.current}/{q.progress.total}</Text>
                </View>
              )}
            </View>

            {/* Status badge */}
            <View style={styles.questRight}>
              {q.status === 'done' && (
                <View style={styles.doneBadge}><Text style={{ fontSize: 14 }}>✓</Text></View>
              )}
              {q.status === 'locked' && (
                <View style={styles.lockedBadge}><Text style={{ fontSize: 14 }}>🔒</Text></View>
              )}
              <View style={[styles.xpBadge, q.status === 'locked' && { opacity: 0.4 }]}>
                <Image source={require('../../../assets/images/lumo_xp.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                <Text style={styles.xpText}>+{q.xp}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Reset timer */}
        <View style={styles.resetRow}>
          <Text style={{ fontSize: 16 }}>⏱</Text>
          <Text style={styles.resetText}>Quests reset in <Text style={{ color: colors.gold, fontFamily: 'Nunito_700Bold' }}>06:14:32</Text></Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  comingSoonBanner: {
    backgroundColor: '#DC2626',
    paddingBottom: 16, paddingHorizontal: 24,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.7, shadowRadius: 10, elevation: 8,
  },
  comingSoonText: {
    fontFamily: 'Nunito_700Bold', fontSize: 22, color: 'white',
    letterSpacing: 0.5,
  },
  time: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: 'rgba(255,255,255,0.85)' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingTop: 6, paddingBottom: 10,
  },
  headerLabel: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.gold, letterSpacing: 1.5 },
  headerTitle: { fontFamily: 'Nunito_700Bold', fontSize: 22, color: 'white', marginTop: 2 },
  lumaAvatar: { width: 54, height: 54 },
  progressCard: {
    marginHorizontal: 18, marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
  },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressFraction: { fontFamily: 'Nunito_700Bold', fontSize: 22, color: 'white' },
  progressLabel: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  bonusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.goldBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
  },
  bonusText: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.warning },
  progressBarTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, marginBottom: 8 },
  progressBarFill: { height: 8, backgroundColor: colors.success, borderRadius: 4 },
  progressHint: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  scroll: { paddingHorizontal: 18, paddingBottom: 30 },
  questCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    padding: 14, marginBottom: 10,
  },
  questCardDone: { borderColor: 'rgba(34,197,94,0.4)', backgroundColor: 'rgba(34,197,94,0.08)' },
  questCardLocked: { opacity: 0.65 },
  questIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  questContent: { flex: 1 },
  questTitle: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: 'white', marginBottom: 2 },
  questTitleLocked: { color: 'rgba(255,255,255,0.55)' },
  questDesc: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  questDescLocked: { color: 'rgba(255,255,255,0.35)' },
  miniProgressWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  miniProgressTrack: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3 },
  miniProgressFill: { height: 5, backgroundColor: colors.primary, borderRadius: 3 },
  miniProgressLabel: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  questRight: { alignItems: 'center', gap: 6 },
  doneBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  lockedBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  xpBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(42,125,79,0.7)', borderRadius: 10,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  xpText: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#A8EBC0' },
  resetRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingVertical: 12,
  },
  resetText: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.65)' },
});

