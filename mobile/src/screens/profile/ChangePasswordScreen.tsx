import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { LoadingRing } from '../../components/LoadingSpinner';
import BackButton from '../../components/BackButton';
import { maskEmail } from '../../utils/validators';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';
import { styles } from './ChangePasswordScreen.styles';
import { useAuthActions } from '../../hooks/api';

interface Props { navigation: RootNavProp }

// Entry point for changing the password of an already-logged-in account.
// Deliberately reuses the same OTP mechanic as forgot-password (same
// VerifyResetCode/ResetPassword screens, same /auth/forgot-password +
// /auth/reset-password endpoints, which take no auth token — only
// email/code) rather than a separate "enter current password" flow. The
// only difference from ForgotPasswordScreen is that the email is already
// known, so there's no email-entry step here.
export default function ChangePasswordScreen({ navigation }: Props) {
  const { requestPasswordReset } = useAuthActions();
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const email = useAuthStore(s => s.user?.email ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set only by the USER_NOT_FOUND branch below — that code from this
  // specific endpoint means "no password on file", not "no such account" (we
  // already know the account exists, its own email is on screen above). A
  // Google-only account has hashed_password IS NULL server-side, which is
  // exactly what that check rejects. Distinct from `error` so the UI can hide
  // the now-pointless Send code button instead of just relabeling the message.
  const [noPassword, setNoPassword] = useState(false);

  async function handleSendCode() {
    if (!email || loading) return;
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      navigation.replace('VerifyResetCode', { email });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'USER_NOT_FOUND') {
        setNoPassword(true);
      } else if (e instanceof ApiError && (e.code === 'TOO_MANY_REQUESTS' || e.status === 429)) {
        setError(e.message || 'Too many attempts. Please wait a bit and try again.');
      } else {
        setError(e instanceof Error ? e.message : 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BackButton onPress={() => navigation.goBack()} style={[styles.backBtn, { top: insets.top + 12 }]} />

      <View style={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom }]}>
        <View style={styles.iconBadge}>
          <Text style={styles.iconGlyph}>🔒</Text>
        </View>

        <Text style={styles.heading}>Change Password</Text>
        <Text style={styles.sub}>
          We'll send a 6-digit code to confirm it's you before you set a new password.
        </Text>

        {email ? (
          <View style={styles.emailBox}>
            <Text style={styles.emailLabel}>CODE WILL BE SENT TO</Text>
            <Text style={styles.emailValue}>{maskEmail(email)}</Text>
          </View>
        ) : (
          <Text style={styles.error}>
            Your account needs a verified email before you can change your password.
          </Text>
        )}

        {noPassword ? (
          <Text style={styles.sub}>
            You signed in with Google, so there's no password on this account to change. Manage your sign in through your Google account instead.
          </Text>
        ) : (
          <>
            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              style={[styles.btn, (!email || loading) && styles.btnDisabled]}
              onPress={handleSendCode}
              disabled={!email || loading}
            >
              {loading ? <LoadingRing size={20} color="#F5F7FA" /> : <Text style={styles.btnText}>Send code</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
