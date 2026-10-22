import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import MascotShadow from './MascotShadow';
import { useFocusedLoop } from '../hooks/useFocusedLoop';
import type { RootNavProp } from '../navigation/types';
import { MASCOT } from '../assets';

interface Props {
  /** What the guest was trying to reach — used to make the pitch specific. */
  feature: string;
  /** Override the default title/body copy for a specific moment (e.g. the
   * post-lesson streak pitch) instead of the generic "{feature} needs an
   * account" phrasing. */
  title?: string;
  body?: string;
}

/**
 * Stands in for Quests / Leaderboard / Profile while the user is a guest.
 *
 * Rendered as the whole screen rather than a modal over the real one, because
 * there is no real one to show: all three are built from XP, streaks and
 * profile data that a guest doesn't have banked yet. A dialog over an empty
 * leaderboard reads as a bug; a deliberate, quiet page reads as an invitation.
 *
 * The tab itself stays tappable — being able to look around and see what's
 * behind the door is the point.
 */
export default function GuestGate({ feature, title, body }: Props) {
  const navigation = useNavigation<RootNavProp>();
  const insets = useSafeAreaInsets();

  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);
  // Only while this tab is on screen: it replaces the whole Quests and
  // Leaderboard tabs for guests, and tabs stay mounted (2026-10-22 audit).
  useFocusedLoop(floatAnim, 1500);
  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <Animated.Image
          source={MASCOT.lumoTransparent}
          style={[styles.lumo, { marginBottom: 0, transform: [{ translateY: floatY }] }]}
          resizeMode="contain"
        />
        <MascotShadow width={165} style={{ position: 'relative', marginTop: -17, marginBottom: 12 }} />

        <View style={styles.card}>
          <Text style={styles.title}>{title ?? 'Create an account to save your progress'}</Text>
          <Text style={styles.body}>
            {body ?? `${feature} needs an account. Sign up free to keep your streak, your XP and
            everything you memorise. It takes a moment.`}
          </Text>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.buttonText}>Create account</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 40 },
  lumo: { width: 165, height: 165, marginBottom: 12 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingVertical: 26,
    paddingHorizontal: 22,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  title: {
    fontFamily: 'Nunito-Bold',
    fontSize: 19,
    color: colors.darkText,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 26,
  },
  body: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 28,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: { fontFamily: 'Nunito-Bold', fontSize: 15, color: colors.white },
});
