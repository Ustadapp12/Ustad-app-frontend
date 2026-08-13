import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { colors } from '../theme/colors';
import MascotShadow from './MascotShadow';
import { STREAK_FROZEN_COLOR, STREAK_FROZEN_ICON, freezeDaysLabel, repairProgressLabel } from '../utils/streak';

interface Props {
  currentStreak: number;
  freezeDaysRemaining: number;
  repairRequired: number;
  repairCompleted: number;
  onDismiss: () => void;
}

// The moment a user opens the map and discovers a missed day froze their
// streak — see utils/streak.ts's checkStreakFrozenPopup for the one-shot
// gating (shown once per freeze occurrence, not once per map visit). Sad
// Lumo + the fire visibly going cold sells the stakes; the repair banner
// right under it is what turns that into "here's exactly what to do," so
// the moment doesn't just land as bad news.
export default function StreakFrozenModal({
  currentStreak, freezeDaysRemaining, repairRequired, repairCompleted, onDismiss,
}: Props) {
  const fireOpacity = useRef(new Animated.Value(1)).current;
  const fireScale = useRef(new Animated.Value(1)).current;
  const iceOpacity = useRef(new Animated.Value(0)).current;
  const iceScale = useRef(new Animated.Value(0.4)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fireOpacity, { toValue: 0, duration: 380, useNativeDriver: true }),
        Animated.timing(fireScale, { toValue: 0.5, duration: 380, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(iceScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 7 }),
        Animated.timing(iceOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]),
    ]).start();
    Animated.timing(cardOpacity, { toValue: 1, duration: 500, delay: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={{ width: 110, height: 110, marginBottom: 8 }}>
            <Image
              source={require('../../assets/images/lumo_cry.png')}
              style={styles.luma}
              resizeMode="contain"
            />
            <MascotShadow width={110} />
          </View>

          {/* Fire fades/shrinks away, ice blooms in over it — one visual,
              two Animated.Text layers stacked via absolute positioning. */}
          <View style={styles.iconStage}>
            <Animated.Text
              style={[styles.icon, { opacity: fireOpacity, transform: [{ scale: fireScale }] }]}
            >
              🔥
            </Animated.Text>
            <Animated.Image
              source={STREAK_FROZEN_ICON}
              style={[styles.iconImg, styles.iconOverlay, { opacity: iceOpacity, transform: [{ scale: iceScale }] }]}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Your streak froze!</Text>
          <Text style={styles.body}>
            You missed a day. Your {currentStreak} day streak isn't gone, it's on ice.
          </Text>

          <Animated.View style={[styles.freezeCard, { opacity: cardOpacity }]}>
            <Text style={styles.freezeCardTitle}>❄️ {freezeDaysLabel(freezeDaysRemaining)}</Text>
            <Text style={styles.freezeCardBody}>{repairProgressLabel(repairCompleted, repairRequired)}</Text>
          </Animated.View>

          <TouchableOpacity style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>Let's save it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: colors.white, borderRadius: 20, padding: 24, width: '100%', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12,
  },
  luma: { width: 110, height: 110 },
  iconStage: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  icon: { fontSize: 64, textAlign: 'center' },
  iconImg: { width: 64, height: 64 },
  iconOverlay: { position: 'absolute' },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 19, color: colors.darkText, marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, lineHeight: 20, marginBottom: 16, textAlign: 'center' },
  freezeCard: {
    width: '100%', backgroundColor: colors.blueBg, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 18,
    borderWidth: 1, borderColor: STREAK_FROZEN_COLOR + '33', alignItems: 'center',
  },
  freezeCardTitle: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: STREAK_FROZEN_COLOR, marginBottom: 2, textAlign: 'center' },
  freezeCardBody: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.midText, textAlign: 'center' },
  button: { width: '100%', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  buttonText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.white },
});
