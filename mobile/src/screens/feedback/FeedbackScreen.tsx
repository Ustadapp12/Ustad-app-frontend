import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feedbackApi } from '../../api';
import { ApiError } from '../../api/client';
import { colors } from '../../theme/colors';
import { LoadingRing } from '../../components/LoadingSpinner';
import MascotShadow from '../../components/MascotShadow';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';

interface Props { navigation: RootNavProp }

const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RATINGS: { level: number; emoji: string; label: string }[] = [
  { level: 1, emoji: '😡', label: 'Awful' },
  { level: 2, emoji: '😕', label: 'Meh' },
  { level: 3, emoji: '😐', label: 'Okay' },
  { level: 4, emoji: '🙂', label: 'Good' },
  { level: 5, emoji: '😍', label: 'Love it' },
];

export default function FeedbackScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };

  const [rating, setRating] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const trimmedMessage = message.trim();
  const messageWordCount = trimmedMessage === '' ? 0 : trimmedMessage.split(/\s+/).length;
  const trimmedEmail = email.trim();
  const emailError = trimmedEmail !== '' && !EMAIL_FORMAT_RE.test(trimmedEmail)
    ? 'Enter a valid email address, or leave it blank.'
    : null;
  const canSubmit = messageWordCount > 2 && !emailError;

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      await feedbackApi.submit({
        message: trimmedMessage,
        rating: rating ?? undefined,
        name: name.trim() || undefined,
        email: trimmedEmail || undefined,
      });
      setSent(true);
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.sentWrap}>
          <View style={{ width: 110, height: 110, marginBottom: 18 }}>
            <Image
              source={require('../../../assets/images/lumo_xp.png')}
              style={{ width: 110, height: 110 }}
              resizeMode="contain"
            />
            <MascotShadow width={110} />
          </View>
          <Text style={styles.heading}>Thank you!</Text>
          <Text style={styles.sentBody}>
            Your feedback helps shape what we build next. We read every message.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>Done</Text>
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
        <Image source={require('../../../assets/back_arrow.png')} style={styles.backIcon} resizeMode="contain" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: 100, height: 100, marginBottom: 14 }}>
          <Image
            source={require('../../../assets/images/lumo_transparent.png')}
            style={{ width: 100, height: 100 }}
            resizeMode="contain"
          />
          <MascotShadow width={100} />
        </View>

        <Text style={styles.heading}>Send Feedback</Text>
        <Text style={styles.subheading}>Tell us what's working, what isn't, or what you'd love to see.</Text>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>HOW ARE WE DOING</Text>
          <View style={styles.ratingRow}>
            {RATINGS.map(r => {
              const active = rating === r.level;
              return (
                <TouchableOpacity
                  key={r.level}
                  style={[styles.ratingCell, active && styles.ratingCellActive]}
                  onPress={() => setRating(active ? null : r.level)}
                  activeOpacity={0.8}
                  accessibilityLabel={r.label}
                >
                  <Text style={styles.ratingEmoji}>{r.emoji}</Text>
                  <Text style={[styles.ratingLabel, active && styles.ratingLabelActive]}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>YOUR FEEDBACK</Text>
          <View style={[styles.inputBox, styles.messageBox]}>
            <TextInput
              style={[styles.input, styles.messageInput]}
              value={message}
              onChangeText={t => { setMessage(t); setError(null); }}
              placeholder="What's on your mind?"
              placeholderTextColor={colors.placeholderText}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />
          </View>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>NAME (OPTIONAL)</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ahmad Al-Rashid"
              placeholderTextColor={colors.placeholderText}
              autoComplete="name"
              maxLength={50}
            />
          </View>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>EMAIL (OPTIONAL)</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={t => { setEmail(t); setError(null); }}
              placeholder="you@example.com"
              placeholderTextColor={colors.placeholderText}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              maxLength={120}
            />
          </View>
          <Text style={styles.fieldHint}>Only if you'd like us to follow up with you.</Text>
          {emailError && <Text style={styles.fieldError}>{emailError}</Text>}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
        >
          {loading ? <LoadingRing size={20} color="#fff" /> : <Text style={styles.btnText}>Send Feedback</Text>}
        </TouchableOpacity>
        {!canSubmit && !loading && !emailError && (
          <Text style={styles.disabledHint}>Write at least 3 words to send your feedback.</Text>
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
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: colors.darkText, textAlign: 'center', marginBottom: 6 },
  subheading: {
    fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText,
    textAlign: 'center', lineHeight: 19, marginBottom: 16, paddingHorizontal: 8,
  },
  fieldWrap: { width: '100%', marginBottom: 13 },
  fieldLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.midText, letterSpacing: 0.4, marginBottom: 5 },
  fieldHint: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: colors.mutedText, marginTop: 4 },
  inputBox: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
  },
  messageBox: { paddingVertical: 9 },
  input: { fontFamily: 'Nunito_400Regular', fontSize: 15, color: colors.darkText },
  messageInput: { minHeight: 110 },
  fieldError: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.red, marginTop: 4 },
  error: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.red, marginBottom: 12, textAlign: 'center' },
  ratingRow: { flexDirection: 'row', gap: 5 },
  ratingCell: {
    flex: 1, alignItems: 'center', gap: 3, paddingVertical: 7,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
  },
  ratingCellActive: { borderColor: colors.primary, backgroundColor: '#F0FAF5' },
  ratingEmoji: { fontSize: 18 },
  ratingLabel: { fontFamily: 'Nunito_700Bold', fontSize: 9, color: colors.mutedText },
  ratingLabelActive: { color: colors.primary },
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
  sentWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  sentBody: {
    fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.mutedText,
    textAlign: 'center', lineHeight: 21, marginBottom: 26,
  },
});
