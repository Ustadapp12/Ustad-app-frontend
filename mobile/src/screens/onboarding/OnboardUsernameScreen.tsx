import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usersApi } from '../../api';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import MascotShadow from '../../components/MascotShadow';
import { validateName } from '../../utils/validators';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';

interface Props { navigation: RootNavProp }

// First onboarding step, for a fresh run and for a resumed one alike (see
// getNextOnboardingScreen) — replaces sign-up's removed "Full Name" field. What
// to call the user everywhere else in the app (Profile, celebrations). Saved
// via the existing PATCH /users/me/name (writes UserProfile.display_name),
// same endpoint ProfileScreen already reads through — no new backend needed.
export default function OnboardUsernameScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  // updateDisplayName, not updateProfileFields: the latter only writes
  // profile.display_name, while ProfileScreen (and the rest of the app) reads
  // user.name. Using it here left the profile showing the email prefix — or
  // "Guest" on a claimed guest row — instead of the name just typed.
  const updateDisplayName = useAuthStore(s => s.updateDisplayName);
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
      await usersApi.updateName(trimmed);
      updateDisplayName(trimmed);
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

      <View style={styles.content}>
        <View style={{ width: 120, height: 120, marginBottom: 10 }}>
          <Image source={require('../../../assets/images/lumo_transparent.png')} style={[styles.luma, { marginBottom: 0 }]} resizeMode="contain" />
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
      </View>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 6, paddingTop: 4 },
  dots: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  dot: { width: 24, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 22, paddingTop: 8 },
  luma: { width: 120, height: 120, marginBottom: 10 },
  badge: {
    fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.primary,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, textAlign: 'center',
  },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: colors.darkText, textAlign: 'center', marginBottom: 6 },
  sub: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', marginBottom: 24 },
  inputBox: {
    width: '100%', backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  input: { fontFamily: 'Nunito_400Regular', fontSize: 15, color: colors.darkText, textAlign: 'center' },
  error: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.red, marginTop: 8, textAlign: 'center' },
  footer: { paddingHorizontal: 22, paddingTop: 12, backgroundColor: colors.lightBg },
  btn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
});
