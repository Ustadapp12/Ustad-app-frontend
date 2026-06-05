import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { IconBadge } from '../../components/ui/IconBadge';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { BackButton } from '../../components/ui/BackButton';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { authApi } from '../../api';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

const OTP_LENGTH = 6;

export function VerifyEmailScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const refreshLearning = useAuthStore(s => s.refreshLearning);

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [xpEarned, setXpEarned] = useState<number | null>(null);

  const refs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

  const code = digits.join('');
  const complete = digits.every(d => d !== '');

  const handleDigit = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const verify = async () => {
    if (!complete || loading || xpEarned !== null) return;
    setLoading(true);
    try {
      const result = await authApi.verifyEmail(email, code);
      if (result.verified) {
        setXpEarned(result.xp_awarded);
        await refreshLearning({ force: true });
        setTimeout(() => navigation.replace('MainTabs'), 1000);
      }
    } catch (e) {
      const friendly =
        e instanceof ApiError && e.status >= 500
          ? 'Our server had a problem. Try again in a moment or use Skip for now.'
          : e instanceof Error
            ? e.message
            : 'Invalid or expired code';
      Alert.alert('Verification failed', friendly);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await authApi.resendVerification(email);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch { /* always succeeds */ }
    finally { setResending(false); }
  };

  return (
    <Screen style={styles.screen}>
      <IrabBackground color={colors.charcoal} opacityBase={0.09} />
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.content}>
        <IconBadge emoji="📧" size={88} style={styles.iconWrap} />
        <AppText variant="h1" style={styles.title}>Check your email</AppText>
        <AppText style={styles.sub}>
          We sent a 6-digit code to{'\n'}
          <AppText style={styles.emailHighlight}>{email}</AppText>
        </AppText>

        {xpEarned !== null && (
          <View style={styles.xpBanner}>
            <AppText style={styles.xpBannerText}>
              🏅 Email Verified! +{xpEarned} XP 🎉
            </AppText>
          </View>
        )}

        {/* 6-digit OTP */}
        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={el => { refs.current[i] = el; }}
              value={d}
              onChangeText={v => handleDigit(v, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              maxLength={1}
              keyboardType="number-pad"
              style={[styles.otpInput, d && styles.otpFilled]}
              selectionColor={colors.primary}
            />
          ))}
        </View>

        <PrimaryButton
          title={xpEarned !== null ? '✓ Verified — entering app…' : 'Verify & Continue ✦'}
          onPress={verify}
          loading={loading}
          disabled={!complete || loading || xpEarned !== null}
          variant={complete && !loading && xpEarned === null ? 'primary' : 'disabled'}
          style={styles.cta}
        />

        <View style={styles.resendRow}>
          <AppText style={styles.resendHint}>
            {resent ? '✓ Code resent!' : "Didn't receive it?"}
          </AppText>
          <Pressable onPress={resend} disabled={resending}>
            <AppText style={styles.resendBtn}>
              {resending ? 'Sending…' : 'Resend code'}
            </AppText>
          </Pressable>
        </View>

        <Pressable onPress={() => navigation.replace('MainTabs')} style={styles.skipBtn}>
          <AppText style={styles.skipText}>Skip for now →</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.ash },
  topBar: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    zIndex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.lg,
    zIndex: 1,
  },
  iconWrap: {
    backgroundColor: `${colors.primary}20`,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  title: { color: colors.dark, textAlign: 'center' },
  sub: {
    color: colors.charcoal,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  emailHighlight: { color: colors.primary, fontWeight: '900' },
  xpBanner: {
    backgroundColor: colors.dark,
    borderWidth: 2,
    borderColor: colors.yellow,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  xpBannerText: {
    color: colors.yellow,
    fontWeight: '900',
    fontSize: 13,
    textAlign: 'center',
  },
  otpRow: { flexDirection: 'row', gap: spacing.xs },
  otpInput: {
    width: 46,
    height: 58,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: `${colors.grey}40`,
    backgroundColor: colors.white,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
    color: colors.dark,
  },
  otpFilled: { borderColor: colors.primary },
  cta: { width: '100%' },
  resendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  resendHint: { fontSize: 13, fontWeight: '600', color: colors.grey },
  resendBtn: { fontSize: 13, fontWeight: '900', color: colors.primary },
  skipBtn: { paddingVertical: spacing.sm },
  skipText: { fontSize: 12, fontWeight: '700', color: colors.grey, textDecorationLine: 'underline' },
});
