import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Image } from 'react-native';
import { playAudioUrl, pauseAudio } from '../../services/audioPlayer';
import { useArabicFont, arabicTextStyle } from '../../utils/arabicFont';
import { colors } from '../../theme/colors';
import PlayPauseIcon from '../PlayPauseIcon';
import MascotShadow from '../MascotShadow';
import AyahText from './AyahText';

// The backend sometimes prefixes ayah_ar with the Bismillah; the hint should
// show only the ayah itself. Matches any diacritisation variant.
const _D = '[ً-ٰٟ]*';
const BISMILLAH_RE = new RegExp(
  '^[\\s﷽]*' +
  `ب${_D}س${_D}م${_D}` +
  `\\s+ا${_D}ل${_D}ل${_D}[هة]${_D}` +
  `\\s+ا${_D}ل${_D}ر${_D}ح${_D}م${_D}[نا]${_D}` +
  `\\s+ا${_D}ل${_D}ر${_D}ح${_D}[يى]${_D}م${_D}` +
  '[\\s\\n]*',
);

function stripBismillahPrefix(text: string): string {
  const stripped = text.replace(BISMILLAH_RE, '').trim();
  // If the ayah IS the Bismillah (e.g. 1:1), keep it.
  return stripped || text;
}

interface Props {
  url?: string | null;
  ayahAr?: string | null;
  ayahTranslation?: string | null;
}

// Lightbulb badge (glow, bulb and "Hint" label are all baked into the asset)
// that opens a Lumo modal with the ayah text and its audio.
export default function HintButton({ url, ayahAr, ayahTranslation }: Props) {
  const arabicFont = useArabicFont();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (!visible && playing) {
      pauseAudio();
      setPlaying(false);
    }
  }, [visible, playing]);

  async function handlePlayPause() {
    if (!url) return;
    if (playing) {
      setPlaying(false);
      pauseAudio();
      return;
    }
    // Set before awaiting: playAudioUrl only resolves once playback finishes.
    setPlaying(true);
    try {
      await playAudioUrl(url);
    } catch (e) {
      console.warn('[HintButton] play failed:', e);
    } finally {
      if (mountedRef.current) setPlaying(false);
    }
  }

  // Worth showing with either audio or text, not only audio.
  if (!url && !ayahAr) return null;

  const badgeScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <>
      <TouchableOpacity style={S.container} onPress={() => setVisible(true)} accessibilityLabel="Hint">
        <Animated.Image
          source={require('../../../assets/images/hint_badge.png')}
          style={[S.badge, { transform: [{ scale: badgeScale }] }]}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <Modal transparent animationType="fade" visible={visible} onRequestClose={() => setVisible(false)}>
        <View style={S.backdrop}>
          <View style={S.modal}>
            <View style={S.lumoWrap}>
              <Image source={require('../../../assets/images/lumo_hint.png')} style={S.lumo} resizeMode="contain" />
              <MascotShadow width={100} />
            </View>
            <Text style={S.modalTitle}>Hint</Text>

            {ayahAr ? (
              <View style={S.ayahBox}>
                <AyahText text={stripBismillahPrefix(ayahAr)} style={arabicTextStyle(S.ayahAr as any, arabicFont) as any} />
                {ayahTranslation ? <Text style={S.ayahTrans}>"{ayahTranslation}"</Text> : null}
              </View>
            ) : null}

            {url ? (
              <TouchableOpacity style={[S.playBtn, playing && S.playBtnActive]} onPress={handlePlayPause}>
                <View style={S.pauseRow}>
                  <PlayPauseIcon playing={playing} size={16} color="#F5F7FA" />
                  <Text style={S.playText}>  {playing ? 'Pause' : 'Hear the Ayah'}</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={S.cancelBtn} onPress={() => setVisible(false)}>
              <Text style={S.cancelText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const S = StyleSheet.create({
  // Figma export's own aspect ratio (44x47).
  container:     { alignItems: 'center', justifyContent: 'center', width: 44, height: 47 },
  badge:         { width: 44, height: 47 },
  backdrop:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  modal:         { backgroundColor: '#F5F7FA', borderRadius: 24, padding: 24, alignItems: 'center', width: '88%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  lumoWrap:      { width: 100, height: 100, marginBottom: 8 },
  lumo:          { width: 100, height: 100 },
  modalTitle:    { fontFamily: 'Nunito-Bold', fontSize: 20, color: colors.darkText, marginBottom: 12 },
  ayahBox:       { width: '100%', backgroundColor: '#FFFBF0', borderRadius: 14, borderWidth: 1.5, borderColor: '#E8D8A0', padding: 16, alignItems: 'center', marginBottom: 16 },
  ayahAr:        { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 22, color: colors.darkText, textAlign: 'center', lineHeight: 38 },
  ayahTrans:     { fontFamily: 'Nunito-Regular', fontSize: 12, color: colors.mutedText, textAlign: 'center', marginTop: 8, fontStyle: 'italic', lineHeight: 18 },
  playBtn:       { width: '100%', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  playBtnActive: { backgroundColor: '#1A5C3A' },
  playText:      { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#F5F7FA' },
  pauseRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cancelBtn:     { width: '100%', borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  cancelText:    { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.midText },
});
