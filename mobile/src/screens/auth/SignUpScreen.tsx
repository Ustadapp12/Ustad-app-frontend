import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, BackHandler, Alert, Linking,
} from 'react-native';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { ApiError } from '../../api/client';
import { colors } from '../../theme/colors';
import PasswordInput from '../../components/PasswordInput';
import { LoadingRing } from '../../components/LoadingSpinner';
import MascotShadow from '../../components/MascotShadow';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import WelcomeBackModal from '../../components/WelcomeBackModal';
import { PRIVACY_URL, TERMS_URL } from '../../config';
import { isGuest } from '../../utils/guest';
import type { AccountAction } from '../../types/api';
import type { RootNavProp } from '../../navigation/types';
import {
  validateEmail,
  normalizeEmail,
  getPasswordChecklist,
  getPasswordStrength,
  isPasswordValid,
} from '../../utils/validators';
import { useCyclingMessage } from '../../hooks/useCyclingMessage';
import { safeBottomInset } from '../../utils/responsive';

interface Props { navigation: RootNavProp }

const SIGNUP_MESSAGES = ['Creating your account…', 'Connecting to the server…', 'Almost there…'];

const MAIL_ICON = require('../../../assets/map/mail.png');
const PASSWORD_ICON = require('../../../assets/map/password.png');

type Step = 'email' | 'password';

