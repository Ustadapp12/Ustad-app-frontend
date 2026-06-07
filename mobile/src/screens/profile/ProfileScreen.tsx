import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { JourneyTopBar } from '../../components/ui/JourneyTopBar';
import { useAuthStore } from '../../store/authStore';
import { authApi, usersApi } from '../../api';
import { getCachedProfile, setCachedProfile } from '../../services/bootCache';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { setScriptPreference } from '../../utils/storage';
import type { LearnerMode, ScriptPreference, UserProfile } from '../../types/api';
import type { RootStackParamList } from '../../navigation/types';

type ProfilePatch = Partial<{
  display_name: string;
  learner_mode: LearnerMode;
  script_preference: ScriptPreference;
  daily_goal_minutes: number;
  streak_goal_days: number;
  motivation: string;
}>;

const SCRIPT_OPTIONS: { value: ScriptPreference; label: string }[] = [
  { value: 'uthmani', label: 'Uthmani' },
  { value: 'simple', label: 'Simple' },
  { value: 'nastaliq', label: 'Nastaliq' },
];

const LEARNER_OPTIONS: { value: LearnerMode; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'adult', label: 'Adult' },
  { value: 'child', label: 'Child' },
];

const DAILY_GOAL_OPTIONS = [5, 10, 15, 20, 30];
const STREAK_GOAL_OPTIONS = [7, 14, 30, 60, 90];

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, learning, logout } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(() => getCachedProfile());
  const [editName, setEditName] = useState(() => getCachedProfile()?.display_name ?? '');
  const [editingName, setEditingName] = useState(false);
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(() => getCachedProfile() === null);

  // Draft state for preference editing
  const [draftScript, setDraftScript] = useState<ScriptPreference | null>(null);
  const [draftLearnerMode, setDraftLearnerMode] = useState<LearnerMode | null>(null);
  const [draftDailyGoal, setDraftDailyGoal] = useState<number | null>(null);
  const [draftStreakGoal, setDraftStreakGoal] = useState<number | null>(null);
  const [draftMotivation, setDraftMotivation] = useState<string>('');

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    // If cache is warm, skip network fetch on mount
    if (getCachedProfile() !== null) {
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    try {
      const res = await authApi.me();
      setProfile(res.profile);
      setCachedProfile(res.profile);
      setEditName(res.profile.display_name ?? '');
    } catch {
      // non-fatal
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const openEditPrefs = () => {
    setDraftScript(profile?.script_preference ?? null);
    setDraftLearnerMode(profile?.learner_mode ?? null);
    setDraftDailyGoal(profile?.daily_goal_minutes ?? null);
    setDraftStreakGoal(profile?.streak_goal_days ?? null);
    setDraftMotivation(profile?.motivation ?? '');
    setEditingPrefs(true);
  };

  const patchProfile = async (patch: ProfilePatch) => {
    setSaving(true);
    try {
      const res = await usersApi.updateProfile(patch);
      setProfile(res.profile);
      setCachedProfile(res.profile);
      return res.profile;
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveDisplayName = async () => {
    if (!editName.trim()) return;
    const saved = await patchProfile({ display_name: editName.trim() });
    if (saved) setEditingName(false);
  };

  const savePreferences = async () => {
    const patch: ProfilePatch = {};
    if (draftScript !== null) patch.script_preference = draftScript;
    if (draftLearnerMode !== null) patch.learner_mode = draftLearnerMode;
    if (draftDailyGoal !== null) patch.daily_goal_minutes = draftDailyGoal;
    if (draftStreakGoal !== null) patch.streak_goal_days = draftStreakGoal;
    if (draftMotivation.trim()) patch.motivation = draftMotivation.trim();
    const saved = await patchProfile(patch);
    if (saved) {
      // Sync the local cache + reactive store so Arabic text re-renders immediately
      if (draftScript !== null) await setScriptPreference(draftScript);
      setEditingPrefs(false);
    }
  };

  return (
    <Screen style={styles.screen} edges={['top']}>
      <JourneyTopBar
        streak={learning?.current_streak}
        xp={learning?.xp_total}
        hearts={learning?.hearts_remaining}
        gems={learning?.gem_balance}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppText variant="h1" style={styles.title}>{copy.profile.title}</AppText>

        {/* Identity card */}
        <View style={styles.card}>
          <AppText style={styles.status}>
            {user ? copy.profile.signedIn : copy.profile.guest}
          </AppText>
          {user ? <AppText style={styles.email}>{user.email}</AppText> : null}

          {loadingProfile ? (
            <ActivityIndicator color={colors.yellow} style={styles.profileLoader} />
          ) : profile ? (
            <View style={styles.nameRow}>
              {editingName ? (
                <>
                  <TextInput
                    style={styles.nameInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Your display name"
                    placeholderTextColor={colors.grey}
                    maxLength={120}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveDisplayName}
                  />
                  <View style={styles.editButtons}>
                    <PrimaryButton title="Save" onPress={saveDisplayName} loading={saving} variant="primary" />
                    <PrimaryButton
                      title="Cancel"
                      onPress={() => {
                        setEditingName(false);
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
                  <PrimaryButton title="Edit" onPress={() => setEditingName(true)} variant="secondaryOnDark" />
                </View>
              )}
            </View>
          ) : null}
        </View>

        {/* Preferences card */}
        <View style={styles.prefsCard}>
          <View style={styles.prefHeader}>
            <AppText style={styles.sectionLabel}>Preferences</AppText>
            {!editingPrefs && profile ? (
              <Pressable onPress={openEditPrefs} style={styles.editBadge}>
                <AppText style={styles.editBadgeText}>Edit</AppText>
              </Pressable>
            ) : null}
          </View>

          {editingPrefs ? (
            <View style={styles.prefEditContainer}>
              {/* Arabic Script */}
              <AppText style={styles.prefGroupLabel}>Arabic Script</AppText>
              <View style={styles.pillRow}>
                {SCRIPT_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[styles.pill, draftScript === opt.value && styles.pillActive]}
                    onPress={() => setDraftScript(opt.value)}>
                    <AppText style={[styles.pillText, draftScript === opt.value && styles.pillTextActive]}>
                      {opt.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              {/* Learner Mode */}
              <AppText style={styles.prefGroupLabel}>Learner Mode</AppText>
              <View style={styles.pillRow}>
                {LEARNER_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[styles.pill, draftLearnerMode === opt.value && styles.pillActive]}
                    onPress={() => setDraftLearnerMode(opt.value)}>
                    <AppText style={[styles.pillText, draftLearnerMode === opt.value && styles.pillTextActive]}>
                      {opt.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              {/* Daily Goal */}
              <AppText style={styles.prefGroupLabel}>Daily Goal (minutes)</AppText>
              <View style={styles.pillRow}>
                {DAILY_GOAL_OPTIONS.map(val => (
                  <Pressable
                    key={val}
                    style={[styles.pill, draftDailyGoal === val && styles.pillActive]}
                    onPress={() => setDraftDailyGoal(val)}>
                    <AppText style={[styles.pillText, draftDailyGoal === val && styles.pillTextActive]}>
                      {val}m
                    </AppText>
                  </Pressable>
                ))}
              </View>

              {/* Streak Goal */}
              <AppText style={styles.prefGroupLabel}>Streak Goal (days)</AppText>
              <View style={styles.pillRow}>
                {STREAK_GOAL_OPTIONS.map(val => (
                  <Pressable
                    key={val}
                    style={[styles.pill, draftStreakGoal === val && styles.pillActive]}
                    onPress={() => setDraftStreakGoal(val)}>
                    <AppText style={[styles.pillText, draftStreakGoal === val && styles.pillTextActive]}>
                      {val}d
                    </AppText>
                  </Pressable>
                ))}
              </View>

              {/* Motivation */}
              <AppText style={styles.prefGroupLabel}>Motivation (optional)</AppText>
              <TextInput
                style={styles.motivationInput}
                value={draftMotivation}
                onChangeText={setDraftMotivation}
                placeholder="Why are you learning?"
                placeholderTextColor={colors.grey}
                maxLength={200}
                multiline
              />

              <View style={styles.editButtons}>
                <PrimaryButton title="Save Preferences" onPress={savePreferences} loading={saving} variant="primary" />
                <PrimaryButton title="Cancel" onPress={() => setEditingPrefs(false)} variant="secondaryOnDark" />
              </View>
            </View>
          ) : profile ? (
            <>
              {profile.learner_mode ? <PrefRow label="Learner mode" value={profile.learner_mode} /> : null}
              {profile.script_preference ? <PrefRow label="Script" value={profile.script_preference} /> : null}
              {profile.daily_goal_minutes ? <PrefRow label="Daily goal" value={`${profile.daily_goal_minutes} min`} /> : null}
              {profile.streak_goal_days ? <PrefRow label="Streak goal" value={`${profile.streak_goal_days} days`} /> : null}
              {profile.motivation ? <PrefRow label="Motivation" value={profile.motivation} /> : null}
              {!profile.learner_mode && !profile.script_preference && !profile.daily_goal_minutes ? (
                <AppText style={styles.noPrefsHint}>Tap Edit to set your preferences</AppText>
              ) : null}
            </>
          ) : null}
        </View>

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
          <PrimaryButton title={copy.profile.login} onPress={() => navigation.navigate('AuthLogin')} />
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
  label: { color: colors.grey, fontWeight: '600', flex: 1 },
  value: { color: colors.white, fontWeight: '800', flex: 1, textAlign: 'right' },
});

const prefStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  label: { color: colors.grey, fontSize: 13, fontWeight: '600' },
  value: { color: colors.white, fontSize: 13, fontWeight: '700', textTransform: 'capitalize', flex: 1, textAlign: 'right' },
});

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark },
  scroll: { padding: spacing.screenHorizontal, paddingBottom: spacing.xl, gap: spacing.md },
  title: { color: colors.white, marginBottom: spacing.xs },

  card: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: spacing.lg },
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
  editButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },

  prefsCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: spacing.lg,
  },
  prefHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    color: colors.grey,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  editBadge: {
    backgroundColor: `${colors.yellow}20`,
    borderWidth: 1,
    borderColor: `${colors.yellow}50`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  editBadgeText: { color: colors.yellow, fontSize: 11, fontWeight: '800' },

  noPrefsHint: { color: colors.grey, fontSize: 12, fontStyle: 'italic' },

  prefEditContainer: { gap: spacing.sm },
  prefGroupLabel: {
    color: colors.grey,
    fontSize: 11,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillActive: {
    borderColor: colors.yellow,
    backgroundColor: `${colors.yellow}20`,
  },
  pillText: { color: colors.grey, fontWeight: '700', fontSize: 13 },
  pillTextActive: { color: colors.yellow },

  motivationInput: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  stats: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: spacing.lg,
  },
  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.xl },
});
