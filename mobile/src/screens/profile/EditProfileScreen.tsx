import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';
import { LoadingRing } from '../../components/LoadingSpinner';
import MascotShadow from '../../components/MascotShadow';
import BackButton from '../../components/BackButton';
import { validateName } from '../../utils/validators';
import { characterSrcFor, currentAvatarVariantIndex, GENDER_PREVIEW_SRCS } from '../../utils/avatar';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';
import { selectUserId, selectUserEmail, selectUserName, selectAge, selectGender, selectAvatarVariant } from '../../store/selectors/auth';
import { styles } from './EditProfileScreen.styles';
import { useProfileActions } from '../../hooks/api';

interface Props { navigation: RootNavProp }

type Gender = 'male' | 'female';

export default function EditProfileScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  // Exact values only (store/selectors/auth.ts), never the whole store.
  const userId = useAuthStore(selectUserId);
  const userEmail = useAuthStore(selectUserEmail);
  const userName = useAuthStore(selectUserName);
  const profileAge = useAuthStore(selectAge);
  const profileGender = useAuthStore(selectGender);
  const profileAvatarVariant = useAuthStore(selectAvatarVariant);
  const { saveName, saveGender, saveAge, saveAvatarVariant } = useProfileActions();

  const initialName = userName ?? '';
  const initialGender = profileGender ?? null;
  const initialAge = profileAge ?? null;

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

  // Same gender as saved: their saved pick. Gender switched: the saved pick
  // indexes the other gender's folder, so preview (and, on save, grant) the
  // stable hash pick from the new gender's pool instead.
  const genderChanged = !!gender && gender !== initialGender;
  const regrantedVariant = gender ? currentAvatarVariantIndex(userId ?? '', null, gender) : null;
  const avatarSrc = characterSrcFor(userId ?? '', gender, genderChanged ? regrantedVariant : profileAvatarVariant);

  async function handleSave() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      if (trimmedName !== initialName) {
        await saveName(trimmedName);
      }
      if (gender && gender !== initialGender) {
        await saveGender(gender);
        if (regrantedVariant != null) {
          await saveAvatarVariant(regrantedVariant);
        }
      }
      if (ageNum && ageNum !== initialAge) {
        await saveAge(ageNum);
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
      <BackButton onPress={() => navigation.goBack()} style={[styles.backBtn, { top: insets.top + 12 }]} />

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
            <Text style={styles.readOnlyValue}>{userEmail ?? 'No email on this account'}</Text>
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
          {loading ? <LoadingRing size={20} color="#F5F7FA" /> : <Text style={styles.btnText}>Save changes</Text>}
        </TouchableOpacity>
        {!canSubmit && !loading && disabledReason && (
          <Text style={styles.disabledHint}>{disabledReason}</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
