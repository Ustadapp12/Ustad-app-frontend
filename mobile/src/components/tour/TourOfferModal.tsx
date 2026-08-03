import React from 'react';
import { Modal, View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';

interface Props {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * The "Take the guided tour?" fork, shown once on a first-time user's first
 * look at the map. Declining leaves them on the live map with Level 1 already
 * within reach — that's the whole point of offering rather than imposing it.
 */
export default function TourOfferModal({ visible, onAccept, onDecline }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Image
            source={require('../../../assets/images/lumo_transparent.png')}
            style={styles.lumo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Want a quick tour?</Text>
          <Text style={styles.body}>
            I can show you how levels, streaks and hints work, it takes about a minute.
            Or dive straight into your first level, whichever you prefer.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={onAccept} activeOpacity={0.85}>
            <Text style={styles.primaryText}>Show me around</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onDecline}>
            <Text style={styles.secondaryText}>I'll explore myself</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6,20,14,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 26,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingTop: 8,
    paddingBottom: 18,
    paddingHorizontal: 22,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  lumo: { width: 96, height: 96, marginBottom: 4 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 20, color: colors.darkText, marginBottom: 8 },
  body: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 15,
    paddingVertical: 15,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  primaryText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.white },
  secondaryBtn: { paddingVertical: 13, alignSelf: 'stretch', alignItems: 'center', marginTop: 2 },
  secondaryText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.mutedText },
});
