import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '../../api/client';
import { colors } from '../../theme';
import { LoadingRing } from '../../components/LoadingSpinner';
import type { RootNavProp } from '../../navigation/types';
import { validateEmail, normalizeEmail, maskEmail } from '../../utils/validators';
import { getLastEmailHint, setLastEmailHint } from '../../utils/storage';
import { safeBottomInset } from '../../utils/responsive';
import BackButton from '../../components/BackButton';
import { styles } from './ForgotPasswordScreen.styles';
import { useAuthActions } from '../../hooks/api';

interface Props { navigation: RootNavProp }

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { requestPasswordReset } = useAuthActions();
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
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
      await requestPasswordReset(normalizedEmail);
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
      <BackButton
        onPress={() => navigation.goBack()}
        style={[styles.backBtn, { top: insets.top + 12 }]}
        accessibilityLabel="Back to login"
      />

      <View style={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom }]}>
        <View style={styles.iconBadge}>
          <Text style={styles.iconGlyph}>✉️</Text>
        </View>

        <Text style={styles.heading}>Email</Text>
        <Text style={styles.sub}>
          Enter the email on your account. You'll get an email with a code if it exists.
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
              // Android miscalculates the caret position on centered
              // TextInputs, rendering it well past the actual typed text —
              // pinning selection explicitly to the real text end keeps it
              // tracking what's actually typed instead of drifting.
              selection={{ start: email.length, end: email.length }}
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
          {loading ? <LoadingRing size={20} color="#F5F7FA" /> : <Text style={styles.btnText}>Send code</Text>}
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
