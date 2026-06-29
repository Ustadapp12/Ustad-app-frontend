import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import type { RootNavProp } from '../../navigation/types';

interface Props { navigation: RootNavProp }

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const login = useAuthStore(s => s.login);
  const setDevUser = useAuthStore(s => s._devLogin);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    // Dev bypass: any email + password "expo" skips the API
    if (__DEV__ && password === 'expo') {
      setDevUser?.(email.trim());
      navigation.replace('MainTabs');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigation.replace('MainTabs');
    } catch (e: any) {
      Alert.alert('Login failed', e?.message ?? 'Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Luma */}
        <View style={styles.lumaWrap}>
          <Image source={require('../../../assets/images/lumo_transparent.png')} style={styles.luma} resizeMode="contain" />
        </View>

        <Text style={styles.heading}>Welcome back!</Text>
        <Text style={styles.sub}>Sign in to continue your Hifz journey</Text>

        {/* Email */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              style={styles.input}
              placeholder="ahmad@example.com"
              placeholderTextColor={colors.placeholderText}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="••••••••"
              placeholderTextColor={colors.placeholderText}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)}>
              <Text style={styles.showHide}>{showPass ? 'HIDE' : 'SHOW'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot */}
        <TouchableOpacity style={styles.forgotWrap}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </TouchableOpacity>

        {/* CTA */}
        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Log In</Text>}
        </TouchableOpacity>

        {/* Register link */}
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>New to Ustad? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.switchLink}>Create account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg },
  statusBar: { paddingHorizontal: 24, paddingBottom: 6, backgroundColor: colors.lightBg },
  time: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: colors.darkText },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  lumaWrap: { alignItems: 'center', paddingVertical: 20 },
  luma: { width: 110, height: 110 },
  heading: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: colors.darkText, textAlign: 'center', marginBottom: 4 },
  sub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', marginBottom: 24 },
  fieldWrap: { marginBottom: 13 },
  fieldLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: colors.midText, marginBottom: 5, letterSpacing: 0.4 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: colors.darkText },
  showHide: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: colors.placeholderText },
  forgotWrap: { alignItems: 'flex-end', marginBottom: 24 },
  forgot: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: colors.primary },
  btn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginBottom: 18,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: colors.white },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: colors.mutedText },
  switchLink: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: colors.primary },
});

