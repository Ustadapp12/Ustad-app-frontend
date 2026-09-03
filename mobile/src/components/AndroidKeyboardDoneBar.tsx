import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Keyboard, Platform, type EmitterSubscription } from 'react-native';
import { colors } from '../theme/colors';

// Android has no equivalent of iOS's native "Done" accessory bar above the
// keyboard, and its soft keyboard's own return-key action (next/search/done)
// does not reliably dismiss the keyboard on its own — reported 2026-09-03:
// "in android in every place where keyboard is used to write have a tick
// button in it that when pressed the keyboard goes away, cuz else it doesnt
// go away."
//
// Implemented once, globally (mounted in App.tsx, a sibling of
// RootNavigator), rather than adding a per-field button in every screen with
// a TextInput: keyboardDidShow/keyboardDidHide fire exactly when any text
// input anywhere gains/loses focus, so a single listener here covers every
// current and future text field in the app with no per-screen wiring, and
// with none of the risk of touching 9 separate screens' existing layouts.
// No-ops entirely on iOS, which already dismisses via the system keyboard's
// own "Done"/"Return" affordance and doesn't have this gap.
export default function AndroidKeyboardDoneBar() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let showSub: EmitterSubscription;
    let hideSub: EmitterSubscription;
    showSub = Keyboard.addListener('keyboardDidShow', e => setKeyboardHeight(e.endCoordinates.height));
    hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (Platform.OS !== 'android' || keyboardHeight <= 0) return null;

  return (
    <View style={[styles.bar, { bottom: keyboardHeight }]} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.doneBtn}
        activeOpacity={0.8}
        onPress={() => Keyboard.dismiss()}
        accessibilityLabel="Done, dismiss keyboard"
      >
        <Text style={styles.tick}>✓</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', left: 0, right: 0, zIndex: 9999,
    height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingHorizontal: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  doneBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  tick: { color: '#fff', fontSize: 15, fontFamily: 'Nunito_700Bold' },
});
