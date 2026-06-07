import React, { useState } from 'react';
import { TextInput, View, StyleSheet, Alert, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Logo } from '../../components/ui/Logo';
import { Mascot } from '../../components/ui/Mascot';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { copy } from '../../i18n/copy';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthLogin'>;

export function LoginScreen({ navigation }: Props) {
  const login = useAuthStore(s => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    try {
      await login(email.trim(), password.trim());
      navigation.replace('MainTabs');
    } catch (e) {
      Alert.alert('Login failed', e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <OnboardingLayout onBack={() => navigation.goBack()}>
      <View style={styles.hero}>
        <Mascot size={80} />
        <Logo />
        <AppText variant="h1" style={styles.title}>
          {copy.auth.loginTitle}
        </AppText>
      </View>
      <View style={styles.form}>
        <View style={styles.fields}>
          <AppText style={styles.label}>{copy.auth.email}</AppText>
          <TextInput
            style={[styles.input, styles.inputText, focused === 'email' && styles.inputFocused]}
            placeholder="you@email.com"
            placeholderTextColor={colors.grey}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            selectionColor={colors.primary}
          />
          <AppText style={styles.label}>{copy.auth.password}</AppText>
          <TextInput
            style={[styles.input, focused === 'pw' && styles.inputFocused, styles.inputText]}
            placeholder="••••••••"
            placeholderTextColor={colors.grey}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocused('pw')}
            onBlur={() => setFocused(null)}
            selectionColor={colors.primary}
          />
          <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
            <AppText style={styles.forgot}>{copy.auth.forgot}</AppText>
          </Pressable>
        </View>
        <PrimaryButton title={copy.auth.login} onPress={submit} loading={loading} />
        <PrimaryButton
          title={copy.auth.noAccount}
          variant="secondary"
          onPress={() => navigation.navigate('AuthRegister')}
          style={styles.gap}
        />
      </View>
    </OnboardingLayout>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: spacing.md, textAlign: 'center' },
  form: { paddingBottom: spacing.sm },
  fields: { marginBottom: spacing.lg },
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
  inputText: {
    color: colors.dark,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  forgot: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.md,
    textAlign: 'right',
  },
  gap: { marginTop: spacing.md },
});
