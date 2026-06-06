import React, { useRef, useState } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  Alert,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { EmojiText } from '../../components/ui/EmojiText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Logo } from '../../components/ui/Logo';
import { BackButton } from '../../components/ui/BackButton';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { GoogleIcon, AppleIcon, EyeIcon } from '../../components/ui/Icons';
import { Screen } from '../../components/ui/Screen';
import { copy } from '../../i18n/copy';
import { useAuthStore } from '../../store/authStore';
import { authApi, usersApi } from '../../api';
import { getOnboarding } from '../../utils/storage';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthRegister'>;

function pwStrength(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length === 0) return 0;
  if (pw.length < 8) return 1; // Risky — too short
  const hasUpper   = /[A-Z]/.test(pw);
  const hasDigit   = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = [hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  if (score >= 2) return 3; // Strong
  if (score >= 1) return 2; // Medium
  return 1;                 // Risky — all lowercase, no complexity
}

const STRENGTH_COLORS = ['transparent', colors.heart, colors.yellow, colors.primary];
const STRENGTH_LABELS = ['', 'Risky', 'Medium', '💪 Strong'];

export function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const register = useAuthStore(s => s.register);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const emailRef    = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const strength = pwStrength(password);
  const valid = displayName.length > 1 && email.includes('@') && password.length >= 8;

  const submit = async () => {
    setLoading(true);
    try {
      // 1. Register — stores tokens + fetches learning.me
      await register(email.trim(), password, displayName.trim() || undefined);

      // 2. Sync all onboarding answers to backend profile
      const onboarding = await getOnboarding();
      const profilePatch: Record<string, unknown> = {};
      if (displayName.trim()) profilePatch.display_name = displayName.trim();
      if (onboarding.script) profilePatch.script_preference = onboarding.script;
      if (onboarding.dailyGoalMinutes) profilePatch.daily_goal_minutes = onboarding.dailyGoalMinutes;
      if (onboarding.streakGoalDays) profilePatch.streak_goal_days = onboarding.streakGoalDays;
      if (onboarding.motivation) profilePatch.motivation = onboarding.motivation;
      if (onboarding.learnerMode) profilePatch.learner_mode = onboarding.learnerMode;
      try {
        await usersApi.updateProfile(profilePatch as Parameters<typeof usersApi.updateProfile>[0]);
      } catch { /* silently ignore — preferences saved locally */ }

      // 3. Trigger OTP email
      try {
        await authApi.resendVerification(email.trim());
      } catch { /* non-fatal */ }

      // 4. Go to OTP screen
      navigation.replace('VerifyEmail', { email: email.trim() });
    } catch (e) {
      Alert.alert('Sign up failed', e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <IrabBackground color={colors.charcoal} opacityBase={0.09} />
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.hero}>
            <Logo />
            <AppText style={styles.heroSub}>Create your account</AppText>
          </View>

          {/* Bonus chip */}
          <View style={styles.bonus}>
            <View style={styles.bonusIcon}>
              <EmojiText size={20}>⭐</EmojiText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.bonusTitle}>Sign-up bonus</AppText>
              <AppText style={styles.bonusSub}>
                Earn{' '}
                <AppText style={styles.bonusXp}>+50 XP</AppText>
                {' '}when you create your account!
              </AppText>
            </View>
          </View>

          {/* Social login stubs */}
          <View style={styles.socialRow}>
            <Pressable
              style={styles.socialBtn}
              onPress={() => Alert.alert('Coming soon', 'Google login is coming soon!')}>
              <GoogleIcon size={24} />
              <AppText style={styles.socialLabel}>Google</AppText>
            </Pressable>
            <Pressable
              style={styles.socialBtn}
              onPress={() => Alert.alert('Coming soon', 'Apple login is coming soon!')}>
              <AppleIcon size={24} color={colors.dark} />
              <AppText style={styles.socialLabel}>Apple</AppText>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <AppText style={styles.dividerText}>or with email</AppText>
            <View style={styles.dividerLine} />
          </View>

          {/* Name */}
          <View style={styles.fieldWrap}>
            <AppText style={[styles.label, focused === 'name' && styles.labelFocused]}>
              {copy.auth.displayName}
            </AppText>
            <TextInput
              style={[styles.input, styles.inputText, focused === 'name' && styles.inputFocused]}
              value={displayName}
              onChangeText={setDisplayName}
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused(null)}
              autoCapitalize="words"
              keyboardType="default"
              placeholder="Ahmad Al-Rashid"
              placeholderTextColor={`${colors.grey}80`}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <AppText style={[styles.label, focused === 'email' && styles.labelFocused]}>
              {copy.auth.email}
            </AppText>
            <TextInput
              ref={emailRef}
              style={[styles.input, styles.inputText, focused === 'email' && styles.inputFocused]}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="ahmad@email.com"
              placeholderTextColor={`${colors.grey}80`}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <AppText style={[styles.label, focused === 'pw' && styles.labelFocused]}>
              {copy.auth.password}
            </AppText>
            <View style={styles.pwWrap}>
              <TextInput
                ref={passwordRef}
                style={[styles.input, styles.inputText, styles.pwInput, focused === 'pw' && styles.inputFocused]}
                secureTextEntry={!showPw}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused('pw')}
                onBlur={() => setFocused(null)}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder="Min. 8 characters"
                placeholderTextColor={`${colors.grey}80`}
                returnKeyType="done"
                onSubmitEditing={valid ? submit : undefined}
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

          {/* Terms */}
          <AppText style={styles.terms}>
            By continuing you agree to our{' '}
            <AppText style={styles.termsLink} onPress={() => navigation.navigate('Terms')}>Terms</AppText>
            {' & '}
            <AppText style={styles.termsLink} onPress={() => navigation.navigate('Privacy')}>Privacy</AppText>
          </AppText>

          <PrimaryButton
            title="Create Account ✦"
            onPress={submit}
            loading={loading}
            disabled={!valid}
            variant={valid ? 'primary' : 'disabled'}
            style={styles.cta}
          />
          <Pressable onPress={() => navigation.navigate('AuthLogin')}>
            <AppText style={styles.switchLink}>
              Have an account?{' '}
              <AppText style={styles.switchLinkBold}>Sign in</AppText>
            </AppText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.ash },
  topBar: {
    paddingHorizontal: spacing.screenHorizontal,
    zIndex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  hero: { alignItems: 'center', marginBottom: spacing.md },
  heroSub: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.primary,
    marginTop: 4,
  },
  bonus: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: `${colors.dark}08`,
    borderWidth: 1.5,
    borderColor: `${colors.primary}30`,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  bonusIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusIconText: { fontSize: 16 },
  bonusTitle: { fontWeight: '900', fontSize: 12, color: colors.dark },
  bonusSub: { fontSize: 11, color: colors.charcoal, fontWeight: '600' },
  bonusXp: { color: colors.yellow, fontWeight: '900' },
  socialRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: `${colors.grey}35`,
  },
  socialIcon: { fontSize: 16, fontWeight: '900' },
  googleIcon: { color: '#4285F4', fontWeight: '900', fontSize: 18 },
  socialLabel: { fontWeight: '700', fontSize: 14, color: colors.dark },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: `${colors.grey}30` },
  dividerText: { fontSize: 12, fontWeight: '700', color: colors.grey },
  fieldWrap: { marginBottom: spacing.sm },
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
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
  },
  inputText: {
    color: colors.dark,
  },
  inputFocused: { borderColor: colors.primary },
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
  strengthLabel: { fontSize: 10, fontWeight: '800', marginLeft: 2, width: 56 },
  terms: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '600',
    color: colors.grey,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  termsLink: { color: colors.primary, fontWeight: '800' },
  cta: { marginBottom: spacing.sm },
  switchLink: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    paddingVertical: spacing.sm,
  },
  switchLinkBold: { color: colors.dark, fontWeight: '900' },
});
