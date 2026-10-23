import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useArabicFont, arabicTextStyle } from '../../../utils/arabicFont';
import { colors } from '../../../theme';
import type { ExerciseDict } from '../../../types/api';
import AyahText from '../../../components/lesson/AyahText';
import ExerciseLayout from '../../../components/lesson/ExerciseLayout';
import ExerciseFooterButton from '../../../components/lesson/ExerciseFooterButton';
import UstadSays from '../../../components/lesson/UstadSays';
import { PlayPauseBtn } from '../components/PlayPauseBtn';
import { EX } from './exerciseStyles';
import { playUrl } from '../lessonAudio';
import { BUBBLE_TEXT, type Character } from '../lessonShared';

// ── Ayat Then Order exercise ──────────────────────────────────────
// Shows first ayah as a read-only header. User then reorders tiles of the next ayah.

export function AyatThenOrder({
  ex, surahName, character, locked, onSubmit,
}: { ex: ExerciseDict; surahName: string; character: Character; locked?: boolean; onSubmit: (ans: string[]) => void }) {
  const tiles = (ex.tiles ?? []).filter(t => (t as any).ar != null) as Array<{ ar: string; audio_url?: string | null }>;
  const [bank, setBank]     = useState<string[]>(() => tiles.map(t => t.ar));
  const [placed, setPlaced] = useState<string[]>([]);
  const tileAudio = useRef<Record<string, string | null>>({});
  const arabicFont = useArabicFont();

  useEffect(() => {
    tiles.forEach(t => { tileAudio.current[t.ar] = t.audio_url ?? null; });
    setBank(tiles.map(t => t.ar));
    setPlaced([]);
  }, [ex.ex_id]);

  const tapFromBank = (ar: string, idx: number) => {
    setBank(b => b.filter((_, i) => i !== idx));
    setPlaced(p => [...p, ar]);
  };
  const tapFromPlaced = (ar: string, idx: number) => {
    setPlaced(p => p.filter((_, i) => i !== idx));
    setBank(b => [...b, ar]);
  };

  const answerLen = ex.answer_len ?? tiles.length;
  const ready = placed.length === answerLen;

  return (
    <ExerciseLayout footer={<ExerciseFooterButton onPress={() => onSubmit(placed)} disabled={!ready || locked} />}>
      <UstadSays
        character={character}
        text={BUBBLE_TEXT.ayat_then_order}
        label={`Surah ${surahName}`}
        retry={ex.phase === 'mistakes_review'}
      />

      {/* First ayah — read-only header with play button */}
      {ex.first_ayah_text ? (
        <View style={ATO.firstAyahCard}>
          <AyahText text={ex.first_ayah_text} style={arabicTextStyle(ATO.firstAyahAr as any, arabicFont) as any} />
          {ex.first_ayah_audio_url ? (
            <PlayPauseBtn url={ex.first_ayah_audio_url} label="Listen" />
          ) : null}
        </View>
      ) : null}

      <Text style={ATO.divider}>↓ What comes next?</Text>

      {/* Answer zone */}
      <View style={EX.answerZone}>
        {placed.length === 0
          ? <Text style={EX.answerPlaceholder}>Tap words below to build the next ayah</Text>
          : placed.map((ar, i) => (
              <TouchableOpacity
                key={i} style={[EX.placedTile, locked && { opacity: 0.7 }]}
                onPress={() => { if (!locked) tapFromPlaced(ar, i); }}
                onLongPress={() => { void playUrl(tileAudio.current[ar]); }}
                delayLongPress={400}
              >
                <Text style={arabicTextStyle(EX.tileText as any, arabicFont) as any}>{ar}</Text>
              </TouchableOpacity>
            ))
        }
      </View>

      {/* Tile bank */}
      <View style={EX.tileBank}>
        {bank.map((ar, i) => (
          <TouchableOpacity
            key={i} style={[EX.bankTile, locked && { opacity: 0.7 }]}
            onPress={() => { if (!locked) tapFromBank(ar, i); }}
            onLongPress={() => { void playUrl(tileAudio.current[ar]); }}
            delayLongPress={400}
          >
            <Text style={arabicTextStyle(EX.tileText as any, arabicFont) as any}>{ar}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ExerciseLayout>
  );
}

export const ATO = StyleSheet.create({
  firstAyahCard: { backgroundColor: '#FFFBF0', borderRadius: 18, padding: 16, marginBottom: 8, borderWidth: 1.5, borderColor: 'rgba(196,168,76,0.4)', alignItems: 'center' },
  firstAyahAr:   { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 26, color: colors.darkText, textAlign: 'center', lineHeight: 44, marginBottom: 8 },
  divider:       { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.mutedText, textAlign: 'center', marginBottom: 12, marginTop: 4 },
});
