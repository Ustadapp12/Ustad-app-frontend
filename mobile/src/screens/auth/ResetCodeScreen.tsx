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
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetCode'>;

const OTP_LENGTH = 6;

export function ResetCodeScreen({ route, navigation }: Props) {
  const { email } = route.params;

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

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

  const submit = () => {
    if (!complete) return;
    // Pass email + code to NewPassword screen — no API call here
    navigation.navigate('NewPassword', { email, code });
  };

  const resend = async () => {
    setResending(true);
    try {
      await authApi.forgotPassword(email);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch { /* always show success */ }
    finally { setResending(false); }
  };

  return (
    <Screen style={styles.screen}>
      <IrabBackground color={colors.charcoal} opacityBase={0.09} />
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.content}>
        <IconBadge emoji="📬" size={88} style={styles.iconWrap} />

        <AppText variant="h1" style={styles.title}>Enter reset code</AppText>
        <AppText style={styles.sub}>
          We sent a 6-digit code to{'\n'}
          <AppText style={styles.emailHighlight}>{email}</AppText>
        </AppText>

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
              autoFocus={i === 0}
            />
          ))}
        </View>

        {/* Expiry reminder */}
        <View style={styles.expiryChip}>
          <AppText style={styles.expiryText}>⏱ Code expires in 15 minutes</AppText>
        </View>

        <PrimaryButton
          title="Continue →"
          onPress={submit}
          disabled={!complete}
          variant={complete ? 'primary' : 'disabled'}
          style={styles.cta}
        />

        <View style={styles.resendRow}>
          <AppText style={styles.resendHint}>
            {resent ? '✓ New code sent!' : "Didn't receive it?"}
          </AppText>
          <Pressable onPress={resend} disabled={resending}>
            <AppText style={styles.resendBtn}>
              {resending ? 'Sending…' : 'Resend code'}
            </AppText>
          </Pressable>
        </View>
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
  expiryChip: {
    backgroundColor: `${colors.yellow}18`,
    borderWidth: 1,
    borderColor: `${colors.yellow}50`,
    borderRadius: 99,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  expiryText: { fontSize: 12, fontWeight: '700', color: colors.yellow },
  cta: { width: '100%' },
  resendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  resendHint: { fontSize: 13, fontWeight: '600', color: colors.grey },
  resendBtn: { fontSize: 13, fontWeight: '900', color: colors.primary },
});
