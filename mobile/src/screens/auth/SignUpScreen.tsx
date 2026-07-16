import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { ApiError } from '../../api/client';
import { colors } from '../../theme/colors';
import PasswordInput from '../../components/PasswordInput';
import { LoadingRing } from '../../components/LoadingSpinner';
import type { RootNavProp } from '../../navigation/types';
import {
  validateName,
  validateEmail,
  normalizeEmail,
  getPasswordChecklist,
  getPasswordStrength,
  isPasswordValid,
} from '../../utils/validators';

interface Props { navigation: RootNavProp }

export default function SignUpScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const register = useAuthStore(s => s.register);
  const login = useAuthStore(s => s.login);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailServerError, setEmailServerError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const nameValidationError = validateName(name);
  const emailValidationError = validateEmail(email);
  const nameError = nameTouched ? nameValidationError : null;
  const emailError = emailTouched ? (emailValidationError ?? emailServerError) : null;
  const checklist = getPasswordChecklist(password);
  const strength = getPasswordStrength(checklist);
  const passwordOk = isPasswordValid(password);

  // Terms deliberately isn't part of canSubmit — unlike name/email/password,
  // there's no field to show an inline error next to, so instead the button
  // stays tappable and handleRegister surfaces a clear formError on press.
  // (Previously agreedTerms gated the button directly, which left it looking
  // permanently — and silently — disabled if someone forgot to check it.)
  const canSubmit = !nameValidationError && !emailValidationError && passwordOk;

  function handleNameChange(t: string) {
    setName(t);
    setNameTouched(true);
  }

  function handleEmailChange(t: string) {
    setEmail(t);
    setEmailTouched(true);
    setEmailServerError(null);
    setFormError(null);
  }

  function handlePasswordChange(t: string) {
    setPassword(t);
    setFormError(null);
  }

  async function handleRegister() {
    if (!canSubmit || loading) return;
    if (!agreedTerms) {
      setFormError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setLoading(true);
    setFormError(null);
    const normalizedEmail = normalizeEmail(email);
    try {
      await register(normalizedEmail, password, name.trim());
      if (useAuthStore.getState().user?.email_verified) {
        navigation.replace('OnboardAge');
      } else {
        navigation.replace('VerifyEmail', { email: normalizedEmail });
      }
    } catch (e: any) {
      // A previous attempt can time out client-side (e.g. a cold-started
      // backend taking >15s to hash + write) while actually completing on
      // the server — the account gets created but the client never sees the
      // success response. Retrying registration then correctly reports
      // "already registered" for something that never appeared to succeed.
      // Rather than dead-end there, try logging in with what was just
      // typed — if this is really the account that just got created, this
      // succeeds transparently instead of confusing the user.
      if (e instanceof ApiError && (e.code === 'EMAIL_ALREADY_EXISTS' || e.status === 409)) {
        try {
          await login(normalizedEmail, password);
          if (useAuthStore.getState().user?.email_verified) {
            navigation.replace('OnboardAge');
          } else {
            navigation.replace('VerifyEmail', { email: normalizedEmail });
          }
          return;
        } catch {
          // Not the same account/password — fall through to the real error.
        }
        setEmailServerError(e.message || 'An account with this email already exists.');
      } else if (e instanceof ApiError && (e.code === 'INVALID_NAME' || e.code === 'INVALID_EMAIL' || e.code === 'WEAK_PASSWORD')) {
        setFormError(e.message);
      } else {
        setFormError(e instanceof Error ? e.message : 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.lumaWrap}>
          <Image source={require('../../../assets/images/lumo_transparent.png')} style={styles.luma} resizeMode="contain" />
        </View>

        <Text style={styles.heading}>Create account</Text>
        <Text style={styles.sub}>Start your free Hifz journey today</Text>

        {/* Full name */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>FULL NAME</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="Ahmad Al-Rashid"
              placeholderTextColor={colors.placeholderText}
              value={name}
              onChangeText={handleNameChange}
              autoComplete="name"
            />
          </View>
          {nameError && <Text style={styles.fieldError}>{nameError}</Text>}
        </View>

        {/* Email */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="ahmad@example.com"
              placeholderTextColor={colors.placeholderText}
              value={email}
              onChangeText={handleEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>
          {emailError && <Text style={styles.fieldError}>{emailError}</Text>}
        </View>

        {/* Password */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <View style={styles.inputBox}>
            <PasswordInput
              value={password}
              onChangeText={handlePasswordChange}
              placeholder="Min 8 characters"
              autoComplete="new-password"
            />
          </View>
          {password.length > 0 && (
            <View style={styles.checklistWrap}>
              <Text style={[styles.checklistItem, checklist.minLength ? styles.checklistMet : styles.checklistUnmet]}>
                {checklist.minLength ? '✓' : '✗'} At least 8 characters
              </Text>
              <Text style={[styles.checklistItem, checklist.uppercase ? styles.checklistMet : styles.checklistUnmet]}>
                {checklist.uppercase ? '✓' : '✗'} One uppercase letter
              </Text>
              <Text style={[styles.checklistItem, checklist.lowercase ? styles.checklistMet : styles.checklistUnmet]}>
                {checklist.lowercase ? '✓' : '✗'} One lowercase letter
              </Text>
              <Text style={[styles.checklistItem, checklist.number ? styles.checklistMet : styles.checklistUnmet]}>
                {checklist.number ? '✓' : '✗'} One number
              </Text>
              <Text style={[styles.checklistItem, checklist.special ? styles.checklistMet : styles.checklistUnmet]}>
                {checklist.special ? '✓' : '✗'} One special character
              </Text>
              <Text
                style={[
                  styles.strengthText,
                  strength === 'Weak' && styles.strengthWeak,
                  strength === 'Medium' && styles.strengthMedium,
                  strength === 'Strong' && styles.strengthStrong,
                ]}
              >
                Strength: {strength}
              </Text>
            </View>
          )}
        </View>

        {/* Terms */}
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => { setAgreedTerms(v => !v); setFormError(null); }}
        >
          <View style={[
            styles.checkbox,
            agreedTerms && styles.checkboxActive,
            !agreedTerms && formError && styles.checkboxError,
          ]}>
            {agreedTerms && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </TouchableOpacity>

        {formError && <Text style={styles.error}>{formError}</Text>}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={!canSubmit || loading}
        >
          {loading ? <LoadingRing size={20} color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
        </TouchableOpacity>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.switchLink}>Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <LoadingRing size={64} />
          <Text style={styles.loadingText}>Creating your account…</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg },
  statusBar: { paddingHorizontal: 24, paddingBottom: 6 },
  time: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.darkText },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  lumaWrap: { alignItems: 'center', paddingVertical: 14 },
  luma: { width: 90, height: 90 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: colors.darkText, textAlign: 'center', marginBottom: 4 },
  sub: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', marginBottom: 20 },
  fieldWrap: { marginBottom: 11 },
  fieldLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.midText, marginBottom: 5, letterSpacing: 0.4 },
  inputBox: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  input: { fontFamily: 'Nunito_400Regular', fontSize: 15, color: colors.darkText },
  fieldError: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.red, marginTop: 4 },
  error: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.red, marginBottom: 12, textAlign: 'center' },
  checklistWrap: { marginTop: 8, marginBottom: 4 },
  checklistItem: { fontFamily: 'Nunito_400Regular', fontSize: 12, marginBottom: 2 },
  checklistMet: { color: colors.success },
  checklistUnmet: { color: colors.red },
  strengthText: { fontFamily: 'Nunito_700Bold', fontSize: 12, marginTop: 4 },
  strengthWeak: { color: colors.red },
  strengthMedium: { color: colors.warning },
  strengthStrong: { color: colors.success },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20, marginTop: 4 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxError: { borderColor: colors.red },
  checkmark: { color: 'white', fontSize: 12, fontWeight: '700' },
  termsText: { flex: 1, fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, lineHeight: 20 },
  termsLink: { fontFamily: 'Nunito_700Bold', color: colors.primary },
  btn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginBottom: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText },
  switchLink: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.darkText, marginTop: 4 },
});

