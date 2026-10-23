import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { ApiError } from '../../api/client';
import { setTokens } from '../../utils/storage';
import { getPasswordChecklist, getPasswordStrength, isPasswordValid } from '../../utils/validators';
import BackButton from '../../components/BackButton';
import PasswordInput from '../../components/PasswordInput';
import MascotShadow from '../../components/MascotShadow';
import { LoadingRing } from '../../components/LoadingSpinner';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp, RootStackParamList } from '../../navigation/types';
import { styles } from './ResetPasswordScreen.styles';
import { MASCOT } from '../../assets';
import { useAuthActions } from '../../hooks/api';

interface Props {
  navigation: RootNavProp;
  route: RouteProp<RootStackParamList, 'ResetPassword'>;
}

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { resetPassword } = useAuthActions();
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const { email, code } = route.params;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const checklist = getPasswordChecklist(newPassword);
  const strength = getPasswordStrength(checklist);
  const canSubmit = isPasswordValid(newPassword) && newPassword === confirmPassword;

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      await resetPassword(email, code, newPassword);
      // Backend revokes all existing refresh tokens on a successful reset —
      // this device's old session is dead too, so clear it locally and force
      // a fresh login rather than trying to keep using it.
      await setTokens(null);
      setSuccess(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError(e.message || 'Too many attempts. Please wait a bit and try again.');
      } else if (e instanceof ApiError && e.status === 400) {
        setError('That code is no longer valid, please request a new one.');
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
        <View style={[styles.content, styles.successContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom }]}>
          <View style={{ width: 140, height: 140, marginBottom: 20 }}>
            <Image source={MASCOT.lumoXp} style={[styles.lumaSuccess, { marginBottom: 0 }]} resizeMode="contain" />
            <MascotShadow width={140} />
          </View>
          <View style={styles.successBubble}>
            <Text style={styles.successBubbleText}>
              Congratulations! You've created a new password, log in again with it.
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
      <BackButton onPress={() => navigation.goBack()} style={[styles.backBtn, { top: insets.top + 12 }]} />

      <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom }]}>
        <View style={{ width: 110, height: 110, marginBottom: 8 }}>
          <Image source={MASCOT.lumoTransparent} style={[styles.luma, { marginBottom: 0 }]} resizeMode="contain" />
          <MascotShadow width={110} />
        </View>

        <Text style={styles.heading}>Set a new password</Text>
        <Text style={styles.sub}>Almost done: choose a new password for your account.</Text>

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
          {newPassword.length > 0 && (
            <View style={styles.checklistWrap}>
              <Text style={[styles.checklistItem, checklist.minLength ? styles.checklistMet : styles.checklistUnmet]}>
                {checklist.minLength ? '✓' : '✗'} At least 8 characters
              </Text>
              <Text style={[styles.checklistItem, checklist.uppercase ? styles.checklistMet : styles.checklistUnmet]}>
                {checklist.uppercase ? '✓' : '✗'} One uppercase letter
              </Text>
              <Text style={[styles.checklistItem, checklist.lowercase ? styles.checklistMet : styles.checklistUnmet]}>
                {checklist.lowercase ? '✓' : '✗'} One lowercase letter
              </Text>
              <Text style={[styles.checklistItem, checklist.number ? styles.checklistMet : styles.checklistUnmet]}>
                {checklist.number ? '✓' : '✗'} One number
              </Text>
              <Text style={[styles.checklistItem, checklist.special ? styles.checklistMet : styles.checklistUnmet]}>
                {checklist.special ? '✓' : '✗'} One special character
              </Text>
              <Text
                style={[
                  styles.strengthText,
                  strength === 'Weak' && styles.strengthWeak,
                  strength === 'Medium' && styles.strengthMedium,
                  strength === 'Strong' && styles.strengthStrong,
                ]}
              >
                Strength: {strength}
              </Text>
            </View>
          )}
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
          {loading ? <LoadingRing size={20} color="#F5F7FA" /> : <Text style={styles.btnText}>Reset password</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
