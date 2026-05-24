import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { JourneyTopBar } from '../../components/ui/JourneyTopBar';
import { useAuthStore } from '../../store/authStore';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, learning, logout } = useAuthStore();

  return (
    <Screen style={styles.screen}>
      <JourneyTopBar
        streak={learning?.current_streak}
        xp={learning?.xp_total}
        hearts={learning?.hearts_remaining}
        gems={learning?.gem_balance}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="h1" style={styles.title}>
          {copy.profile.title}
        </AppText>
        <View style={styles.card}>
          <AppText style={styles.status}>
            {user ? copy.profile.signedIn : copy.profile.guest}
          </AppText>
          {user ? (
            <AppText style={styles.email}>{user.email}</AppText>
          ) : null}
        </View>
        {learning ? (
          <View style={styles.stats}>
            <Row label="Total XP" value={String(learning.xp_total)} />
            <Row label="Current streak" value={`${learning.current_streak} days`} />
            <Row label="Longest streak" value={`${learning.longest_streak} days`} />
            <Row label="Gems" value={String(learning.gem_balance)} />
            <Row label="Hearts" value={String(learning.hearts_remaining)} />
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        {user ? (
          <PrimaryButton
            title={copy.profile.logout}
            variant="secondaryOnDark"
            onPress={async () => {
              await logout();
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            }}
          />
        ) : (
          <PrimaryButton
            title={copy.profile.login}
            onPress={() => navigation.navigate('AuthLogin')}
          />
        )}
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <AppText style={rowStyles.label}>{label}</AppText>
      <AppText style={rowStyles.value}>{value}</AppText>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  label: { color: colors.grey, fontWeight: '600' },
  value: { color: colors.white, fontWeight: '800' },
});

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark },
  scroll: { padding: spacing.screenHorizontal, paddingBottom: spacing.xl },
  title: { color: colors.white, marginBottom: spacing.lg },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  status: { color: colors.yellow, fontWeight: '800' },
  email: { color: colors.grey, marginTop: spacing.xs },
  stats: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: spacing.lg,
  },
  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.xl },
});
