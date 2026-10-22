import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useArabicFont, arabicTextStyle } from '../../../utils/arabicFont';
import type { ExerciseDict } from '../../../types/api';
import ExerciseLayout from '../../../components/lesson/ExerciseLayout';
import ExerciseFooterButton from '../../../components/lesson/ExerciseFooterButton';
import UstadSays from '../../../components/lesson/UstadSays';
import { EX } from './exerciseStyles';
import { playUrl } from '../lessonAudio';
import { BUBBLE_TEXT, type Character } from '../lessonShared';

export function ReorderOrSequence({
  ex, surahName, character, locked, onSubmit,
}: { ex: ExerciseDict; surahName: string; character: Character; locked?: boolean; onSubmit: (ans: string[]) => void }) {
  const tiles = (ex.tiles ?? []).filter(t => t.ar != null) as Array<{ ar: string; audio_url?: string | null }>;
  const [bank, setBank] = useState<string[]>(() => tiles.map(t => t.ar));
  const [placed, setPlaced] = useState<string[]>([]);
  const tileAudio = useRef<Record<string, string | null>>({});
  const arabicFont = useArabicFont();

  useEffect(() => {
    tiles.forEach(t => { tileAudio.current[t.ar] = t.audio_url ?? null; });
    setBank(tiles.map(t => t.ar));
    setPlaced([]);
  }, [ex.ex_id]);

  // Tap = place tile only; long press = play audio
  const tapFromBank = (ar: string, idx: number) => {
    setBank(b => b.filter((_, i) => i !== idx));
    setPlaced(p => [...p, ar]);
  };

  const longPressFromBank = (ar: string) => {
    void playUrl(tileAudio.current[ar]);
  };

  // Tap = return to bank; long press = play audio
  const tapFromPlaced = (ar: string, idx: number) => {
    setPlaced(p => p.filter((_, i) => i !== idx));
    setBank(b => [...b, ar]);
  };

  const longPressFromPlaced = (ar: string) => {
    void playUrl(tileAudio.current[ar]);
  };

  const answerLen = ex.answer_len ?? tiles.length;
  const ready = placed.length === answerLen;

  return (
    <ExerciseLayout footer={<ExerciseFooterButton onPress={() => onSubmit(placed)} disabled={!ready || locked} />}>
      <UstadSays
        character={character}
        text={BUBBLE_TEXT[ex.type] ?? ex.instruction}
        label={`Surah ${surahName} · Verse ${ex.ayah_no}`}
        retry={ex.phase === 'mistakes_review'}
      />

      {/* Context before */}
      {ex.context_before?.length ? <Text style={arabicTextStyle(EX.contextText as any, arabicFont) as any}>{ex.context_before.join(' ')}</Text> : null}

      {/* Answer zone */}
      <View style={EX.answerZone}>
        {placed.length === 0
          ? <Text style={EX.answerPlaceholder}>Tap words below to place them here</Text>
          : placed.map((ar, i) => (
              <TouchableOpacity
                key={i} style={[EX.placedTile, locked && { opacity: 0.7 }]}
                onPress={() => { if (!locked) tapFromPlaced(ar, i); }}
                onLongPress={() => longPressFromPlaced(ar)}
                delayLongPress={400}
              >
                <Text style={arabicTextStyle(EX.tileText as any, arabicFont) as any}>{ar}</Text>
              </TouchableOpacity>
            ))
        }
      </View>

      {/* Context after */}
      {ex.context_after?.length ? <Text style={arabicTextStyle(EX.contextText as any, arabicFont) as any}>{ex.context_after.join(' ')}</Text> : null}

      {/* Tile bank */}
      <View style={EX.tileBank}>
        {bank.map((ar, i) => (
          <TouchableOpacity
            key={i} style={[EX.bankTile, locked && { opacity: 0.7 }]}
            onPress={() => { if (!locked) tapFromBank(ar, i); }}
            onLongPress={() => longPressFromBank(ar)}
            delayLongPress={400}
          >
            <Text style={arabicTextStyle(EX.tileText as any, arabicFont) as any}>{ar}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ExerciseLayout>
  );
}
