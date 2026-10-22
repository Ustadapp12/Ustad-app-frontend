import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  /** Size and spacing differ per screen (a full-width header on Quests, a
   * card's top area on Pray), so the container's shape stays per-screen. */
  style?: StyleProp<ViewStyle>;
  fontSize?: number;
}

// The red "🚧  Coming Soon!  🚧" banner. First drawn inline on the Quests tab;
// shared since the Pray tab's Learn cards use the same one (2026-10-22).
export default function ComingSoonBanner({ style, fontSize = 22 }: Props) {
  return (
    <View style={[styles.banner, style]}>
      <Text style={[styles.text, { fontSize }]} numberOfLines={1} adjustsFontSizeToFit>
        🚧  Coming Soon!  🚧
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: 'Nunito-Bold', color: '#F5F7FA', letterSpacing: 0.5 },
});
