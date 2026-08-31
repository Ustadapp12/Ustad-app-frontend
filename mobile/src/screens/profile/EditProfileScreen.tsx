import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usersApi } from '../../api';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { LoadingRing } from '../../components/LoadingSpinner';
import MascotShadow from '../../components/MascotShadow';
import { validateName } from '../../utils/validators';
import { characterSrcFor, GENDER_PREVIEW_SRCS } from '../../utils/avatar';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';

interface Props { navigation: RootNavProp }

type Gender = 'male' | 'female';

export default function EditProfileScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const { user, profile, updateDisplayName, updateProfileFields } = useAuthStore();

  const initialName = user?.name ?? '';
  const initialGender = profile?.gender ?? null;
  const initialAge = profile?.age ?? null;

  const [name, setName] = useState(initialName);
  const [gender, setGender] = useState<Gender | null>(initialGender);
  const [age, setAge] = useState(initialAge ? String(initialAge) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const nameError = validateName(name);
  const ageNum = age ? parseInt(age, 10) : null;
  const ageValid = age === '' || (Number.isFinite(ageNum) && ageNum! >= 1 && ageNum! <= 120);
  const hasChanges = trimmedName !== initialName || gender !== initialGender || ageNum !== initialAge;
  const canSubmit = !nameError && ageValid && hasChanges;

  // Save being disabled needs a reason on screen, not just a dimmed button —
  // an invalid name (nameError) was previously computed but never shown
  // anywhere, so the button just silently refused to submit with nothing to
  // tell the user why. Priority: a real validation error first, then "no
  // changes yet" only once the fields are actually all valid.
  const disabledReason = nameError ? nameError
    : !ageValid ? 'Age must be between 1 and 120.'
    : !hasChanges ? 'Make a change to save.'
    : null;

  const avatarSrc = characterSrcFor(user?.id ?? '', gender);

  async function handleSave() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      if (trimmedName !== initialName) {
        await usersApi.updateName(trimmedName);
        updateDisplayName(trimmedName);
      }
      if (gender && gender !== initialGender) {
        await usersApi.updateGender(gender);
        updateProfileFields({ gender });
      }
      if (ageNum && ageNum !== initialAge) {
        await usersApi.updateAge(ageNum);
        updateProfileFields({ age: ageNum });
      }
      navigation.goBack();
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.backBtn, { top: insets.top + 12 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Back"
      >
        <Image source={require('../../../assets/back_arrow.png')} style={styles.backIcon} resizeMode="contain" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: 90, height: 90, marginBottom: 18 }}>
          <Image source={avatarSrc} style={{ width: 90, height: 90 }} resizeMode="contain" />
          <MascotShadow width={90} />
        </View>

        <Text style={styles.heading}>Edit Profile</Text>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>WHAT SHOULD WE CALL YOU</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={t => { setName(t); setError(null); }}
              placeholder="Ahmad Al-Rashid"
              placeholderTextColor={colors.placeholderText}
              autoComplete="name"
              maxLength={50}
            />
          </View>
          {nameError && <Text style={styles.fieldError}>{nameError}</Text>}
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <View style={[styles.inputBox, styles.inputBoxDisabled]}>
            <Text style={styles.readOnlyValue}>{user?.email ?? 'No email on this account'}</Text>
          </View>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>GENDER</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[styles.genderCard, gender === 'female' && styles.genderCardActive]}
              onPress={() => setGender('female')}
              activeOpacity={0.85}
            >
              <Image source={GENDER_PREVIEW_SRCS.female} style={styles.genderCutout} resizeMode="contain" />
              <Text style={styles.genderLabel}>Female</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderCard, gender === 'male' && styles.genderCardActive]}
              onPress={() => setGender('male')}
              activeOpacity={0.85}
            >
              <Image source={GENDER_PREVIEW_SRCS.male} style={styles.genderCutout} resizeMode="contain" />
              <Text style={styles.genderLabel}>Male</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>AGE</Text>
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
          {age !== '' && !ageValid && <Text style={styles.fieldError}>Age must be between 1 and 120.</Text>}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
          onPress={handleSave}
          disabled={!canSubmit || loading}
        >
          {loading ? <LoadingRing size={20} color="#fff" /> : <Text style={styles.btnText}>Save changes</Text>}
        </TouchableOpacity>
        {!canSubmit && !loading && disabledReason && (
          <Text style={styles.disabledHint}>{disabledReason}</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg, position: 'relative' },
  backBtn: {
    position: 'absolute', left: 16, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  backIcon: { width: 20, height: 20, tintColor: colors.darkText },
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 28 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: colors.darkText, textAlign: 'center', marginBottom: 18 },
  fieldWrap: { width: '100%', marginBottom: 14 },
  fieldLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.midText, letterSpacing: 0.4, marginBottom: 5 },
  inputBox: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
  },
  inputBoxDisabled: { backgroundColor: colors.lightBg },
  input: { fontFamily: 'Nunito_400Regular', fontSize: 15, color: colors.darkText },
  readOnlyValue: { fontFamily: 'Nunito_400Regular', fontSize: 15, color: colors.mutedText },
  fieldError: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.red, marginTop: 4 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingVertical: 12,
  },
  genderCardActive: { borderColor: colors.primary, backgroundColor: '#F0FAF5' },
  genderCutout: { width: 44, height: 44 },
  genderLabel: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.darkText },
  error: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.red, marginBottom: 12, textAlign: 'center' },
  btn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginTop: 8,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
  disabledHint: {
    fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.mutedText,
    textAlign: 'center', marginTop: 8,
  },
});
