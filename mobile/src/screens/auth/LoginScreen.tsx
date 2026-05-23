import React, { useState } from 'react';
import { TextInput, View, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
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

  const submit = async () => {
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigation.replace('MainTabs');
    } catch (e) {
      Alert.alert('Login failed', e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.form}>
        <AppText variant="h1">{copy.auth.loginTitle}</AppText>
        <TextInput
          style={styles.input}
          placeholder={copy.auth.email}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder={copy.auth.password}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <PrimaryButton title={copy.auth.login} onPress={submit} loading={loading} />
        <PrimaryButton
          title={copy.auth.noAccount}
          variant="secondary"
          onPress={() => navigation.navigate('AuthRegister')}
          style={styles.gap}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1, padding: spacing.screenHorizontal, paddingTop: spacing.xl },
  input: {
    borderWidth: 1,
    borderColor: colors.buttonSecondaryBg,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    fontSize: 16,
  },
  gap: { marginTop: spacing.md },
});
