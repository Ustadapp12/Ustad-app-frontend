import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { authApi } from '../../api';
import { ApiError } from '../../api/client';
import { colors } from '../../theme/colors';
import { maskEmail } from '../../utils/validators';
import { LoadingRing } from '../../components/LoadingSpinner';
import type { RootNavProp, RootStackParamList } from '../../navigation/types';

interface Props {
  navigation: RootNavProp;
  route: RouteProp<RootStackParamList, 'VerifyResetCode'>;
}

// A code was just sent (ForgotPasswordScreen already called forgotPassword),
// so the backend's own resend cooldown (pwd_reset_resend_cooldown_seconds,
// 30s) is already ticking the moment this screen appears.
const DEFAULT_RESEND_COOLDOWN_S = 30;

export default function VerifyResetCodeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { email } = route.params;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(DEFAULT_RESEND_COOLDOWN_S);
  const [resending, setResending] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown(seconds: number) {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    setCooldown(seconds);
    cooldownTimer.current = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    startCooldown(DEFAULT_RESEND_COOLDOWN_S);
    return () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); };
  }, []);

  async function handleConfirm() {
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.verifyResetCode(email, code);
      if (res.valid) {
        navigation.replace('ResetPassword', { email, code });
      } else {
        setError('Invalid or expired code.');
        setCode('');
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError(e.message || 'Too many attempts. Please wait a bit and try again.');
      } else if (e instanceof ApiError && (e.code === 'USER_NOT_FOUND' || e.status === 404)) {
        setError(e.message || 'No account exists with this email.');
      } else if (e instanceof ApiError && e.status === 400) {
        setError(e.message || 'Invalid or expired code.');
        setCode('');
      } else {
        setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      const res = await authApi.forgotPassword(email);
      startCooldown(res.retry_after_seconds && res.retry_after_seconds > 0 ? res.retry_after_seconds : DEFAULT_RESEND_COOLDOWN_S);
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError(e.message || 'Too many attempts. Please wait a bit and try again.');
      }
      startCooldown(DEFAULT_RESEND_COOLDOWN_S);
    } finally {
      setResending(false);
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
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <View style={[styles.content, { paddingTop: insets.top + 24 }]}>
        <Image source={require('../../../assets/images/lumo_transparent.png')} style={styles.luma} resizeMode="contain" />

        <Text style={styles.heading}>Enter your code</Text>
        <Text style={styles.sub}>Check {maskEmail(email)} for the 6-digit code we sent.</Text>

        <View style={styles.inputBox}>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={t => { setCode(t.replace(/[^0-9]/g, '').slice(0, 6)); setError(null); }}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={colors.placeholderText}
            textAlign="center"
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, (code.length !== 6 || loading) && styles.btnDisabled]}
          onPress={handleConfirm}
          disabled={code.length !== 6 || loading}
        >
          {loading ? <LoadingRing size={20} color="#fff" /> : <Text style={styles.btnText}>Confirm</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={cooldown > 0 || resending} style={styles.resendWrap}>
          <Text style={[styles.resend, (cooldown > 0 || resending) && styles.resendDisabled]}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </Text>
        </TouchableOpacity>
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
  luma: { width: 100, height: 100, marginBottom: 8 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: colors.darkText, textAlign: 'center', marginBottom: 6 },
  sub: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.mutedText, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  inputBox: {
    width: '100%', backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingVertical: 16, marginBottom: 12,
  },
  codeInput: { fontFamily: 'Nunito_700Bold', fontSize: 28, color: colors.darkText, letterSpacing: 12 },
  error: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.red, textAlign: 'center', marginBottom: 12 },
  btn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginTop: 8, marginBottom: 20,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
  resendWrap: { marginBottom: 24 },
  resend: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.primary },
  resendDisabled: { color: colors.mutedText },
});
