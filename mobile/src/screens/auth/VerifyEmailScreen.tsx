import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, Animated, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api';
import { ApiError } from '../../api/client';
import { colors } from '../../theme/colors';
import { LoadingRing } from '../../components/LoadingSpinner';
import type { RootNavProp, RootStackParamList } from '../../navigation/types';

interface Props {
  navigation: RootNavProp;
  route: RouteProp<RootStackParamList, 'VerifyEmail'>;
}

const RESEND_COOLDOWN_S = 45;

export default function VerifyEmailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
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
    authApi.me().then(me => setEmail(me.user.email)).catch(() => null);
  }, [email]);

  useEffect(() => () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); }, []);

  useEffect(() => {
    if (showCelebration) {
      lumaScaleAnim.setValue(0);
      Animated.spring(lumaScaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6, delay: 200 }).start();
    }
  }, [showCelebration]);

  function startCooldown() {
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
      const res = await authApi.verifyEmail(email, code);
      await completeEmailVerification();
      if (res.xp_awarded > 0) {
        setCelebXp(res.xp_awarded);
        setShowCelebration(true);
      } else {
        navigation.replace('OnboardAge');
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
      await authApi.resendVerification(email);
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
      <View style={[styles.content, { paddingTop: insets.top + 24 }]}>
        <Image source={require('../../../assets/images/lumo_transparent.png')} style={styles.luma} resizeMode="contain" />

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
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, (code.length !== 6 || loading) && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={code.length !== 6 || loading}
        >
          {loading ? <LoadingRing size={20} color="#fff" /> : <Text style={styles.btnText}>Verify</Text>}
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
      onRequestClose={() => { setShowCelebration(false); navigation.replace('OnboardAge'); }}
    >
      <View style={styles.celebBackdrop}>
        <View style={styles.celebCard}>
          <Animated.Image
            source={require('../../../assets/images/lumo_xp.png')}
            style={[styles.celebLuma, { transform: [{ scale: lumaScaleAnim }] }]}
            resizeMode="contain"
          />
          <Text style={styles.celebTitle}>Email verified! 🎉</Text>
          <Text style={styles.celebXp}>+{celebXp} XP</Text>
          <TouchableOpacity
            style={styles.celebBtn}
            onPress={() => { setShowCelebration(false); navigation.replace('OnboardAge'); }}
          >
            <Text style={styles.celebBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg, position: 'relative' },
  closeBtn: {
    position: 'absolute', right: 20, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  closeIcon: { fontSize: 18, color: colors.mutedText, fontFamily: 'Nunito_700Bold' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 28 },
  luma: { width: 110, height: 110, marginBottom: 8 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: colors.darkText, textAlign: 'center', marginBottom: 6 },
  sub: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.mutedText, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  inputBox: {
    width: '100%', backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingVertical: 16, marginBottom: 12,
  },
  codeInput: {
    fontFamily: 'Nunito_700Bold', fontSize: 28, color: colors.darkText, letterSpacing: 12,
  },
  error: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.red, textAlign: 'center', marginBottom: 12 },
  btn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginTop: 8, marginBottom: 20,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
  resendWrap: { marginBottom: 24 },
  resend: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.primary },
  resendDisabled: { color: colors.mutedText },
  celebBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  celebCard: { backgroundColor: colors.white, borderRadius: 20, padding: 24, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
  celebLuma: { width: 84, height: 84, marginBottom: 12 },
  celebTitle: { fontFamily: 'Nunito_700Bold', fontSize: 20, color: colors.darkText, textAlign: 'center', marginBottom: 6 },
  celebXp: { fontFamily: 'Nunito_700Bold', fontSize: 22, color: colors.gold, marginBottom: 20 },
  celebBtn: { width: '100%', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  celebBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.white },
});
