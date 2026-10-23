import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, BackHandler, Alert, Linking } from 'react-native';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { ApiError } from '../../api/client';
import { colors } from '../../theme';
import PasswordInput from '../../components/PasswordInput';
import { LoadingRing } from '../../components/LoadingSpinner';
import MascotShadow from '../../components/MascotShadow';
import BackButton from '../../components/BackButton';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import AppleSignInButton from '../../components/AppleSignInButton';
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
import { styles } from './SignUpScreen.styles';
import { AUTH_IMAGES, MASCOT } from '../../assets';

interface Props { navigation: RootNavProp }

const SIGNUP_MESSAGES = ['Creating your account…', 'Connecting to the server…', 'Almost there…'];

const MAIL_ICON = AUTH_IMAGES.mail;
const PASSWORD_ICON = AUTH_IMAGES.password;

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
  // Apple accounts skip the name screen: Apple already shared the name, and
  // App Review rejected asking for it again (guideline 4, 2026-10-17).
  function handleSocialSuccess(action: AccountAction, provider: 'google' | 'apple') {
    if (action === 'restored') {
      setShowWelcomeBack(true);
      return;
    }
    navigation.replace(provider === 'apple' ? 'OnboardAge' : 'OnboardUsername');
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
            <BackButton onPress={() => setStep('email')} style={styles.backBtn} size={18} />
            <View style={styles.dots}>
              <View style={styles.dot} />
              <View style={[styles.dot, styles.dotActive]} />
            </View>
          </View>

          <View style={styles.stepContent}>
            <View style={{ width: 120, height: 120, marginBottom: 10 }}>
              <Image source={MASCOT.lumoTransparent} style={styles.stepLuma} resizeMode="contain" />
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
            {loading ? <LoadingRing size={20} color="#F5F7FA" /> : <Text style={styles.btnText}>Create Account</Text>}
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
          <Image source={MASCOT.lumoTransparent} style={styles.luma} resizeMode="contain" />
          <MascotShadow width={150} style={{ position: 'relative', marginTop: -15 }} />
        </View>

        <Text style={styles.heading}>Create account</Text>
        <Text style={styles.sub}>
          {guest
            ? 'Your streak, XP and progress will be saved to this account'
            : 'Start your free Hifz journey today'}
        </Text>

        {/* Apple and Google first, so the Apple button shows without
            scrolling (Apple's HIG, 2026-10-22). The terms checkbox moved up
            with them: it gates all three ways to sign up, so it must come
            before the first of them. */}
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

        {/* Still gated on the terms checkbox — signing up through Apple or Google still
            creates an account, so skipping the agreement here would lose the
            consent the form deliberately collects. Tapping while unchecked
            now points at the checkbox instead of doing nothing. */}
        <AppleSignInButton
          label="Sign up with Apple"
          onSuccess={a => handleSocialSuccess(a, 'apple')}
          onError={setFormError}
          disabled={loading || !agreedTerms}
          onBlocked={() => setTermsError(true)}
        />

        <GoogleSignInButton
          label="Sign up with Google"
          onSuccess={a => handleSocialSuccess(a, 'google')}
          onError={setFormError}
          disabled={loading || !agreedTerms}
          onBlocked={() => setTermsError(true)}
        />

        {formError && <Text style={styles.error}>{formError}</Text>}

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

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

        {/* CTA — advances to the password step; doesn't create the account yet */}
        <TouchableOpacity
          style={[styles.btn, (!canContinueFromEmail || loading) && styles.btnDisabled]}
          onPress={handleContinueFromEmail}
          disabled={!canContinueFromEmail || loading}
        >
          <Text style={styles.btnText}>Create Account</Text>
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
