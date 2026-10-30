import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useArabicFont, arabicTextStyle } from '../../../utils/arabicFont';
import type { ExerciseDict } from '../../../types/api';
import AyahText from '../../../components/lesson/AyahText';
import ExerciseLayout from '../../../components/lesson/ExerciseLayout';
import ExerciseFooterButton from '../../../components/lesson/ExerciseFooterButton';
import UstadSays from '../../../components/lesson/UstadSays';
import { EX } from './exerciseStyles';
import { BUBBLE_TEXT, type Character } from '../lessonShared';

// ── Sequence exercise (ayah ordering) ────────────────────────────
// Drag full ayah tiles into numbered dotted slots in the correct order.
// Tiles are plain strings (not ExerciseTile objects). No audio on tiles.

export function SequenceExercise({
  ex, surahName, character, locked, onSubmit,
}: { ex: ExerciseDict; surahName: string; character: Character; locked?: boolean; onSubmit: (ans: string[]) => void }) {
  const rawTiles = (ex.tiles ?? []) as unknown as string[];
  const answerLen = ex.answer_len ?? rawTiles.length;
  const [bank, setBank]     = useState<string[]>([...rawTiles]);
  const [placed, setPlaced] = useState<(string | null)[]>(Array(answerLen).fill(null));
  const arabicFont = useArabicFont();

  useEffect(() => {
    setBank([...rawTiles]);
    setPlaced(Array(answerLen).fill(null));
    // Keyed on the exercise id on purpose: a reset per exercise, not per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.ex_id]);

  function tapTile(text: string) {
    if (locked) return;
    const emptyIdx = placed.findIndex(p => p === null);
    if (emptyIdx === -1) return;
    setPlaced(prev => { const n = [...prev]; n[emptyIdx] = text; return n; });
    setBank(b => b.filter(t => t !== text));
  }

  function tapSlot(idx: number) {
    if (locked || !placed[idx]) return;
    const evicted = placed[idx]!;
    setPlaced(prev => { const n = [...prev]; n[idx] = null; return n; });
    setBank(b => [...b, evicted]);
  }

  const ready = placed.every(p => p !== null);

  return (
    <ExerciseLayout
      footer={<ExerciseFooterButton onPress={() => onSubmit(placed.filter(Boolean) as string[])} disabled={!ready || locked} />}
    >
      <UstadSays
        character={character}
        text={BUBBLE_TEXT[ex.type] ?? ex.instruction}
        label={`Surah ${surahName}`}
        retry={ex.phase === 'mistakes_review'}
      />

      {/* Answer zone — same-size boxes side by side */}
      <View style={EX.seqAnswerZone}>
        {placed.map((tile, i) => (
          <TouchableOpacity
            key={i}
            style={[EX.seqBox, tile ? EX.seqBoxFilled : EX.seqBoxEmpty]}
            onPress={() => tapSlot(i)}
            activeOpacity={tile ? 0.7 : 1}
          >
            {tile
              ? <Text style={arabicTextStyle(EX.seqTileText as any, arabicFont) as any}>{tile}</Text>
              : <Text style={EX.seqSlotNum}>{i + 1}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Bank — same-size boxes */}
      <View style={EX.seqBank}>
        {bank.map((text, i) => (
          <TouchableOpacity
            key={`${text}-${i}`}
            style={EX.seqBox}
            onPress={() => tapTile(text)}
            activeOpacity={0.75}
          >
            <AyahText text={text} style={arabicTextStyle(EX.seqTileText as any, arabicFont) as any} />
          </TouchableOpacity>
        ))}
      </View>
    </ExerciseLayout>
  );
}
