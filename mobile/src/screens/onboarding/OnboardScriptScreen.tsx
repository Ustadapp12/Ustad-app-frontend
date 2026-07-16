import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveOnboarding, setScriptPreference } from '../../utils/storage';
import { scriptFontScale, scriptLineHeightScale } from '../../utils/arabicFont';
import { useResponsiveScale } from '../../utils/responsive';
import { colors } from '../../theme/colors';
import type { ScriptPreference } from '../../types/api';
import type { RootNavProp } from '../../navigation/types';

interface Props { navigation: RootNavProp }

const PREVIEW_TEXT = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

// Base size is the Naskh/Uthmani reference, run through the same sc() device
// scale as the rest of this screen's layout — nastaliq's fontSize/lineHeight
// are then derived from that already-device-scaled base via the same
// scriptFontScale/scriptLineHeightScale used everywhere else (arabicTextStyle),
// so this preview matches both the device and the script's real proportions
// instead of rendering at a fixed pixel size regardless of phone/tablet.
const BASE_FONT_SIZE = 22;
const BASE_LINE_HEIGHT = 38;

export default function OnboardScriptScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<ScriptPreference>('uthmani');
  const sc = useResponsiveScale();
  const styles = useMemo(() => makeStyles(sc), [sc]);

  const SCRIPTS = useMemo(() => {
    const fontSize = sc(BASE_FONT_SIZE);
    const lineHeight = sc(BASE_LINE_HEIGHT);
    return [
      {
        key: 'uthmani' as ScriptPreference,
        title: 'Usmani',
        subtitle: 'عثماني',
        desc: 'Clean & modern — used in most digital Qurans worldwide',
        fontFamily: 'NotoNaskhArabic_400Regular',
        fontSize,
        lineHeight,
        accentColor: colors.primary,
        bgColor: '#E8F5EE',
      },
      {
        key: 'nastaliq' as ScriptPreference,
        title: 'Indo-Pak',
        subtitle: 'خط المصحف',
        desc: 'Classic Quran calligraphy — traditional printed Mushaf style',
        fontFamily: 'NotoNastaliqUrdu',
        fontSize: Math.round(fontSize * scriptFontScale('nastaliq')),
        lineHeight: Math.round(lineHeight * scriptFontScale('nastaliq') * scriptLineHeightScale('nastaliq')),
        accentColor: '#C4A84C',
        bgColor: '#FFFBEC',
      },
    ];
  }, [sc]);

  async function handleContinue() {
    await setScriptPreference(selected);
    await saveOnboarding({ script: selected, currentStep: 'script' });
    navigation.navigate('OnboardPath');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('OnboardPath')}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Image source={require('../../../assets/images/lumo_transparent.png')} style={styles.luma} resizeMode="contain" />
        <Text style={styles.badge}>SETUP · STEP 3 OF 3</Text>
        <Text style={styles.heading}>Choose your font</Text>
        <Text style={styles.sub}>How would you like to read Arabic? You can change this anytime in your profile.</Text>

        {SCRIPTS.map(s => {
          const active = selected === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.card, active && { borderColor: s.accentColor, borderWidth: 2.5 }]}
              onPress={() => setSelected(s.key)}
              activeOpacity={0.85}
            >
              {/* Header row */}
              <View style={styles.cardHeader}>
                <View style={[styles.cardTitleWrap, { flex: 1 }]}>
                  <Text style={styles.cardTitle}>{s.title}</Text>
                  <Text style={[styles.cardSubtitle, { color: s.accentColor }]}>{s.subtitle}</Text>
                  <Text style={styles.cardDesc}>{s.desc}</Text>
                </View>
                <View style={[styles.radio, active && { borderColor: s.accentColor }]}>
                  {active && <View style={[styles.radioDot, { backgroundColor: s.accentColor }]} />}
                </View>
              </View>

              {/* Live Arabic preview in the actual font */}
              <View style={[styles.previewBox, { backgroundColor: s.bgColor, borderColor: s.accentColor + '40' }]}>
                <Text style={[styles.previewArabic, {
                  fontFamily: s.fontFamily,
                  fontSize: s.fontSize,
                  lineHeight: s.lineHeight,
                  color: active ? s.accentColor : colors.darkText,
                }]}>
                  {PREVIEW_TEXT}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.btn} onPress={handleContinue}>
          <Text style={styles.btnText}>Get Started →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleContinue}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Sized against the same 393dp-baseline scale ProfileScreen/LeaderboardScreen
// use (useResponsiveScale). Borders, letterSpacing, and shadows are left
// unscaled, matching that same existing convention.
function makeStyles(sc: (n: number) => number) {
  return StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.lightBg },
  headerRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(20), paddingBottom: sc(6), paddingTop: sc(4) },
  backBtn:      { width: sc(36), height: sc(36), borderRadius: sc(18), borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  backArrow:    { fontSize: sc(18), color: colors.darkText, fontWeight: '700' },
  dots:         { flexDirection: 'row', gap: sc(6), marginLeft: 'auto' },
  dot:          { width: sc(24), height: sc(6), borderRadius: sc(3), backgroundColor: colors.border },
  dotActive:    { backgroundColor: colors.primary },
  scroll:       { paddingHorizontal: sc(22), paddingBottom: sc(20) },
  luma:         { width: sc(84), height: sc(84), alignSelf: 'center', marginBottom: sc(4) },
  badge:        { fontFamily: 'Nunito_700Bold', fontSize: sc(10), color: colors.mutedText, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: sc(8), textAlign: 'center' },
  heading:      { fontFamily: 'Nunito_700Bold', fontSize: sc(24), color: colors.darkText, lineHeight: sc(30), marginBottom: sc(6), textAlign: 'center' },
  sub:          { fontFamily: 'Nunito_400Regular', fontSize: sc(13), color: colors.mutedText, marginBottom: sc(22), lineHeight: sc(19), textAlign: 'center' },
  card:         { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: sc(20), padding: sc(16), marginBottom: sc(14) },
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: sc(14) },
  cardTitleWrap:{ gap: sc(2) },
  cardTitle:    { fontFamily: 'Nunito_700Bold', fontSize: sc(16), color: colors.darkText },
  cardSubtitle: { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: sc(14) },
  cardDesc:     { fontFamily: 'Nunito_400Regular', fontSize: sc(11), color: colors.mutedText, marginTop: sc(4), lineHeight: sc(16) },
  previewBox:   { borderRadius: sc(14), borderWidth: 1, paddingVertical: sc(16), paddingHorizontal: sc(14), alignItems: 'center' },
  previewArabic:{ textAlign: 'center' },
  radio:        { width: sc(22), height: sc(22), borderRadius: sc(11), borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: sc(2) },
  radioDot:     { width: sc(11), height: sc(11), borderRadius: sc(6) },
  footer:       { paddingHorizontal: sc(22), paddingTop: sc(10), gap: sc(10) },
  btn:          { backgroundColor: colors.primary, borderRadius: sc(16), paddingVertical: sc(17), alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  btnText:      { fontFamily: 'Nunito_700Bold', fontSize: sc(16), color: colors.white },
  skipBtn:      { paddingVertical: sc(6), alignItems: 'center' },
  skipText:     { fontFamily: 'Nunito_700Bold', fontSize: sc(14), color: colors.placeholderText },
  });
}
