import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../../api';
import { ApiError } from '../../api/client';
import { colors } from '../../theme/colors';
import { LoadingRing } from '../../components/LoadingSpinner';
import type { RootNavProp } from '../../navigation/types';
import { validateEmail, normalizeEmail, maskEmail } from '../../utils/validators';
import { getLastEmailHint, setLastEmailHint } from '../../utils/storage';

interface Props { navigation: RootNavProp }

export default function ForgotPasswordScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const [emailTouched, setEmailTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const emailValidationError = validateEmail(email);
  const emailError = emailTouched ? emailValidationError : null;
  const canSubmit = !emailValidationError;

  useEffect(() => {
    getLastEmailHint().then(saved => { if (saved) setEmailHint(maskEmail(saved)); });
  }, []);

  function handleEmailChange(t: string) {
    setEmail(t);
    setEmailTouched(true);
    setFormError(null);
    setNotFound(false);
  }

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setFormError(null);
    setNotFound(false);
    const normalizedEmail = normalizeEmail(email);
    try {
      await authApi.forgotPassword(normalizedEmail);
      void setLastEmailHint(normalizedEmail);
      navigation.replace('VerifyResetCode', { email: normalizedEmail });
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'USER_NOT_FOUND' || e.status === 404)) {
        setNotFound(true);
        setFormError(e.message || 'No account exists with this email.');
      } else if (e instanceof ApiError && (e.code === 'TOO_MANY_REQUESTS' || e.status === 429)) {
        setFormError(e.message || 'Too many attempts. Please wait a bit and try again.');
      } else {
        setFormError(e instanceof Error ? e.message : 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.backBtn, { top: insets.top + 12 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Back to login"
      >
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <View style={[styles.content, { paddingTop: insets.top + 48 }]}>
        <View style={styles.iconBadge}>
          <Text style={styles.iconGlyph}>✉️</Text>
        </View>

        <Text style={styles.heading}>Email</Text>
        <Text style={styles.sub}>
          Enter the email on your account — if it exists, we'll send a code to reset your password.
        </Text>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>ENTER EMAIL</Text>
          {emailHint && <Text style={styles.emailHint}>{emailHint}</Text>}
          <View style={[styles.inputBox, focused && styles.inputBoxFocused]}>
            <TextInput
              style={styles.input}
              placeholder="ahmad@example.com"
              placeholderTextColor={colors.placeholderText}
              value={email}
              onChangeText={handleEmailChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textAlign="center"
            />
          </View>
          {emailError && <Text style={styles.fieldError}>{emailError}</Text>}
        </View>

        {formError && <Text style={styles.error}>{formError}</Text>}

        <TouchableOpacity
          style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
        >
          {loading ? <LoadingRing size={20} color="#fff" /> : <Text style={styles.btnText}>Send code</Text>}
        </TouchableOpacity>

        {notFound && (
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={styles.backWrap}>
            <Text style={styles.back}>Create Account</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg, position: 'relative' },
  backBtn: {
    position: 'absolute', left: 16, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  backIcon: { fontSize: 20, color: colors.darkText, fontFamily: 'Nunito_700Bold' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 28 },
  iconBadge: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  iconGlyph: { fontSize: 34 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 26, color: colors.darkText, textAlign: 'center', marginBottom: 8 },
  sub: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.mutedText, lineHeight: 20, textAlign: 'center', marginBottom: 28 },
  fieldWrap: { width: '100%', marginBottom: 20 },
  fieldLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.midText, textAlign: 'center', letterSpacing: 0.4, marginBottom: 5 },
  emailHint: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.mutedText, textAlign: 'center', marginBottom: 8 },
  inputBox: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  inputBoxFocused: { borderColor: colors.primary, borderWidth: 2 },
  input: { fontFamily: 'Nunito_400Regular', fontSize: 15, color: colors.darkText },
  fieldError: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.red, marginTop: 4, textAlign: 'center' },
  error: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.red, marginBottom: 12, textAlign: 'center' },
  btn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginBottom: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
  backWrap: { alignItems: 'center' },
  back: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary },
});
