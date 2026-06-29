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

export default function SignUpScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const register = useAuthStore(s => s.register);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim() && email.trim() && password.length >= 8 && agreedTerms;

  async function handleRegister() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, name.trim());
      navigation.replace('OnboardGoal');
    } catch (e: any) {
      Alert.alert('Registration failed', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.lumaWrap}>
          <Image source={require('../../../assets/images/lumo_transparent.png')} style={styles.luma} resizeMode="contain" />
        </View>

        <Text style={styles.heading}>Create account</Text>
        <Text style={styles.sub}>Start your free Hifz journey today</Text>

        {/* Full name */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>FULL NAME</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="Ahmad Al-Rashid"
              placeholderTextColor={colors.placeholderText}
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
          </View>
        </View>

        {/* Email */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <View style={styles.inputBox}>
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
          <View style={[styles.inputBox, { flexDirection: 'row', alignItems: 'center' }]}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Min 8 characters"
              placeholderTextColor={colors.placeholderText}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoComplete="new-password"
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)}>
              <Text style={styles.showHide}>{showPass ? 'HIDE' : 'SHOW'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Terms */}
        <TouchableOpacity style={styles.termsRow} onPress={() => setAgreedTerms(v => !v)}>
          <View style={[styles.checkbox, agreedTerms && styles.checkboxActive]}>
            {agreedTerms && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </TouchableOpacity>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={!canSubmit || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
        </TouchableOpacity>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.switchLink}>Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg },
  statusBar: { paddingHorizontal: 24, paddingBottom: 6 },
  time: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: colors.darkText },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  lumaWrap: { alignItems: 'center', paddingVertical: 14 },
  luma: { width: 90, height: 90 },
  heading: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, color: colors.darkText, textAlign: 'center', marginBottom: 4 },
  sub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', marginBottom: 20 },
  fieldWrap: { marginBottom: 11 },
  fieldLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: colors.midText, marginBottom: 5, letterSpacing: 0.4 },
  inputBox: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  input: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: colors.darkText },
  showHide: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: colors.placeholderText },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20, marginTop: 4 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: 'white', fontSize: 12, fontWeight: '700' },
  termsText: { flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: colors.mutedText, lineHeight: 20 },
  termsLink: { fontFamily: 'PlusJakartaSans_600SemiBold', color: colors.primary },
  btn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginBottom: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: colors.white },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: colors.mutedText },
  switchLink: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: colors.primary },
});

