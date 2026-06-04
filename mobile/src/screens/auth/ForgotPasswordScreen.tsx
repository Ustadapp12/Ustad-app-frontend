import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const valid = email.includes('@') && email.includes('.');

  const submit = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      // Always succeeds — never reveals if email exists
      navigation.navigate('ResetCode', { email: email.trim() });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong');
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.content, { flexGrow: 1 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Icon */}
        <IconBadge emoji="🔐" size={80} style={styles.iconWrap} />

        <AppText variant="h1" style={styles.title}>Forgot password?</AppText>
        <AppText style={styles.sub}>
          Enter your email and we'll send you a 6-digit reset code.
        </AppText>

        {/* Email field */}
        <View style={styles.fieldWrap}>
          <AppText style={[styles.label, focused && styles.labelFocused]}>
            EMAIL ADDRESS
          </AppText>
          <TextInput
            style={[styles.input, focused && styles.inputFocused]}
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@email.com"
            placeholderTextColor={`${colors.grey}80`}
            autoFocus
          />
        </View>

        <PrimaryButton
          title="Send Reset Code"
          onPress={submit}
          loading={loading}
          disabled={!valid}
          variant={valid ? 'primary' : 'disabled'}
          style={styles.cta}
        />

        <AppText style={styles.hint}>
          Code expires in 15 minutes.{'\n'}
          Check your spam folder if you don't see it.
        </AppText>
      </ScrollView>
      </KeyboardAvoidingView>
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
    paddingVertical: spacing.xl,
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
  },
  fieldWrap: { width: '100%' },
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
    color: colors.dark,
    width: '100%',
  },
  inputFocused: { borderColor: colors.primary },
  cta: { width: '100%' },
  hint: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.grey,
    textAlign: 'center',
    lineHeight: 19,
  },
});
