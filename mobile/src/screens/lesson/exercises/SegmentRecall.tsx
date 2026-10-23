import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useArabicFont, arabicTextStyle } from '../../../utils/arabicFont';
import type { ExerciseDict } from '../../../types/api';
import ExerciseLayout from '../../../components/lesson/ExerciseLayout';
import ExerciseFooterButton from '../../../components/lesson/ExerciseFooterButton';
import UstadSays from '../../../components/lesson/UstadSays';
import { EX } from './exerciseStyles';
import { BUBBLE_TEXT, type Character } from '../lessonShared';

export function SegmentRecall({
  ex, surahName, character, locked, onSubmit,
}: {
  ex: ExerciseDict;
  surahName: string;
  character: Character;
  locked?: boolean;
  onSubmit: (ans: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const rawOptions = ex.options ?? [];
  const arabicFont = useArabicFont();

  useEffect(() => { setSelected(null); }, [ex.ex_id]);

  return (
    <ExerciseLayout
      footer={<ExerciseFooterButton onPress={() => { if (selected) onSubmit(selected); }} disabled={!selected || locked} />}
    >
      <UstadSays
        character={character}
        text={BUBBLE_TEXT[ex.type] ?? ex.instruction}
        label={`Surah ${surahName} · Verse ${ex.ayah_no}`}
        retry={ex.phase === 'mistakes_review'}
      />

      {/* Options: single tap = select; locked after Check */}
      <View style={EX.optionsColumn}>
        {rawOptions.map((o, i) => (
          <TouchableOpacity
            key={i}
            style={[EX.optionBtnFull, selected === o.ar && EX.optionSelected, locked && { opacity: 0.7 }]}
            onPress={() => { if (!locked) setSelected(o.ar); }}
          >
            <Text style={[arabicTextStyle(EX.optionTextArabic as any, arabicFont) as any, selected === o.ar && EX.optionTextSelected]}>{o.ar}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ExerciseLayout>
  );
}
