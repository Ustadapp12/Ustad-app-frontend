import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Animated, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { ApiError } from '../../api/client';
import { colors } from '../../theme';
import { LoadingRing } from '../../components/LoadingSpinner';
import MascotShadow from '../../components/MascotShadow';
import { playFeedbackSound, preloadFeedbackSounds } from '../../services/audioPlayer';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp, RootStackParamList } from '../../navigation/types';
import { styles } from './VerifyEmailScreen.styles';
import { MASCOT } from '../../assets';
import { useAuthActions } from '../../hooks/api';

interface Props {
  navigation: RootNavProp;
  route: RouteProp<RootStackParamList, 'VerifyEmail'>;
}

const RESEND_COOLDOWN_S = 45;

export default function VerifyEmailScreen({ navigation, route }: Props) {
  const { fetchOwnEmail, verifyEmail, resendVerification } = useAuthActions();
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const storeUser = useAuthStore(s => s.user);
  const completeEmailVerification = useAuthStore(s => s.completeEmailVerification);
  const logout = useAuthStore(s => s.logout);

  const [email, setEmail] = useState(route.params?.email ?? storeUser?.email ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebXp, setCelebXp] = useState(0);
  const lumaScaleAnim = useRef(new Animated.Value(0)).current;

  // Reached via the global 403 safety net (api/client.ts) with no email in
  // hand — /auth/me is gate-exempt, safe to call even while unverified.
  useEffect(() => {
    if (email) return;
    // `email` is null only for a guest, who can never reach this screen —
    // claiming the account sets it before we navigate here.
    void fetchOwnEmail().then(setEmail);
  }, [email, fetchOwnEmail]);

  useEffect(() => () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); }, []);

  // The "verified" celebration dings; load the chime while the user types the
  // code, since it is no longer loaded at app start.
  useEffect(() => { preloadFeedbackSounds(); }, []);

  useEffect(() => {
    if (showCelebration) {
      lumaScaleAnim.setValue(0);
      Animated.spring(lumaScaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6, delay: 200 }).start();
    }
  }, [showCelebration, lumaScaleAnim]);

  function startCooldown() {
    // Never two timers ticking the same countdown (review 5.2). Same guard as
    // VerifyResetCodeScreen.
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    setCooldown(RESEND_COOLDOWN_S);
    cooldownTimer.current = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function handleVerify() {
    if (code.length !== 6 || loading || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await verifyEmail(email, code);
      await completeEmailVerification();
      if (res.xp_awarded > 0) {
        setCelebXp(res.xp_awarded);
        setShowCelebration(true);
        playFeedbackSound(true);
      } else {
        navigation.replace('OnboardUsername');
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError('Too many attempts. Request a new code.');
      } else if (e instanceof ApiError && e.status === 400) {
        setError('Invalid or expired code.');
        setCode('');
      } else {
        setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  async function handleResend() {
    if (cooldown > 0 || !email) return;
    setCode('');
    setError(null);
    startCooldown(); // starts regardless of the response — backend rate-limits silently (always returns sent:true)
    try {
      await resendVerification(email);
    } catch {
      // ignore — nothing meaningful to show the user here
    }
  }

  async function handleSignOut() {
    await logout();
    navigation.replace('Login');
  }

  return (
    <>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity
        onPress={handleSignOut}
        style={[styles.closeBtn, { top: insets.top + 12 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Close and sign out"
      >
        <Text style={styles.closeIcon}>✕</Text>
      </TouchableOpacity>
      <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom }]}>
        <View style={styles.mascotBox}>
          <Image source={MASCOT.lumoTransparent} style={[styles.luma, styles.mascotImgFlush]} resizeMode="contain" />
          <MascotShadow width={130} />
        </View>

        <Text style={styles.heading}>Verify your email</Text>
        <Text style={styles.sub}>
          {email ? `We sent a 6-digit code to ${email}` : 'We sent you a 6-digit code'}
        </Text>

        <View style={styles.inputBox}>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={t => { setCode(t.replace(/[^0-9]/g, '').slice(0, 6)); setError(null); }}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={colors.placeholderText}
            textAlign="center"
            // Without this, Android miscalculates the caret position against
            // the 12px letterSpacing above and renders it well past the
            // actual last digit — pinning selection explicitly to the real
            // text end keeps it tracking the digits instead of drifting.
            selection={{ start: code.length, end: code.length }}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, (code.length !== 6 || loading) && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={code.length !== 6 || loading}
        >
          {loading ? <LoadingRing size={20} color="#F5F7FA" /> : <Text style={styles.btnText}>Verify</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={cooldown > 0} style={styles.resendWrap}>
          <Text style={[styles.resend, cooldown > 0 && styles.resendDisabled]}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>

    <Modal
      visible={showCelebration}
      transparent
      animationType="fade"
      onRequestClose={() => { setShowCelebration(false); navigation.replace('OnboardUsername'); }}
    >
      <View style={styles.celebBackdrop}>
        <View style={styles.celebCard}>
          <View style={styles.celebMascotBox}>
            <Animated.Image
              source={MASCOT.lumoXp}
              style={[styles.celebLuma, styles.mascotImgFlush, { transform: [{ scale: lumaScaleAnim }] }]}
              resizeMode="contain"
            />
            <MascotShadow width={84} />
          </View>
          <Text style={styles.celebTitle}>Email verified! 🎉</Text>
          <Text style={styles.celebXp}>+{celebXp} XP</Text>
          <TouchableOpacity
            style={styles.celebBtn}
            onPress={() => { setShowCelebration(false); navigation.replace('OnboardUsername'); }}
          >
            <Text style={styles.celebBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}
