import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import MascotShadow from './MascotShadow';
import type { RootNavProp } from '../navigation/types';

interface Props {
  /** What the guest was trying to reach — used to make the pitch specific. */
  feature: string;
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
export default function GuestGate({ feature }: Props) {
  const navigation = useNavigation<RootNavProp>();
  const insets = useSafeAreaInsets();

  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: -10, duration: 1500, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [fadeAnim, floatAnim]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <Animated.Image
          source={require('../../assets/images/lumo_transparent.png')}
          style={[styles.lumo, { marginBottom: 0, transform: [{ translateY: floatAnim }] }]}
          resizeMode="contain"
        />
        <MascotShadow width={150} style={{ position: 'relative', marginTop: -15, marginBottom: 12 }} />

        <View style={styles.card}>
          <Text style={styles.title}>Create an account to save your progress</Text>
          <Text style={styles.body}>
            {feature} needs an account. Sign up free to keep your streak, your XP and
            everything you memorise. It takes a moment.
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
  lumo: { width: 150, height: 150, marginBottom: 12 },
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
    fontFamily: 'Nunito_700Bold',
    fontSize: 19,
    color: colors.darkText,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 26,
  },
  body: {
    fontFamily: 'Nunito_400Regular',
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
  buttonText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.white },
});