export default function SignUpScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const register = useAuthStore(s => s.register);
  const login = useAuthStore(s => s.login);
  const upgradeGuest = useAuthStore(s => s.upgradeGuest);
  // Arriving here as a guest means claiming the account they're already using,
  // not creating a second one — same user row, so their levels survive.
  const guest = isGuest(useAuthStore(s => s.user));

  const [step, setStep] = useState<Step>('email');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadingMessage = useCyclingMessage(loading, SIGNUP_MESSAGES);

  const [emailTouched, setEmailTouched] = useState(false);
  const [emailServerError, setEmailServerError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  const emailValidationError = validateEmail(email);
  const emailError = emailTouched ? (emailValidationError ?? emailServerError) : null;
  const checklist = getPasswordChecklist(password);
  const strength = getPasswordStrength(checklist);
  const passwordOk = isPasswordValid(password);
  const passwordsMatch = password === confirmPassword;

  const canContinueFromEmail = !emailValidationError;
  const canSubmit = passwordOk && passwordsMatch;

  // Back closes the app from the email step (nothing useful sits behind it in
  // the stack — same rule as Login), but from the password step it steps back
  // to email instead, matching every other onboarding page's back arrow.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'password') {
        setStep('email');
        return true;
      }
      BackHandler.exitApp();
      return true;
    });
    return () => sub.remove();
  }, [step]);

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

  function handleConfirmPasswordChange(t: string) {
    setConfirmPassword(t);
    setFormError(null);
  }

  function openLegalLink(url: string) {
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open the page', 'Please check your connection and try again.');
    });
  }

  function toggleAgreedTerms() {
    setAgreedTerms(v => !v);
    setTermsError(false);
    setFormError(null);
  }

  // Gate shared by both the email path and Google — tapping either one
  // while unchecked points at the checkbox instead of silently doing nothing.
  function requireAgreedTerms(): boolean {
    if (agreedTerms) return true;
    setTermsError(true);
    return false;
  }

  function handleContinueFromEmail() {
    if (!canContinueFromEmail || loading) return;
    if (!requireAgreedTerms()) return;
    setStep('password');
  }

  // Google accounts skip VerifyEmail (the server marks them verified, since
  // Google already asserted the address), but they still need onboarding —
  // except on `restored`, where the returning account went through it long ago
  // and being asked for a username again would look like the progress was lost.
  function handleGoogleSuccess(action: AccountAction) {
    if (action === 'restored') {
      setShowWelcomeBack(true);
      return;
    }
    navigation.replace('OnboardUsername');
  }

  async function handleRegister() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setFormError(null);
    const normalizedEmail = normalizeEmail(email);
    try {
      if (guest) {
        await upgradeGuest(normalizedEmail, password);
      } else {
        await register(normalizedEmail, password);
      }
      if (useAuthStore.getState().user?.email_verified) {
        navigation.replace('OnboardUsername');
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
      // Same failure mode on the guest path: the upgrade landed server-side but
      // the response never arrived, so the local session still looks like a
      // guest and a retry hits "this account already has an email". The
      // credentials from that first attempt are live, so signing in with them
      // recovers cleanly instead of stranding the user on a claimed account
      // they can't get into.
      if (e instanceof ApiError && e.code === 'ALREADY_REGISTERED') {
        try {
          await login(normalizedEmail, password);
          if (useAuthStore.getState().user?.email_verified) {
            navigation.replace('OnboardUsername');
          } else {
            navigation.replace('VerifyEmail', { email: normalizedEmail });
          }
          return;
        } catch {
          // Fall through and surface the original error.
        }
      }
      if (e instanceof ApiError && (e.code === 'EMAIL_ALREADY_EXISTS' || e.status === 409)) {
        try {
          await login(normalizedEmail, password);
          if (useAuthStore.getState().user?.email_verified) {
            navigation.replace('OnboardUsername');
          } else {
            navigation.replace('VerifyEmail', { email: normalizedEmail });
          }
          return;
        } catch {
          // Not the same account/password — fall through to the real error.
        }
        setEmailServerError(e.message || 'An account with this email already exists.');
        setStep('email');
      } else if (e instanceof ApiError && (e.code === 'INVALID_NAME' || e.code === 'INVALID_EMAIL' || e.code === 'WEAK_PASSWORD')) {
        setFormError(e.message);
      } else {
        setFormError(e instanceof Error ? e.message : 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (step === 'password') {
    return (
      <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.stepScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('email')}>
              <Image source={require('../../../assets/back_arrow.png')} style={styles.backArrow} resizeMode="contain" />
            </TouchableOpacity>
            <View style={styles.dots}>
              <View style={styles.dot} />
              <View style={[styles.dot, styles.dotActive]} />
            </View>
          </View>

          <View style={styles.stepContent}>
            <View style={{ width: 120, height: 120, marginBottom: 10 }}>
              <Image source={require('../../../assets/images/lumo_transparent.png')} style={styles.stepLuma} resizeMode="contain" />
              <MascotShadow width={120} />
            </View>
            <Text style={styles.badge}>ALMOST THERE</Text>
            <Text style={styles.heading}>Create a password</Text>
            <Text style={styles.sub}>Keep your progress safe</Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View style={styles.inputBox}>
                <Image source={PASSWORD_ICON} style={styles.inputIcon} resizeMode="contain" />
                <PasswordInput
                  value={password}
                  onChangeText={handlePasswordChange}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  autoFocus
                  containerStyle={{ flex: 1 }}
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

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
              <View style={styles.inputBox}>
                <Image source={PASSWORD_ICON} style={styles.inputIcon} resizeMode="contain" />
                <PasswordInput
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  containerStyle={{ flex: 1 }}
                />
              </View>
            </View>

            {formError && <Text style={styles.error}>{formError}</Text>}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={!canSubmit || loading}
          >
            {loading ? <LoadingRing size={20} color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <LoadingRing size={64} />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.lumaWrap}>
          <Image source={require('../../../assets/images/lumo_transparent.png')} style={styles.luma} resizeMode="contain" />
          <MascotShadow width={150} style={{ position: 'relative', marginTop: -15 }} />
        </View>

        <Text style={styles.heading}>Create account</Text>
        <Text style={styles.sub}>
          {guest
            ? 'Your streak, XP and progress will be saved to this account'
            : 'Start your free Hifz journey today'}
        </Text>

        {/* Email */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <View style={styles.inputBox}>
            <Image source={MAIL_ICON} style={styles.inputIcon} resizeMode="contain" />
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

        {/* Terms — the checkbox itself is the only toggle target now. It used
            to be the whole row, which fought with the Terms/Privacy links
            underneath it (now real, tappable URLs) for the same touch. */}
        <View style={styles.termsRow}>
          <TouchableOpacity
            onPress={toggleAgreedTerms}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.checkbox,
              agreedTerms && styles.checkboxActive,
              termsError && !agreedTerms && styles.checkboxError,
            ]}
          >
            {agreedTerms && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text style={styles.termsLink} onPress={() => openLegalLink(TERMS_URL)}>
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text style={styles.termsLink} onPress={() => openLegalLink(PRIVACY_URL)}>
              Privacy Policy
            </Text>
          </Text>
        </View>
        {termsError && !agreedTerms && (
          <Text style={styles.error}>Please agree to the Terms of Service and Privacy Policy to continue.</Text>
        )}

        {formError && <Text style={styles.error}>{formError}</Text>}

        {/* CTA — advances to the password step; doesn't create the account yet */}
        <TouchableOpacity
          style={[styles.btn, (!canContinueFromEmail || loading) && styles.btnDisabled]}
          onPress={handleContinueFromEmail}
          disabled={!canContinueFromEmail || loading}
        >
          <Text style={styles.btnText}>Create Account</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Still gated on the terms checkbox — signing up through Google still
            creates an account, so skipping the agreement here would lose the
            consent the form deliberately collects. Tapping while unchecked
            now points at the checkbox instead of doing nothing. */}
        <GoogleSignInButton
          label="Sign up with Google"
          onSuccess={handleGoogleSuccess}
          onError={setFormError}
          disabled={loading || !agreedTerms}
          onBlocked={() => setTermsError(true)}
        />

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
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      )}

      <WelcomeBackModal
        visible={showWelcomeBack}
        onContinue={() => { setShowWelcomeBack(false); navigation.replace('MainTabs'); }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg },
  statusBar: { paddingHorizontal: 24, paddingBottom: 6 },
  time: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.darkText },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  lumaWrap: { alignItems: 'center', paddingVertical: 20 },
  luma: { width: 150, height: 150 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: colors.darkText, textAlign: 'center', marginBottom: 4 },
  sub: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', marginBottom: 24 },
  fieldWrap: { width: '100%', marginBottom: 11 },
  fieldLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.midText, marginBottom: 5, letterSpacing: 0.4 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  inputIcon: { width: 18, height: 18 },
  input: { flex: 1, fontFamily: 'Nunito_400Regular', fontSize: 15, color: colors.darkText },
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
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6, marginTop: 6 },
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
    alignItems: 'center', marginBottom: 16, marginTop: 14,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.mutedText },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText },
  switchLink: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.darkText, marginTop: 4 },

  // ── Password step — matches the onboarding pages (OnboardUsernameScreen
  // etc.): header with back arrow + progress dots, centered content, CTA
  // pinned to the footer instead of scrolling with the form.
  stepScroll: { flexGrow: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 6, paddingTop: 4 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { width: 18, height: 18, tintColor: colors.darkText },
  dots: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  dot: { width: 24, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  stepContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 22, paddingTop: 8 },
  stepLuma: { width: 120, height: 120, marginBottom: 0 },
  badge: {
    fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.primary,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, textAlign: 'center',
  },
  footer: { paddingHorizontal: 22, paddingTop: 12, backgroundColor: colors.lightBg },
});
