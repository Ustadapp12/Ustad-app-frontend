import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { isGuest } from '../../utils/guest';
import GuestGate from '../../components/GuestGate';
import MascotShadow from '../../components/MascotShadow';

export default function DailyQuestScreen() {
  const user = useAuthStore(s => s.user);
  // Split in two so the guard sits above every hook in the real screen —
  // an early return inside DailyQuestContent would change hook order.
  if (isGuest(user)) return <GuestGate feature="Daily Quests" />;
  return <DailyQuestContent />;
}

function DailyQuestContent() {
  const insets = useSafeAreaInsets();
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 1300, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 1300, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const lumaY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <LinearGradient colors={['#0D3B26', '#1A5C3A', '#0D3B26']} style={styles.container}>
      <View style={[styles.comingSoonBanner, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.comingSoonText}>🚧  Coming Soon!  🚧</Text>
      </View>

      <View style={styles.centerFill}>
        <Animated.Image
          source={require('../../../assets/images/lumo_transparent.png')}
          style={[styles.luma, { marginBottom: 0, transform: [{ translateY: lumaY }] }]}
          resizeMode="contain"
        />
        <MascotShadow width={150} style={{ position: 'relative', marginTop: -15, marginBottom: 20 }} />
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>We're building quests, check back soon!</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  comingSoonBanner: {
    backgroundColor: '#DC2626',
    paddingBottom: 16, paddingHorizontal: 24,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.7, shadowRadius: 10, elevation: 8,
  },
  comingSoonText: {
    fontFamily: 'Nunito_700Bold', fontSize: 22, color: 'white',
    letterSpacing: 0.5,
  },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  luma: { width: 150, height: 150, marginBottom: 20 },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 22, paddingVertical: 16,
  },
  bubbleText: {
    fontFamily: 'Nunito_700Bold', fontSize: 15, color: 'white',
    textAlign: 'center', lineHeight: 22,
  },
});
