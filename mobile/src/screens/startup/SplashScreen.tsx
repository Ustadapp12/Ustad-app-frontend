import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, TouchableOpacity, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { isGuest } from '../../utils/guest';
import { getNextOnboardingScreen, isOnboardingDone } from '../../utils/storage';
import { healthCheck } from '../../api/client';
import MascotShadow from '../../components/MascotShadow';
import type { RootNavProp } from '../../navigation/types';

const { width } = Dimensions.get('window');

const ARABIC_LETTERS = [
  { char: 'ن', top: '6%', left: '7%', size: 32, rotate: '-12deg', opacity: 0.06 },
  { char: 'ف', top: '11%', right: '9%', size: 40, rotate: '18deg', opacity: 0.04 },
  { char: 'ع', top: '30%', left: '4%', size: 28, rotate: '5deg', opacity: 0.05 },
  { char: 'ر', top: '55%', right: '6%', size: 34, rotate: '-18deg', opacity: 0.04 },
  { char: 'ق', top: '75%', left: '8%', size: 24, rotate: '8deg', opacity: 0.045 },
];

const PILLS = [
  { emoji: '🌙', label: 'Hifz tracking' },
  { emoji: '⚡', label: 'XP & streaks' },
  { emoji: '📋', label: 'All scripts' },
  { emoji: '🏆', label: 'Achievements' },
];

interface Props {
  navigation: RootNavProp;
}

export default function SplashScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, isHydrated, startGuestSession } = useAuthStore();

  const lumaY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Minimum time the brand screen stays visible — starts counting from
  // mount, in parallel with hydrate(), not after it finishes. Total wait is
  // max(hydrate time, 2200ms) instead of hydrate time + 2200ms.
  const [minDelayDone, setMinDelayDone] = useState(false);

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Luma float loop
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(lumaY, { toValue: -9, duration: 1500, useNativeDriver: true }),
        Animated.timing(lumaY, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    );
    loop.start();

    // Warm the (serverless, cold-start-prone) backend the instant Splash
    // mounts, well before the user reaches Login/Lesson and actually needs
    // a real response. Fire-and-forget — result doesn't matter here.
    void healthCheck();

    const timer = setTimeout(() => setMinDelayDone(true), 1000);
    return () => { clearTimeout(timer); loop.stop(); };
  }, []);

  // Auto-navigate once both hydration and the minimum brand delay are done
  useEffect(() => {
    if (isHydrated && minDelayDone) void navigate();
  }, [isHydrated, minDelayDone]);

  // navigate() is also reachable by tapping the screen, and on first launch it
  // now performs a slow network call (minting the guest account). Without this
  // latch, impatient tapping during that window would fire startGuestSession()
  // repeatedly and leave behind an orphaned account per extra tap.
  const navigatingRef = useRef(false);

  async function navigate() {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    try {
      await route();
    } finally {
      navigatingRef.current = false;
    }
  }

  async function route() {
    if (user) {
      // A guest has no email to verify and hasn't done onboarding (they answer
      // those questions after claiming the account) — straight to the map.
      if (isGuest(user)) {
        navigation.replace('MainTabs');
        return;
      }
      if (!user.email_verified) {
        navigation.replace('VerifyEmail', { email: user.email ?? undefined });
        return;
      }
      // An account can exist (tokens persisted) while onboarding is still
      // mid-flight — e.g. the user quit the app between SignUp and the final
      // onboarding step. Resume where they left off instead of dropping them
      // straight onto the map with onboarding never marked done.
      const nextOnboardingScreen = await getNextOnboardingScreen();
      navigation.replace(nextOnboardingScreen ?? 'MainTabs');
      return;
    }

    // Someone who has been through onboarding but has no session signed out —
    // send them back to Login rather than minting them a fresh guest account,
    // which would look like their progress had vanished.
    if (await isOnboardingDone()) {
      navigation.replace('Login');
      return;
    }

    // First launch. Everyone starts as a guest so the app is usable before any
    // email is committed. If this fails (offline, backend cold) there's nothing
    // to show — fall back to the old signup-first behaviour rather than
    // dropping the user onto a map with no levels in it.
    try {
      await startGuestSession();
      navigation.replace('MainTabs');
    } catch {
      navigation.replace('SignUp');
    }
  }

  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={() => { if (isHydrated) void navigate(); }}>
      <View style={[styles.inner, { paddingTop: insets.top + 8 }]}>

        {/* Decorative Arabic letters */}
        {ARABIC_LETTERS.map((l, i) => (
          <Text
            key={i}
            style={[
              styles.decorLetter,
              {
                top: l.top as any,
                left: l.left as any,
                right: (l as any).right as any,
                fontSize: l.size,
                transform: [{ rotate: l.rotate }],
                opacity: l.opacity,
              },
            ]}
          >
            {l.char}
          </Text>
        ))}

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%' }}>
          {/* Bismillah */}
          <Text style={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>

          {/* Welcome */}
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeText}>Welcome</Text>
          </View>

          {/* Luma */}
          <Animated.Image
            source={require('../../../assets/images/lumo_transparent.png')}
            style={[styles.luma, { marginBottom: 0, transform: [{ translateY: lumaY }] }]}
            resizeMode="contain"
          />
          <MascotShadow width={180} style={{ position: 'relative', marginTop: -18, marginBottom: 8 }} />

          {/* Wordmark — replaces the plain Arabic "أُسْتَاذ" text title with the
              real brand mark (product-provided 2026-08-13). Square source
              canvas with the actual artwork sitting in a thin horizontal
              band through the middle, so the box is sized wider than tall
              and resizeMode="contain" letterboxes it down to that band. */}
          <Image
            source={require('../../../assets/map/logo_app.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>USTAD · HIFZ</Text>
          <Text style={styles.tagline}>The gamified way to memorise the Holy Quran</Text>

          {/* Feature pills */}
          <View style={styles.pillsRow}>
            {PILLS.map(p => (
              <View key={p.label} style={styles.pill}>
                <Text style={styles.pillEmoji}>{p.emoji}</Text>
                <Text style={styles.pillLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  decorLetter: {
    position: 'absolute',
    fontFamily: 'NotoNaskhArabic_400Regular',
    color: 'white',
  },
  bismillah: {
    fontFamily: 'NotoNaskhArabic_400Regular',
    fontSize: 19,
    color: '#C4A84C',
    letterSpacing: 1,
    marginBottom: 16,
    marginTop: 8,
    textShadowColor: 'rgba(196,168,76,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  welcomeCard: {
    backgroundColor: 'rgba(42,125,79,0.25)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(42,125,79,0.45)',
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginBottom: 6,
  },
  welcomeText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    color: '#C4A84C',
    letterSpacing: 1,
  },
  luma: {
    width: 180,
    height: 180,
    marginBottom: 8,
  },
  logo: {
    width: 260,
    height: 130,
    marginBottom: 5,
  },
  subtitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tagline: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
    maxWidth: 260,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  pillEmoji: { fontSize: 13 },
  pillLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
});

