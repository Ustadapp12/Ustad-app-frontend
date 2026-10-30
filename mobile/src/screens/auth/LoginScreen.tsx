import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, BackHandler } from 'react-native';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { ApiError } from '../../api/client';
import { colors } from '../../theme';
import PasswordInput from '../../components/PasswordInput';
import { LoadingRing } from '../../components/LoadingSpinner';
import MascotShadow from '../../components/MascotShadow';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import AppleSignInButton from '../../components/AppleSignInButton';
import WelcomeBackModal from '../../components/WelcomeBackModal';
import type { AccountAction } from '../../types/api';
import type { RootNavProp } from '../../navigation/types';
import { validateEmail, normalizeEmail } from '../../utils/validators';
import { setLastEmailHint } from '../../utils/storage';
import { useCyclingMessage } from '../../hooks/useCyclingMessage';
import { safeBottomInset } from '../../utils/responsive';
import { styles } from './LoginScreen.styles';
import { AUTH_IMAGES, MASCOT } from '../../assets';

interface Props { navigation: RootNavProp }

const LOGIN_MESSAGES = ['Logging in…', 'Connecting to the server…', 'Almost there…'];

const MAIL_ICON = AUTH_IMAGES.mail;
const PASSWORD_ICON = AUTH_IMAGES.password;

export default function LoginScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const login = useAuthStore(s => s.login);
  const setDevUser = useAuthStore(s => s._devLogin);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const loadingMessage = useCyclingMessage(loading, LOGIN_MESSAGES);

  const [emailTouched, setEmailTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  const emailValidationError = validateEmail(email);
  const emailError = emailTouched ? emailValidationError : null;
  const canSubmit = !emailValidationError && password.length > 0;

  // Login sits right after Splash in the stack, which a plain back-pop would
  // reveal — there is nothing useful behind it, so back closes the app here
  // instead, same as it would at the app's real entry point.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => sub.remove();
  }, []);

  function handleEmailChange(t: string) {
    setEmail(t);
    setEmailTouched(true);
    setFormError(null);
    setShowCreateAccount(false);
  }

  function handlePasswordChange(t: string) {
    setPassword(t);
    setFormError(null);
    setShowCreateAccount(false);
  }

  async function handleLogin() {
    if (!canSubmit || loading) return;
    // Dev bypass: any email + password "expo" skips the API
    if (__DEV__ && password === 'expo') {
      setDevUser?.(email.trim());
      navigation.replace('MainTabs');
      return;
    }
    setLoading(true);
    setFormError(null);
    const normalizedEmail = normalizeEmail(email);
    void setLastEmailHint(normalizedEmail);
    try {
      await login(normalizedEmail, password);
      if (useAuthStore.getState().user?.email_verified) {
        navigation.replace('MainTabs');
      } else {
        navigation.replace('VerifyEmail', { email: normalizedEmail });
      }
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'TOO_MANY_REQUESTS' || e.status === 429)) {
        setFormError(e.message || 'Too many attempts. Please wait a bit and try again.');
      } else if (e instanceof ApiError && e.code === 'USER_NOT_FOUND') {
        setFormError(e.message);
        setShowCreateAccount(true);
      } else if (e instanceof ApiError && (e.code === 'INVALID_PASSWORD' || e.status === 401)) {
        setFormError(e.message || 'Incorrect password.');
      } else {
        setFormError(e instanceof Error ? e.message : 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Google never routes to VerifyEmail: the server marks these accounts
  // verified because Google already asserted the address.
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  function handleSocialSuccess(action: AccountAction, provider: 'google' | 'apple') {
    if (action === 'restored') {
      setShowWelcomeBack(true);
      return;
    }
    // 'created' or 'claimed' from the Login screen's Google button means this
    // Google identity had no existing account — the backend just made one,
    // same as SignUpScreen's own Google button does. It needs onboarding too.
    // Apple's start at Age instead: Apple already shared the name, and App
    // Review rejected asking for it again (guideline 4, 2026-10-17).
    if (action === 'created' || action === 'claimed') {
      navigation.replace(provider === 'apple' ? 'OnboardAge' : 'OnboardUsername');
      return;
    }
    navigation.replace('MainTabs');
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* paddingTop: on a short screen (iPhone SE, or an iPhone app on the
          review iPad) the content is taller than the window, so centering
          stops working and Lumo would start under the status bar. */}
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top, paddingBottom: 40 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {/* Luma */}
        <View style={styles.lumaWrap}>
          <Image source={MASCOT.lumoTransparent} style={styles.luma} resizeMode="contain" />
          <MascotShadow width={130} style={styles.mascotShadow} />
        </View>

        <Text style={styles.heading}>Welcome back!</Text>
        <Text style={styles.sub}>Sign in to continue your Hifz journey</Text>

        {/* Email */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <View style={styles.inputRow}>
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

        {/* Password */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <View style={styles.inputRow}>
            <Image source={PASSWORD_ICON} style={styles.inputIcon} resizeMode="contain" />
            <PasswordInput
              value={password}
              onChangeText={handlePasswordChange}
              placeholder="••••••••"
              autoComplete="password"
              containerStyle={styles.passwordField}
            />
          </View>
        </View>

        {/* Forgot — only shown once a syntactically valid email is entered */}
        {!emailValidationError && (
          <TouchableOpacity
            style={styles.forgotWrap}
            onPress={() => {
              const normalized = normalizeEmail(email);
              if (normalized) void setLastEmailHint(normalized);
              navigation.navigate('ForgotPassword');
            }}
          >
            <Text style={styles.forgot}>Forgot password?</Text>
          </TouchableOpacity>
        )}

        {formError && <Text style={styles.error}>{formError}</Text>}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={!canSubmit || loading}
        >
          {loading ? <LoadingRing size={20} color="#F5F7FA" /> : <Text style={styles.btnText}>Log In</Text>}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* iOS only (renders nothing elsewhere). Required by App Store
            Guideline 4.8 because Google Sign-In is offered, and placed first
            so it is at least as prominent as Google. Apple accounts are
            verified by Apple, so they share Google's success routing, except
            that a new Apple account skips the name screen. */}
        <AppleSignInButton
          label="Sign in with Apple"
          onSuccess={a => handleSocialSuccess(a, 'apple')}
          onError={setFormError}
          disabled={loading}
        />

        <GoogleSignInButton
          label="Sign in with Google"
          onSuccess={a => handleSocialSuccess(a, 'google')}
          onError={setFormError}
          disabled={loading}
        />

        {showCreateAccount ? (
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={styles.inlineCreateWrap}>
            <Text style={styles.switchLink}>Create an account!</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>New to UstadApp? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.switchLink}>Create account</Text>
            </TouchableOpacity>
          </View>
        )}
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
