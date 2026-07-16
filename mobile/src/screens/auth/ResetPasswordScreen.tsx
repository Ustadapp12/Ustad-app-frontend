import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { authApi } from '../../api';
import { ApiError } from '../../api/client';
import { setTokens } from '../../utils/storage';
import { colors } from '../../theme/colors';
import PasswordInput from '../../components/PasswordInput';
import { LoadingRing } from '../../components/LoadingSpinner';
import type { RootNavProp, RootStackParamList } from '../../navigation/types';

interface Props {
  navigation: RootNavProp;
  route: RouteProp<RootStackParamList, 'ResetPassword'>;
}

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { email, code } = route.params;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = newPassword.length >= 8 && newPassword === confirmPassword;

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(email, code, newPassword);
      // Backend revokes all existing refresh tokens on a successful reset —
      // this device's old session is dead too, so clear it locally and force
      // a fresh login rather than trying to keep using it.
      await setTokens(null);
      setSuccess(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError(e.message || 'Too many attempts. Please wait a bit and try again.');
      } else if (e instanceof ApiError && e.status === 400) {
        setError('That code is no longer valid — please request a new one.');
      } else {
        setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <View style={styles.container}>
        <View style={[styles.content, styles.successContent, { paddingTop: insets.top + 24 }]}>
          <Image source={require('../../../assets/images/lumo_xp.png')} style={styles.lumaSuccess} resizeMode="contain" />
          <View style={styles.successBubble}>
            <Text style={styles.successBubbleText}>
              Congratulations! You've created a new password — log in again with it.
            </Text>
          </View>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.replace('Login')}>
            <Text style={styles.btnText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.backBtn, { top: insets.top + 12 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Back"
      >
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <View style={[styles.content, { paddingTop: insets.top + 24 }]}>
        <Image source={require('../../../assets/images/lumo_transparent.png')} style={styles.luma} resizeMode="contain" />

        <Text style={styles.heading}>Set a new password</Text>
        <Text style={styles.sub}>Almost done — choose a new password for your account.</Text>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
          <View style={styles.inputBox}>
            <PasswordInput
              value={newPassword}
              onChangeText={t => { setNewPassword(t); setError(null); }}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </View>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
          <View style={styles.inputBox}>
            <PasswordInput
              value={confirmPassword}
              onChangeText={t => { setConfirmPassword(t); setError(null); }}
              placeholder="Re-enter password"
              autoComplete="new-password"
            />
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
        >
          {loading ? <LoadingRing size={20} color="#fff" /> : <Text style={styles.btnText}>Reset password</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg, position: 'relative' },
  backBtn: {
    position: 'absolute', left: 16, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  backIcon: { fontSize: 20, color: colors.darkText, fontFamily: 'Nunito_700Bold' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 28 },
  successContent: { justifyContent: 'center' },
  luma: { width: 90, height: 90, marginBottom: 8 },
  lumaSuccess: { width: 140, height: 140, marginBottom: 20 },
  successBubble: {
    backgroundColor: colors.primaryBg, borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: 18, paddingHorizontal: 22, paddingVertical: 18, marginBottom: 32,
  },
  successBubbleText: {
    fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.darkText,
    textAlign: 'center', lineHeight: 23,
  },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 22, color: colors.darkText, textAlign: 'center', marginBottom: 8 },
  sub: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.mutedText, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  fieldWrap: { width: '100%', marginBottom: 16 },
  fieldLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.midText, marginBottom: 5, letterSpacing: 0.4 },
  inputBox: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  error: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.red, marginBottom: 12, textAlign: 'center' },
  btn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginTop: 8, marginBottom: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
});
