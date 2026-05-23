import React, { useCallback } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useAuthStore } from '../../store/authStore';
import { revisionApi } from '../../api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { MainTabParamList } from '../../navigation/types';
import type { RootStackParamList } from '../../navigation/types';

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

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} />
        }>
        <AppText variant="h1">Assalamu alaikum</AppText>
        {learning ? (
          <View style={styles.stats}>
            <Stat label="Hearts" value={String(learning.hearts_remaining)} />
            <Stat label="Streak" value={String(learning.current_streak)} />
            <Stat label="XP" value={String(learning.xp_total)} />
            <Stat label="Gems" value={String(learning.gem_balance)} />
          </View>
        ) : null}
        {revision ? (
          <AppText style={styles.revision}>Revision due: {revision}</AppText>
        ) : null}
        <PrimaryButton
          title="Continue Journey"
          onPress={() => navigation.navigate('Journey')}
          style={styles.cta}
        />
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="h2">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.screenHorizontal, paddingTop: spacing.lg },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  stat: {
    backgroundColor: colors.ash,
    padding: spacing.md,
    borderRadius: 12,
    minWidth: '45%',
  },
  revision: { marginTop: spacing.md, color: colors.primary },
  cta: { marginTop: spacing.xl },
});
