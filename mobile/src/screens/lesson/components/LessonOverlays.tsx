import React from 'react';
import { View, Text, TouchableOpacity, Modal, Image } from 'react-native';
import LottieView from 'lottie-react-native';
import MascotShadow from '../../../components/MascotShadow';
import { S } from '../styles';
import { ANIMATIONS, MASCOT } from '../../../assets';

// Overlays drawn on top of a running lesson. Moved out of LessonSessionScreen
// (2026-10-22 split); markup unchanged.

/** Hearts ran out for this attempt. */
export function NoHeartsModal({ onBuyHearts, onRetry }: { onBuyHearts: () => void; onRetry: () => void }) {
  return (
    <View style={S.noHeartsOverlay}>
      <View style={S.noHeartsCard}>
        <View style={{ width: 120, height: 120, marginBottom: 8 }}>
          <Image
            source={MASCOT.lumoCry}
            style={[S.noHeartsLumo, { marginBottom: 0 }]}
            resizeMode="contain"
          />
          <MascotShadow width={120} />
        </View>
        <Text style={S.noHeartsTitle}>Out of Hearts!</Text>
        <Text style={S.noHeartsBody}>
          You've run out of hearts for this attempt.{'\n'}Take a breath and try again!
        </Text>
        <TouchableOpacity style={S.buyHeartsBtn} onPress={onBuyHearts}>
          <Text style={S.buyHeartsBtnText}>💎  Buy Hearts</Text>
          <Text style={S.buyHeartsSubText}>Coming Soon</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.noHeartsRetryBtn} onPress={onRetry}>
          <Text style={S.noHeartsRetryText}>↩  Retry Level</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** "Leave the lesson?" confirmation. */
export function ExitConfirmModal({ visible, onLeave, onStay }: {
  visible: boolean;
  onLeave: () => void;
  onStay: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onStay}>
      <View style={S.noHeartsOverlay}>
        <View style={S.noHeartsCard}>
          <View style={{ width: 90, height: 90, marginBottom: 8 }}>
            <Image
              source={MASCOT.lumoKufi}
              style={[S.exitConfirmLumo, { marginBottom: 0 }]}
              resizeMode="contain"
            />
            <MascotShadow width={90} />
          </View>
          <Text style={S.noHeartsTitle}>Leave the lesson?</Text>
          <Text style={S.noHeartsBody}>
            Your progress this level won't be saved, you'll start fresh next time.
          </Text>
          {/* Order swapped 2026-08-28 (user: "stay on right, leave on
              left"): JSX order is what sets left-to-right position here. */}
          <View style={S.exitConfirmBtnRow}>
            <TouchableOpacity style={S.exitConfirmLeaveBtn} onPress={onLeave}>
              <Text style={S.exitConfirmLeaveText}>Yes, leave</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.exitConfirmCancelBtn} onPress={onStay}>
              <Text style={S.exitConfirmCancelText}>Keep practicing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Confetti burst on a correct answer (plays once). */
export function ConfettiOverlay() {
  return (
    <View style={S.confettiOverlay} pointerEvents="none">
      <LottieView
        source={ANIMATIONS.celebration}
        autoPlay
        loop={false}
        style={S.confettiAnim}
      />
    </View>
  );
}
