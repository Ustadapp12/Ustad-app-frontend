import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal,
} from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Reward-chest popup, matching the Figma mock (Landing Page file, node
// 1147:9713) colour for colour: purple card, the chest art, a gold "3D"
// button. Not reusing LumoInfoModal's white-card shell here — the user
// pointed at this exact mock as "the popup that shows when the chest is
// pressed", so the card itself is the reward moment, not a generic info
// dialog with the Lumo mascot swapped out.
//
// The one deliberate departure from the mock: the button reads "COMING
// SOON" instead of "CLAIM REWARD" (2026-10-09, user: "this is the popup...
// but reward says coming soon!") — there is no real reward to claim yet, so
// the button can't promise one. Everything else, including the "TAP TO
// CLAIM THE REWARD" label above the chest, is unchanged from the design.
export default function ChestInfoModal({ visible, onClose }: Props) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [visible]);

  const chestTranslateY = bounceAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.label}>TAP TO CLAIM THE REWARD</Text>
          <Animated.Image
            source={require('../../assets/images/chest.png')}
            style={[styles.chest, { transform: [{ translateY: chestTranslateY }] }]}
            resizeMode="contain"
          />
          <TouchableOpacity style={styles.button} activeOpacity={0.85} onPress={onClose}>
            <View style={styles.buttonEdge} />
            <View style={styles.buttonTop}>
              <Text style={styles.buttonText}>COMING SOON</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Sampled straight from the Figma render: card #905EAF, button fill #FBB603
// over a #D28800 3D edge, label a near-black #1E1E1E on the purple.
const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#905EAF',
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 22,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  label: {
    fontFamily: 'Nunito-Bold', fontSize: 12, color: '#1E1E1E',
    textAlign: 'center', letterSpacing: 0.6, marginBottom: 18,
  },
  chest: { width: 120, height: 95, marginBottom: 22 },
  button: { alignSelf: 'stretch', marginTop: 4 },
  buttonEdge: {
    position: 'absolute', left: 0, right: 0, bottom: 0, top: 5,
    backgroundColor: '#D28800', borderRadius: 15,
  },
  buttonTop: {
    backgroundColor: '#FBB603', borderRadius: 15,
    paddingVertical: 14, alignItems: 'center', marginBottom: 5,
  },
  buttonText: {
    fontFamily: 'Nunito-Bold', fontSize: 15, color: '#F5F7FA', letterSpacing: 0.3,
  },
});
