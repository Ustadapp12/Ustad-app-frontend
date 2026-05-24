import React, { useCallback } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { JourneyTopBar } from '../../components/ui/JourneyTopBar';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { useAuthStore } from '../../store/authStore';
import { revisionApi } from '../../api';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const learning = useAuthStore(s => s.learning);
  const refresh = useAuthStore(s => s.refreshLearning);
  const [revision, setRevision] = React.useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      revisionApi.next().then(r => setRevision(r.ayah_id)).catch(() => setRevision(null));
    }, [refresh]),
  );

  const dailyMinutes = 10;

  return (
    <Screen style={styles.screen}>
      <IrabBackground />
      <JourneyTopBar
        streak={learning?.current_streak}
        xp={learning?.xp_total}
        hearts={learning?.hearts_remaining}
        gems={learning?.gem_balance}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refresh}
            tintColor={colors.yellow}
          />
        }>
        <AppText variant="h1" style={styles.greeting}>
          {copy.home.greeting}
        </AppText>

        <View style={styles.ringCard}>
          <AppText style={styles.ringLabel}>{copy.home.dailyGoal}</AppText>
          <AppText style={styles.ringValue}>{dailyMinutes} min</AppText>
          <View style={styles.ringTrack}>
            <View style={[styles.ringFill, { width: '40%' }]} />
          </View>
        </View>

        {learning ? (
          <View style={styles.statsRow}>
            <StatCard label="Streak" value={`${learning.current_streak}🔥`} />
            <StatCard label="XP" value={String(learning.xp_total)} />
            <StatCard label="Hearts" value={`${learning.hearts_remaining}❤️`} />
            <StatCard label="Gems" value={`${learning.gem_balance}💎`} />
          </View>
        ) : null}

        {revision ? (
          <Pressable
            style={styles.revisionCard}
            onPress={() => navigation.navigate('Revision')}>
            <AppText style={styles.revisionTitle}>{copy.home.revisionDue}</AppText>
            <AppText style={styles.revisionId}>{revision}</AppText>
          </Pressable>
        ) : null}

        <PrimaryButton
          title={copy.home.continue}
          onPress={() => navigation.navigate('Journey')}
          style={styles.cta}
        />
        <PrimaryButton
          title={copy.home.juzProgress}
          variant="secondaryOnDark"
          onPress={() => navigation.navigate('Journey')}
        />
      </ScrollView>
    </Screen>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText style={styles.statLabel}>{label}</AppText>
      <AppText style={styles.statValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark },
  scroll: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
  },
  greeting: { color: colors.white, marginBottom: spacing.lg },
  ringCard: {
    backgroundColor: 'rgba(5, 150, 106, 0.4)',
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ringLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '700',
    fontSize: 12,
  },
  ringValue: {
    color: colors.yellow,
    fontWeight: '900',
    fontSize: 28,
    marginVertical: spacing.sm,
  },
  ringTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  ringFill: {
    height: '100%',
    backgroundColor: colors.yellow,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  stat: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statLabel: { color: colors.grey, fontSize: 11, fontWeight: '700' },
  statValue: { color: colors.white, fontWeight: '800', fontSize: 18, marginTop: 4 },
  revisionCard: {
    backgroundColor: colors.yellow,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  revisionTitle: { fontWeight: '900', color: colors.dark, fontSize: 14 },
  revisionId: { color: colors.charcoal, marginTop: 4, fontWeight: '600' },
  cta: { marginBottom: spacing.sm },
});
