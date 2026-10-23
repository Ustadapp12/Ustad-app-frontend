import { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useArabicFont, arabicTextStyle } from '../../../utils/arabicFont';
import { colors } from '../../../theme';
import { useFocusedLoop } from '../../../hooks/useFocusedLoop';
import { LESSON_IMAGES } from '../../../assets';

// ── Bismillah intro screen ────────────────────────────────────────

export function BismillahIntro({
  surahName, surahNumber, onBegin, insetTop,
}: { surahName: string; surahNumber: number; onBegin: () => void; insetTop: number }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const arabicFont = useArabicFont();
  // Only while the lesson is on screen (2026-10-22 audit).
  useFocusedLoop(floatAnim, 1600);
  const ty = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  return (
    <View style={[BI.container, { paddingTop: insetTop }]}>
      <Animated.Image
        source={LESSON_IMAGES.lumoRead}
        style={[BI.luma, { transform: [{ translateY: ty }] }]}
        resizeMode="contain"
      />
      <View style={BI.card}>
        <Text style={BI.surahLabel}>Surah {surahName} · No. {surahNumber}</Text>
        <Text style={arabicTextStyle(BI.bismillah as any, arabicFont) as any}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
        <Text style={BI.translation}>In the Name of Allah, the Most Gracious, the Most Merciful</Text>
      </View>
      <TouchableOpacity style={BI.beginBtn} onPress={onBegin}>
        <Text style={BI.beginBtnText}>Begin Lesson  →</Text>
      </TouchableOpacity>
    </View>
  );
}

export const BI = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D3B26', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  luma: { width: 130, height: 130, marginBottom: 16 },
  card: {
    backgroundColor: 'rgba(4,20,10,0.88)', borderRadius: 22,
    borderWidth: 1.5, borderColor: 'rgba(224,188,78,0.45)',
    paddingHorizontal: 26, paddingVertical: 28,
    alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.55, shadowRadius: 14, elevation: 10,
  },
  surahLabel: { fontFamily: 'Nunito-Bold', fontSize: 12, color: 'rgba(224,188,78,0.8)', marginBottom: 12, letterSpacing: 0.5 },
  bismillah: { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 32, color: '#E0BC4E', textAlign: 'center', lineHeight: 52 },
  translation: { fontFamily: 'Nunito-Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 10, lineHeight: 18 },
  listenBtn: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(224,188,78,0.15)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 },
  listenBtnText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#E0BC4E' },
  beginBtn: { marginTop: 28, backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 60, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 6 },
  beginBtnText: { fontFamily: 'Nunito-Bold', fontSize: 17, color: '#F5F7FA' },
});
