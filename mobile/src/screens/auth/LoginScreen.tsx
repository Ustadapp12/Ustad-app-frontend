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
import { validateEmail, normalizeEmail } from '../../utils/validators';
import { setLastEmailHint } from '../../utils/storage';

interface Props { navigation: RootNavProp }

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const login = useAuthStore(s => s.login);
  const setDevUser = useAuthStore(s => s._devLogin);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [emailTouched, setEmailTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  const emailValidationError = validateEmail(email);
  const emailError = emailTouched ? emailValidationError : null;
  const canSubmit = !emailValidationError && password.length > 0;

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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Luma */}
        <View style={styles.lumaWrap}>
          <Image source={require('../../../assets/images/lumo_transparent.png')} style={styles.luma} resizeMode="contain" />
        </View>

        <Text style={styles.heading}>Welcome back!</Text>
        <Text style={styles.sub}>Sign in to continue your Hifz journey</Text>

        {/* Email */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>✉️</Text>
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
            <Text style={styles.inputIcon}>🔒</Text>
            <PasswordInput
              value={password}
              onChangeText={handlePasswordChange}
              placeholder="••••••••"
              autoComplete="password"
              containerStyle={{ flex: 1 }}
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
          {loading ? <LoadingRing size={20} color="#fff" /> : <Text style={styles.btnText}>Log In</Text>}
        </TouchableOpacity>

        {showCreateAccount && (
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={styles.inlineCreateWrap}>
            <Text style={styles.switchLink}>Create Account</Text>
          </TouchableOpacity>
        )}

        {/* Register link */}
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>New to Ustad? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.switchLink}>Create account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg },
  statusBar: { paddingHorizontal: 24, paddingBottom: 6, backgroundColor: colors.lightBg },
  time: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.darkText },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  lumaWrap: { alignItems: 'center', paddingVertical: 20 },
  luma: { width: 110, height: 110 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 26, color: colors.darkText, textAlign: 'center', marginBottom: 4 },
  sub: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', marginBottom: 24 },
  fieldWrap: { marginBottom: 13 },
  fieldLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.midText, marginBottom: 5, letterSpacing: 0.4 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, fontFamily: 'Nunito_400Regular', fontSize: 15, color: colors.darkText },
  fieldError: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.red, marginTop: 4 },
  error: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.red, marginBottom: 12, textAlign: 'center' },
  inlineCreateWrap: { alignItems: 'center', marginBottom: 12 },
  forgotWrap: { alignItems: 'flex-end', marginBottom: 24 },
  forgot: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary },
  btn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginBottom: 18,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText },
  switchLink: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary },
});

