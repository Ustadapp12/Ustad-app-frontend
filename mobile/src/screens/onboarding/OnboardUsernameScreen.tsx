import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '../../api/client';
import { colors } from '../../theme';
import MascotShadow from '../../components/MascotShadow';
import { validateName } from '../../utils/validators';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';
import { styles } from './OnboardUsernameScreen.styles';
import { MASCOT } from '../../assets';
import { useProfileActions } from '../../hooks/api';

interface Props { navigation: RootNavProp }

// First onboarding step, for a fresh run and for a resumed one alike (see
// getNextOnboardingScreen) — replaces sign-up's removed "Full Name" field. What
// to call the user everywhere else in the app (Profile, celebrations). Saved
// via the existing PATCH /users/me/name (writes UserProfile.display_name),
// same endpoint ProfileScreen already reads through — no new backend needed.
export default function OnboardUsernameScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  // saveName updates user.name (via updateDisplayName), which ProfileScreen
  // and the rest of the app read; profile.display_name alone left the profile
  // showing the email prefix, or "Guest" on a claimed guest row.
  const { saveName } = useProfileActions();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError = validateName(name);
  const canSubmit = name.length > 0 && !validationError;

  async function handleContinue() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    const trimmed = name.trim();
    try {
      await saveName(trimmed);
      navigation.navigate('OnboardAge');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'INVALID_NAME') setError(e.message);
      else setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* No back button: this is the first onboarding step, and the account
          already exists by the time it renders (registered + verified, or
          Google). "Back" used to go to SignUp, which would strand a user who
          had already signed up. */}
      <View style={styles.headerRow}>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.mascotBox}>
          <Image source={MASCOT.lumoTransparent} style={[styles.luma, styles.mascotImgFlush]} resizeMode="contain" />
          <MascotShadow width={120} />
        </View>
        <Text style={styles.badge}>GETTING TO KNOW YOU</Text>
        <Text style={styles.heading}>What should we call you?</Text>
        <Text style={styles.sub}>This is how you'll appear in the app</Text>

        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={t => { setName(t); setError(null); }}
            placeholder="Ahmad Al-Rashid"
            placeholderTextColor={colors.placeholderText}
            autoComplete="name"
            maxLength={50}
          />
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!canSubmit || loading}
        >
          <Text style={styles.btnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
