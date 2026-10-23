import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useArabicFont, arabicTextStyle } from '../../../utils/arabicFont';
import { colors } from '../../../theme';
import PlayPauseIcon from '../../../components/PlayPauseIcon';
import type { ExerciseDict } from '../../../types/api';
import AyahText from '../../../components/lesson/AyahText';
import ExerciseLayout from '../../../components/lesson/ExerciseLayout';
import ExerciseFooterButton from '../../../components/lesson/ExerciseFooterButton';
import { playUrl, pauseCurrentAudio } from '../lessonAudio';
import { MASCOT } from '../../../assets';

// ── Exercise renderers ─────────────────────────────────────────────

export function AyahDisplay({
  ex, surahName, transliteration, showLumo, onContinue,
}: {
  ex: ExerciseDict;
  surahName: string;
  transliteration?: string | null;
  showLumo?: boolean;
  onContinue: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const mountedRef = useRef(true);
  const arabicFont = useArabicFont();
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { setPlaying(false); }, [ex.ex_id]);

  const handlePlayPause = async () => {
    if (playing) {
      setPlaying(false);
      await pauseCurrentAudio();
    } else {
      setPlaying(true); // set before awaiting — playUrl only resolves once playback finishes
      await playUrl(ex.ayah_audio_url, () => { if (mountedRef.current) setPlaying(false); });
    }
  };

  return (
    <ExerciseLayout
      contentStyle={AD.container}
      footer={<ExerciseFooterButton label="Got it  →" onPress={onContinue} />}
    >
      {showLumo && (
        <View style={AD.lumoRow}>
          <Image
            source={MASCOT.lumoKufi}
            style={AD.lumoImg}
            resizeMode="contain"
          />
          <View style={AD.lumoBubble}>
            <View style={AD.lumoBubbleTail} />
            <Text style={AD.lumoBubbleText}>Read and listen carefully</Text>
          </View>
        </View>
      )}

      {/* Verse title */}
      <Text style={AD.verseTitle}>Surah {surahName} · Verse {ex.ayah_no}</Text>
      <Text style={AD.subInstruction}>Tap the speaker to listen. Tap again to pause.</Text>

      {/* Main ayah card */}
      {ex.ayah_ar ? (
        <View style={AD.ayahCard}>
          <AyahText text={ex.ayah_ar ?? ''} style={arabicTextStyle(AD.ayahAr as any, arabicFont) as any} />
          {transliteration ? <Text style={AD.transliteration}>{transliteration}</Text> : null}
          {ex.ayah_translation ? <Text style={AD.translation}>"{ex.ayah_translation}"</Text> : null}
        </View>
      ) : null}

      {/* Big play button */}
      <TouchableOpacity
        style={[AD.playBtn, playing && AD.playBtnActive]}
        onPress={handlePlayPause}
        accessibilityLabel={playing ? 'Pause audio' : 'Play audio'}
      >
        <PlayPauseIcon playing={playing} size={26} color="#F5F7FA" />
      </TouchableOpacity>

      {/* Tip */}
      <View style={AD.tipCard}>
        <Text style={AD.tipIcon}>💡</Text>
        <Text style={AD.tipText}>Tip: Listen 3 times before continuing to help it stick in memory.</Text>
      </View>
    </ExerciseLayout>
  );
}

export const AD = StyleSheet.create({
  container: { alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF8E7', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 16, borderWidth: 1, borderColor: '#E0BC4E' },
  badgeIcon: { fontSize: 14 },
  badgeText: { fontFamily: 'Nunito-Bold', fontSize: 11, color: '#9A7A20', letterSpacing: 0.8 },
  verseTitle: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.darkText, marginBottom: 4, textAlign: 'center' },
  subInstruction: { fontFamily: 'Nunito-Regular', fontSize: 12, color: colors.mutedText, textAlign: 'center', marginBottom: 20 },
  ayahCard: { width: '100%', backgroundColor: '#FFFBF0', borderRadius: 18, borderWidth: 1.5, borderColor: '#E8D8A0', padding: 24, alignItems: 'center', marginBottom: 24 },
  ayahAr: { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 30, color: colors.darkText, textAlign: 'center', lineHeight: 54, marginBottom: 12 },
  transliteration: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#9A7A20', textAlign: 'center', marginBottom: 6 },
  translation: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', fontStyle: 'italic' },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  playBtnActive: { backgroundColor: '#1A5C3A' },
  lumoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10, width: '100%' },
  lumoImg: { width: 70, height: 70 },
  lumoBubble: { flex: 1, backgroundColor: '#E8F5EE', borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, position: 'relative' },
  lumoBubbleTail: { position: 'absolute', left: -9, top: 14, width: 0, height: 0, borderTopWidth: 7, borderBottomWidth: 7, borderRightWidth: 10, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: colors.primary },
  lumoBubbleText: { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.primary },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFBEC', borderRadius: 14, padding: 14, width: '100%', borderWidth: 1, borderColor: '#FDE68A' },
  tipIcon: { fontSize: 16 },
  tipText: { fontFamily: 'Nunito-Regular', fontSize: 12, color: '#92400E', flex: 1, lineHeight: 18 },
});
