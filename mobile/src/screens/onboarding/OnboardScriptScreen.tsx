import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveOnboarding, setOnboardingDone, setScriptPreference } from '../../utils/storage';
import { colors } from '../../theme/colors';
import type { ScriptPreference } from '../../types/api';
import type { RootNavProp } from '../../navigation/types';

interface Props { navigation: RootNavProp }

const PREVIEW_TEXT = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

const SCRIPTS: {
  key: ScriptPreference;
  title: string;
  subtitle: string;
  desc: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  accentColor: string;
  bgColor: string;
}[] = [
  {
    key: 'uthmani',
    title: 'Usmani',
    subtitle: 'عثماني',
    desc: 'Clean & modern — used in most digital Qurans worldwide',
    fontFamily: 'NotoNaskhArabic_400Regular',
    fontSize: 22,
    lineHeight: 38,
    accentColor: colors.primary,
    bgColor: '#E8F5EE',
  },
  {
    key: 'nastaliq',
    title: 'Indo-Pak',
    subtitle: 'خط المصحف',
    desc: 'Classic Quran calligraphy — traditional printed Mushaf style',
    fontFamily: 'AmiriQuran',
    fontSize: 24,
    lineHeight: 42,
    accentColor: '#C4A84C',
    bgColor: '#FFFBEC',
  },
  {
    key: 'amiri',
    title: 'Amiri',
    subtitle: 'أميري',
    desc: 'Elegant Arabic calligraphy — inspired by classic typefaces',
    fontFamily: 'AmiriRegular',
    fontSize: 22,
    lineHeight: 38,
    accentColor: '#8B5CF6',
    bgColor: '#F5F3FF',
  },
  {
    key: 'nastaliq_urdu',
    title: 'Nastaliq',
    subtitle: 'نستعليق',
    desc: 'Traditional South Asian style — popular in Pakistan & India',
    fontFamily: 'NotoNastaliqUrdu',
    fontSize: 20,
    lineHeight: 44,
    accentColor: '#DC2626',
    bgColor: '#FFF1F2',
  },
];

export default function OnboardScriptScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<ScriptPreference>('uthmani');

  async function handleContinue() {
    await setScriptPreference(selected);
    await saveOnboarding({ script: selected });
    await setOnboardingDone(true);
    navigation.replace('MainTabs');
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

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.lightBg },
  headerRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 6, paddingTop: 4 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  backArrow:    { fontSize: 18, color: colors.darkText, fontWeight: '700' },
  dots:         { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  dot:          { width: 24, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive:    { backgroundColor: colors.primary },
  scroll:       { paddingHorizontal: 22, paddingBottom: 20 },
  badge:        { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.mutedText, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  heading:      { fontFamily: 'Nunito_700Bold', fontSize: 24, color: colors.darkText, lineHeight: 30, marginBottom: 6 },
  sub:          { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, marginBottom: 22, lineHeight: 19 },
  card:         { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: 20, padding: 16, marginBottom: 14 },
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  cardTitleWrap:{ gap: 2 },
  cardTitle:    { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.darkText },
  cardSubtitle: { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 14 },
  cardDesc:     { fontFamily: 'Nunito_400Regular', fontSize: 11, color: colors.mutedText, marginTop: 4, lineHeight: 16 },
  previewBox:   { borderRadius: 14, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 14, alignItems: 'center' },
  previewArabic:{ textAlign: 'center' },
  radio:        { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioDot:     { width: 11, height: 11, borderRadius: 6 },
  footer:       { paddingHorizontal: 22, paddingTop: 10, gap: 10 },
  btn:          { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  btnText:      { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
  skipBtn:      { paddingVertical: 6, alignItems: 'center' },
  skipText:     { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.placeholderText },
});
