import React from 'react';
import { View, Text, Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { colors } from '../../theme/colors';

interface Props {
  character: { src: ImageSourcePropType; name: string };
  /** What the Ustad says, e.g. "Let's fill the blank". */
  text: string;
  /** Small line under it, e.g. "Surah Al-Falaq · Verse 5". */
  label: string;
  /** Show the "Try again" banner above (mistakes-review phase). */
  retry?: boolean;
}

// The Ustad + speech bubble that opens every exercise.
export default function UstadSays({ character, text, label, retry }: Props) {
  return (
    <>
      {retry && (
        <View style={S.retryBanner}>
          <Text style={S.retryText}>🔁  Try again</Text>
        </View>
      )}
      <View style={S.row}>
        <Image source={character.src} style={S.character} resizeMode="contain" />
        <View style={S.bubble}>
          <View style={S.tail} />
          <Text style={S.name}>Ustad {character.name} says:</Text>
          <Text style={S.text}>{text}</Text>
          <Text style={S.label}>{label}</Text>
        </View>
      </View>
    </>
  );
}

const S = StyleSheet.create({
  retryBanner: { backgroundColor: '#FEF3C7', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#F59E0B' },
  retryText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#92400E' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10, overflow: 'visible' },
  character: { width: 80, height: 80 },
  bubble: { flex: 1, backgroundColor: '#F5F7FA', borderRadius: 16, padding: 8, gap: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tail: { position: 'absolute', left: -10, top: 18, width: 0, height: 0, borderTopWidth: 8, borderBottomWidth: 8, borderRightWidth: 10, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: '#F5F7FA' },
  name: { fontFamily: 'Nunito-Bold', fontSize: 12, color: colors.primary, letterSpacing: 0.8 },
  text: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.darkText },
  label: { fontFamily: 'Nunito-Regular', fontSize: 10, color: colors.mutedText },
});
