import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../../api';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { LoadingRing } from '../../components/LoadingSpinner';
import { maskEmail } from '../../utils/validators';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';

interface Props { navigation: RootNavProp }

// Entry point for changing the password of an already-logged-in account.
// Deliberately reuses the same OTP mechanic as forgot-password (same
// VerifyResetCode/ResetPassword screens, same /auth/forgot-password +
// /auth/reset-password endpoints, which take no auth token — only
// email/code) rather than a separate "enter current password" flow. The
// only difference from ForgotPasswordScreen is that the email is already
// known, so there's no email-entry step here.
export default function ChangePasswordScreen({ navigation }: Props) {
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
      await authApi.forgotPassword(email);
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
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.backBtn, { top: insets.top + 12 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Back"
      >
        <Image source={require('../../../assets/back_arrow.png')} style={styles.backIcon} resizeMode="contain" />
      </TouchableOpacity>

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
              {loading ? <LoadingRing size={20} color="#fff" /> : <Text style={styles.btnText}>Send code</Text>}
            </TouchableOpacity>
          </>
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
  backIcon: { width: 20, height: 20, tintColor: colors.darkText },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 28 },
  iconBadge: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  iconGlyph: { fontSize: 34 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 26, color: colors.darkText, textAlign: 'center', marginBottom: 8 },
  sub: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.mutedText, lineHeight: 20, textAlign: 'center', marginBottom: 28 },
  emailBox: {
    width: '100%', backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 20,
  },
  emailLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.midText, letterSpacing: 0.4, marginBottom: 5 },
  emailValue: { fontFamily: 'Nunito_400Regular', fontSize: 15, color: colors.darkText },
  error: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.red, marginBottom: 12, textAlign: 'center' },
  btn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginBottom: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
});
