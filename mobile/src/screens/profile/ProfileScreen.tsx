import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { JourneyTopBar } from '../../components/ui/JourneyTopBar';
import { useAuthStore } from '../../store/authStore';
import { authApi, usersApi } from '../../api';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { UserProfile } from '../../types/api';
import type { RootStackParamList } from '../../navigation/types';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, learning, logout } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoadingProfile(true);
    try {
      const res = await authApi.me();
      setProfile(res.profile);
      setEditName(res.profile.display_name ?? '');
    } catch {
      // non-fatal — keep showing cached data
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile]),
  );

  const saveDisplayName = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await usersApi.updateProfile({ display_name: editName.trim() });
      setProfile(res.profile);
      setEditing(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <JourneyTopBar
        streak={learning?.current_streak}
        xp={learning?.xp_total}
        hearts={learning?.hearts_remaining}
        gems={learning?.gem_balance}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppText variant="h1" style={styles.title}>
          {copy.profile.title}
        </AppText>

        {/* Identity card */}
        <View style={styles.card}>
          <AppText style={styles.status}>
            {user ? copy.profile.signedIn : copy.profile.guest}
          </AppText>
          {user ? (
            <AppText style={styles.email}>{user.email}</AppText>
          ) : null}

          {loadingProfile ? (
            <ActivityIndicator color={colors.yellow} style={styles.profileLoader} />
          ) : profile ? (
            <View style={styles.nameRow}>
              {editing ? (
                <>
                  <TextInput
                    style={styles.nameInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Your display name"
                    placeholderTextColor={colors.grey}
                    maxLength={120}
                    autoFocus
                  />
                  <View style={styles.editButtons}>
                    <PrimaryButton
                      title="Save"
                      onPress={saveDisplayName}
                      loading={saving}
                      variant="primary"
                    />
                    <PrimaryButton
                      title="Cancel"
                      onPress={() => {
                        setEditing(false);
                        setEditName(profile.display_name ?? '');
                      }}
                      variant="secondaryOnDark"
                    />
                  </View>
                </>
              ) : (
                <View style={styles.nameDisplay}>
                  <AppText style={styles.displayName}>
                    {profile.display_name ?? 'No name set'}
                  </AppText>
                  <PrimaryButton
                    title="Edit name"
                    onPress={() => setEditing(true)}
                    variant="secondaryOnDark"
                  />
                </View>
              )}
            </View>
          ) : null}
        </View>

        {/* Profile preferences */}
        {profile ? (
          <View style={styles.prefsCard}>
            <AppText style={styles.sectionLabel}>Preferences</AppText>
            {profile.learner_mode ? (
              <PrefRow label="Learner mode" value={profile.learner_mode} />
            ) : null}
            {profile.script_preference ? (
              <PrefRow label="Script" value={profile.script_preference} />
            ) : null}
            {profile.daily_goal_minutes ? (
              <PrefRow label="Daily goal" value={`${profile.daily_goal_minutes} min`} />
            ) : null}
            {profile.streak_goal_days ? (
              <PrefRow label="Streak goal" value={`${profile.streak_goal_days} days`} />
            ) : null}
          </View>
        ) : null}

        {/* Learning stats */}
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

function PrefRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={prefStyles.row}>
      <AppText style={prefStyles.label}>{label}</AppText>
      <AppText style={prefStyles.value}>{value}</AppText>
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

const prefStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  label: { color: colors.grey, fontSize: 13, fontWeight: '600' },
  value: { color: colors.white, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
});

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark },
  scroll: { padding: spacing.screenHorizontal, paddingBottom: spacing.xl, gap: spacing.md },
  title: { color: colors.white, marginBottom: spacing.xs },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: spacing.lg,
  },
  status: { color: colors.yellow, fontWeight: '800' },
  email: { color: colors.grey, marginTop: spacing.xs, fontSize: 13 },
  profileLoader: { marginTop: spacing.md },
  nameRow: { marginTop: spacing.md },
  nameDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  displayName: { color: colors.white, fontWeight: '800', fontSize: 16, flex: 1 },
  nameInput: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: colors.yellow,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  editButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  prefsCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: spacing.lg,
  },
  sectionLabel: {
    color: colors.grey,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  stats: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: spacing.lg,
  },
  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.xl },
});
