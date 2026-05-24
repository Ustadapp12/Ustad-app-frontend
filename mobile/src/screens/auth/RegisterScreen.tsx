import React, { useState } from 'react';
import { TextInput, View, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Logo } from '../../components/ui/Logo';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { copy } from '../../i18n/copy';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthRegister'>;

export function RegisterScreen({ navigation }: Props) {
  const register = useAuthStore(s => s.register);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim() || undefined);
      navigation.replace('MainTabs');
    } catch (e) {
      Alert.alert('Sign up failed', e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const valid =
    displayName.length > 1 && email.includes('@') && password.length >= 6;

  return (
    <OnboardingLayout onBack={() => navigation.goBack()}>
      <View style={styles.hero}>
        <Logo />
        <AppText variant="h1" style={styles.title}>
          {copy.auth.registerTitle}
        </AppText>
      </View>
      <View style={styles.bonus}>
        <AppText style={styles.bonusIcon}>⭐</AppText>
        <View>
          <AppText style={styles.bonusTitle}>Sign-up bonus</AppText>
          <AppText style={styles.bonusSub}>
            Earn +50 XP when you create your account!
          </AppText>
        </View>
      </View>
      {(
        [
          { key: 'name', label: copy.auth.displayName, value: displayName, set: setDisplayName },
          { key: 'email', label: copy.auth.email, value: email, set: setEmail },
        ] as const
      ).map(f => (
        <View key={f.key}>
          <AppText style={styles.label}>{f.label}</AppText>
          <TextInput
            style={[styles.input, focused === f.key && styles.inputFocused]}
            value={f.value}
            onChangeText={f.set}
            onFocus={() => setFocused(f.key)}
            onBlur={() => setFocused(null)}
            autoCapitalize={f.key === 'email' ? 'none' : 'words'}
            keyboardType={f.key === 'email' ? 'email-address' : 'default'}
          />
        </View>
      ))}
      <AppText style={styles.label}>{copy.auth.password}</AppText>
      <TextInput
        style={[styles.input, focused === 'pw' && styles.inputFocused]}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        onFocus={() => setFocused('pw')}
        onBlur={() => setFocused(null)}
        placeholder="Min. 6 characters"
      />
      <PrimaryButton
        title={copy.auth.register}
        onPress={submit}
        loading={loading}
        disabled={!valid}
        variant={valid ? 'primary' : 'disabled'}
        style={styles.cta}
      />
      <PrimaryButton
        title={copy.auth.hasAccount}
        variant="secondary"
        onPress={() => navigation.navigate('AuthLogin')}
      />
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: spacing.md },
  title: { marginTop: spacing.sm, textAlign: 'center' },
  bonus: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1.5,
    borderColor: `${colors.primary}30`,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  bonusIcon: { fontSize: 20 },
  bonusTitle: { fontWeight: '900', fontSize: 13, color: colors.dark },
  bonusSub: { fontSize: 11, color: colors.charcoal, fontWeight: '600' },
  bonusXp: { color: colors.yellow, fontWeight: '900' },
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.charcoal,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 2,
    borderColor: `${colors.grey}35`,
    borderRadius: 14,
    padding: spacing.md,
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: colors.white,
  },
  inputFocused: { borderColor: colors.primary },
  cta: { marginTop: spacing.lg, marginBottom: spacing.sm },
});
