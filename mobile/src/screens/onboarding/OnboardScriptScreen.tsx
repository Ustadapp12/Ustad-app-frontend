import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveOnboarding, setScriptPreference } from '../../utils/storage';
import { scriptFontScale, scriptLineHeightScale } from '../../utils/arabicFont';
import { useResponsiveScale, safeBottomInset } from '../../utils/responsive';
import { colors } from '../../theme';
import MascotShadow from '../../components/MascotShadow';
import BackButton from '../../components/BackButton';
import type { ScriptPreference } from '../../types/api';
import type { RootNavProp } from '../../navigation/types';
import { makeStyles } from './OnboardScriptScreen.styles';
import { MASCOT } from '../../assets';

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
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
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
        desc: 'Clean & modern: used in most digital Qurans worldwide',
        fontFamily: 'NotoNaskhArabic-Regular',
        fontSize,
        lineHeight,
        accentColor: colors.primary,
        bgColor: '#E8F5EE',
      },
      {
        key: 'nastaliq' as ScriptPreference,
        title: 'Indo-Pak',
        subtitle: 'خط المصحف',
        desc: 'Classic Quran calligraphy: traditional printed Mushaf style',
        fontFamily: 'NotoNastaliqUrdu-Regular',
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
        <BackButton onPress={() => navigation.navigate('OnboardPath')} style={styles.backBtn} size={sc(18)} />
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ width: sc(100), height: sc(100), alignSelf: 'center', marginBottom: sc(4) }}>
          <Image source={MASCOT.lumoTransparent} style={[styles.luma, { marginBottom: 0 }]} resizeMode="contain" />
          <MascotShadow width={sc(100)} />
        </View>
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
