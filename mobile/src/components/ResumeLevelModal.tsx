import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { confirmModalStyles as styles } from './StartSurahModal';

interface Props {
  visible: boolean;
  onContinue: () => void;
  onStartOver: () => void;
}

// Shown when opening a level reconnects to an unfinished session (the app
// was closed, updated or crashed mid-level). Lets the learner pick up where
// they stopped or start the level again from the beginning, instead of being
// dropped mid-level with no intro. Same card as StartSurahModal (shared styles).
export default function ResumeLevelModal({ visible, onContinue, onStartOver }: Props) {
  return (
    // Back on Android keeps the progress: the non-destructive choice.
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Continue where you left off?</Text>
          <Text style={styles.cardBody}>
            You were partway through this level. Pick up where you stopped, or
            start it again from the beginning.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onContinue}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissBtn} onPress={onStartOver}>
            <Text style={styles.dismissBtnText}>Start over</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
