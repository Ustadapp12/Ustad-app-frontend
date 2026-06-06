import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { EmojiText } from '../../components/ui/EmojiText';
import { JourneyTopBar } from '../../components/ui/JourneyTopBar';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { learningApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { LearningStats } from '../../types/api';

export function StatsScreen() {
  const learning = useAuthStore(s => s.learning);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await learningApi.stats();
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <Screen style={styles.screen} edges={['top']}>
        <IrabBackground color={colors.yellow} />
        <JourneyTopBar
          streak={learning?.current_streak}
          xp={learning?.xp_total}
          hearts={learning?.hearts_remaining}
          gems={learning?.gem_balance}
        />
        <View style={styles.center}>
          <ActivityIndicator color={colors.yellow} />
        </View>
      </Screen>
    );
  }

  // Fallback to learning.me data if stats endpoint not available
  const streak = stats?.current_streak ?? learning?.current_streak ?? 0;
  const bestStreak = stats?.best_streak ?? learning?.longest_streak ?? 0;
  const xpTotal = learning?.xp_total ?? 0;
  const hearts = learning?.hearts_remaining ?? 5;
  const gems = learning?.gem_balance ?? 0;

  return (
    <Screen style={styles.screen} edges={['top']}>
      <IrabBackground color={colors.yellow} />
      <JourneyTopBar
        streak={learning?.current_streak}
        xp={learning?.xp_total}
        hearts={learning?.hearts_remaining}
        gems={learning?.gem_balance}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.yellow} />
        }>
        <EmojiText size={36}>📊</EmojiText>
        <AppText variant="h1" style={styles.title}>Your Stats</AppText>

        {/* Summary cards row */}
        <View style={styles.row}>
          <MiniCard icon="🔥" label="Streak" value={`${streak}d`} color={colors.yellow} />
          <MiniCard icon="⚡" label="Total XP" value={String(xpTotal)} color={colors.yellow} />
          <MiniCard icon="❤️" label="Hearts" value={`${hearts}/5`} color={colors.heart} />
        </View>

        {stats ? (
          <>
            {/* Accuracy */}
            <View style={styles.card}>
              <AppText style={styles.cardTitle}>Accuracy</AppText>
              <AppText style={styles.bigStat}>
                {Math.round(stats.accuracy_pct)}%
              </AppText>
              <AppText style={styles.cardSub}>
                {stats.total_correct} correct / {stats.total_attempts} attempts
              </AppText>
              <View style={styles.accuracyBar}>
                <View style={[styles.accuracyFill, { width: `${Math.min(stats.accuracy_pct, 100)}%` }]} />
              </View>
            </View>

            {/* Weekly XP bar chart */}
            <View style={styles.card}>
              <AppText style={styles.cardTitle}>XP This Week</AppText>
              <View style={styles.barChart}>
                {[...stats.weekly_xp].reverse().map((xp, i) => {
                  const maxXp = Math.max(...stats.weekly_xp, 1);
                  const height = Math.max((xp / maxXp) * 80, xp > 0 ? 4 : 2);
                  const isToday = i === stats.weekly_xp.length - 1;
                  const days = ['7d', '6d', '5d', '4d', '3d', '2d', 'Td'];
                  return (
                    <View key={i} style={styles.barWrap}>
                      <View style={[
                        styles.bar,
                        { height, backgroundColor: isToday ? colors.yellow : `${colors.primary}80` },
                      ]} />
                      <AppText style={[styles.barLabel, isToday && styles.barLabelToday]}>
                        {days[i]}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Detail stats */}
            <View style={styles.card}>
              <StatRow icon="📖" label="Sessions completed" value={String(stats.total_sessions)} />
              <StatRow icon="🕌" label="Surahs started" value={String(stats.surahs_started)} />
              <StatRow icon="✅" label="Surahs completed" value={String(stats.surahs_completed)} />
              <StatRow icon="⏱" label="Total study time" value={`${stats.total_time_minutes} min`} />
              <StatRow icon="🏆" label="Best streak" value={`${bestStreak} days`} />
              <StatRow icon="💎" label="Gems" value={String(gems)} last />
            </View>
          </>
        ) : (
          <>
            {/* Fallback from learning.me */}
            <View style={styles.card}>
              <StatRow icon="🏆" label="Best streak" value={`${bestStreak} days`} />
              <StatRow icon="💎" label="Gems" value={String(gems)} last />
            </View>
            <View style={styles.comingSoonBadge}>
              <AppText style={styles.comingSoonText}>
                📈 Detailed analytics — coming soon
              </AppText>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function MiniCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.mini, { borderColor: `${color}30` }]}>
      <EmojiText size={22}>{icon}</EmojiText>
      <AppText style={[styles.miniValue, { color }]}>{value}</AppText>
      <AppText style={styles.miniLabel}>{label}</AppText>
    </View>
  );
}

function StatRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.statRow, !last && styles.statRowBorder]}>
      <EmojiText size={18}>{icon}</EmojiText>
      <AppText style={styles.statRowLabel}>{label}</AppText>
      <AppText style={styles.statRowValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl + spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  icon: { fontSize: 36, textAlign: 'center' },
  title: { color: colors.white, textAlign: 'center' },

  row: { flexDirection: 'row', gap: spacing.sm },
  mini: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  miniIcon: { fontSize: 20, marginBottom: 4 },
  miniValue: { fontSize: 22, fontWeight: '900' },
  miniLabel: { fontSize: 10, fontWeight: '700', color: colors.grey, marginTop: 2 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.grey,
    marginBottom: spacing.sm,
  },
  bigStat: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.primary,
    lineHeight: 56,
  },
  cardSub: { color: colors.grey, fontSize: 12, fontWeight: '600', marginTop: 2 },
  accuracyBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  accuracyFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },

  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    height: 96,
    marginTop: spacing.sm,
  },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar: { width: '100%', borderRadius: 4, minHeight: 2 },
  barLabel: { fontSize: 9, fontWeight: '700', color: colors.grey },
  barLabelToday: { color: colors.yellow },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  statRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  statRowIcon: { fontSize: 18, width: 28 },
  statRowLabel: { flex: 1, color: colors.grey, fontWeight: '600', fontSize: 13 },
  statRowValue: { color: colors.white, fontWeight: '900', fontSize: 15 },

  comingSoonBadge: {
    backgroundColor: `${colors.yellow}12`,
    borderWidth: 1,
    borderColor: `${colors.yellow}30`,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  comingSoonText: { color: colors.yellow, fontWeight: '700', fontSize: 12, textAlign: 'center' },
});
