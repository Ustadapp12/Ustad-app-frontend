import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { IconBadge } from '../../components/ui/IconBadge';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { BackButton } from '../../components/ui/BackButton';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { EyeIcon } from '../../components/ui/Icons';
import { authApi } from '../../api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'NewPassword'>;

function pwStrength(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length === 0) return 0;
  if (pw.length < 4) return 1;
  if (pw.length < 8) return 2;
  return 3;
}

const STRENGTH_COLORS = ['transparent', colors.heart, colors.yellow, colors.primary];
const STRENGTH_LABELS = ['', 'Too short', 'Good', '💪 Strong'];

export function NewPasswordScreen({ route, navigation }: Props) {
  const { email, code } = route.params;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const strength = pwStrength(password);
  const passwordsMatch = password === confirm && confirm.length > 0;
  const valid = password.length >= 8 && passwordsMatch;

  const submit = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      await authApi.resetPassword(email, code, password);
      // All refresh tokens revoked on backend — navigate to login with success toast
      navigation.navigate('AuthLogin');
      // Brief delay so login screen is visible before alert
      setTimeout(() => {
        Alert.alert(
          'Password updated! ✓',
          'Sign in with your new password.',
          [{ text: 'OK' }],
        );
      }, 300);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Code invalid or expired';
      Alert.alert('Reset failed', msg, [
        { text: 'Try again', style: 'cancel' },
        {
          text: 'Request new code',
          onPress: () => navigation.navigate('ForgotPassword'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <IrabBackground color={colors.charcoal} opacityBase={0.09} />
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.content}>
        <IconBadge emoji="🔑" size={88} style={styles.iconWrap} />

        <AppText variant="h1" style={styles.title}>Set new password</AppText>
        <AppText style={styles.sub}>
          Choose a strong password with at least 8 characters.
        </AppText>

        {/* New password */}
        <View style={styles.fieldWrap}>
          <AppText style={[styles.label, focused === 'pw' && styles.labelFocused]}>
            NEW PASSWORD
          </AppText>
          <View style={styles.pwWrap}>
            <TextInput
              style={[
                styles.input,
                styles.pwInput,
                focused === 'pw' && styles.inputFocused,
              ]}
              secureTextEntry={!showPw}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused('pw')}
              onBlur={() => setFocused(null)}
              placeholder="Min. 8 characters"
              placeholderTextColor={`${colors.grey}80`}
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowPw(v => !v)}>
              <EyeIcon open={showPw} size={20} color={colors.grey} />
            </Pressable>
          </View>
          {password.length > 0 && (
            <View style={styles.strengthRow}>
              {[1, 2, 3].map(i => (
                <View
                  key={i}
                  style={[
                    styles.strengthSeg,
                    { backgroundColor: strength >= i ? STRENGTH_COLORS[strength] : `${colors.grey}30` },
                  ]}
                />
              ))}
              <AppText style={[styles.strengthLabel, { color: STRENGTH_COLORS[strength] }]}>
                {STRENGTH_LABELS[strength]}
              </AppText>
            </View>
          )}
        </View>

        {/* Confirm password */}
        <View style={styles.fieldWrap}>
          <AppText style={[styles.label, focused === 'confirm' && styles.labelFocused]}>
            CONFIRM PASSWORD
          </AppText>
          <View style={styles.pwWrap}>
            <TextInput
              style={[
                styles.input,
                styles.pwInput,
                focused === 'confirm' && styles.inputFocused,
                confirm.length > 0 && !passwordsMatch && styles.inputError,
              ]}
              secureTextEntry={!showConfirm}
              value={confirm}
              onChangeText={setConfirm}
              onFocus={() => setFocused('confirm')}
              onBlur={() => setFocused(null)}
              placeholder="Repeat password"
              placeholderTextColor={`${colors.grey}80`}
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
              <EyeIcon open={showConfirm} size={20} color={colors.grey} />
            </Pressable>
          </View>
          {confirm.length > 0 && (
            <AppText style={[styles.matchLabel, passwordsMatch && styles.matchLabelOk]}>
              {passwordsMatch ? '✓ Passwords match' : 'Passwords do not match'}
            </AppText>
          )}
        </View>

        <PrimaryButton
          title="Update Password ✦"
          onPress={submit}
          loading={loading}
          disabled={!valid}
          variant={valid ? 'primary' : 'disabled'}
          style={styles.cta}
        />
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
    gap: spacing.md,
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
    marginBottom: spacing.xs,
  },
  fieldWrap: { width: '100%' },
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.charcoal,
    marginBottom: 4,
  },
  labelFocused: { color: colors.primary },
  input: {
    borderWidth: 2,
    borderColor: `${colors.grey}35`,
    borderRadius: 14,
    padding: spacing.md,
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: colors.white,
    color: colors.dark,
    width: '100%',
  },
  inputFocused: { borderColor: colors.primary },
  inputError: { borderColor: colors.heart },
  pwWrap: { position: 'relative' },
  pwInput: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: { fontSize: 18 },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 6,
  },
  strengthSeg: { flex: 1, height: 6, borderRadius: 99 },
  strengthLabel: { fontSize: 10, fontWeight: '800', marginLeft: 2, width: 64 },
  matchLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.heart,
    marginTop: 4,
  },
  matchLabelOk: { color: colors.primary },
  cta: { width: '100%', marginTop: spacing.xs },
});
