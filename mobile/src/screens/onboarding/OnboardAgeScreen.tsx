import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';
import MascotShadow from '../../components/MascotShadow';
import BackButton from '../../components/BackButton';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';
import { styles } from './OnboardAgeScreen.styles';
import { MASCOT } from '../../assets';
import { useProfileActions } from '../../hooks/api';

interface Props { navigation: RootNavProp }

export default function OnboardAgeScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const { saveAge } = useProfileActions();
  const isApple = useAuthStore(s => s.user?.provider === 'apple');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ageNum = parseInt(age, 10);
  const canSubmit = age.length > 0 && Number.isFinite(ageNum) && ageNum >= 1 && ageNum <= 120;

  async function handleContinue() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      await saveAge(ageNum);
      navigation.navigate('OnboardGender');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'INVALID_AGE') setError(e.message);
      else setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.headerRow}>
        {/* Apple accounts never see the name screen (App Review guideline 4),
            so there is nothing to go back to: an empty slot keeps the dots put. */}
        {isApple
          ? <View style={styles.backBtn} />
          : <BackButton onPress={() => navigation.navigate('OnboardUsername')} style={styles.backBtn} size={18} />}
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={{ width: 120, height: 120, marginBottom: 10 }}>
          <Image source={MASCOT.lumoTransparent} style={[styles.luma, { marginBottom: 0 }]} resizeMode="contain" />
          <MascotShadow width={120} />
        </View>
        <Text style={styles.badge}>GETTING TO KNOW YOU</Text>
        <Text style={styles.heading}>What is your age?</Text>
        <Text style={styles.sub}>This helps us tailor lessons to you</Text>

        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={t => { setAge(t.replace(/[^0-9]/g, '').slice(0, 3)); setError(null); }}
            keyboardType="number-pad"
            placeholder="Enter your age"
            placeholderTextColor={colors.placeholderText}
            maxLength={3}
          />
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!canSubmit || loading}
        >
          <Text style={styles.btnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
