import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useArabicFont, arabicTextStyle } from '../../../utils/arabicFont';
import type { ExerciseDict } from '../../../types/api';
import ExerciseLayout from '../../../components/lesson/ExerciseLayout';
import ExerciseFooterButton from '../../../components/lesson/ExerciseFooterButton';
import UstadSays from '../../../components/lesson/UstadSays';
import AyahWithBlank from '../../../components/lesson/AyahWithBlank';
import HearButton from '../../../components/lesson/HearButton';
import { EX } from './exerciseStyles';
import { playUrl, playUrlSequence } from '../lessonAudio';
import { BUBBLE_TEXT, type Character } from '../lessonShared';

export function FillBlankOrNextWord({
  ex, surahName, character, locked, onSubmit, previewSelected, checkButtonRef, selectedOptionRef,
  glowCheck,
}: {
  ex: ExerciseDict;
  surahName: string;
  character: Character;
  locked?: boolean;
  onSubmit: (ans: string) => void;
  /**
   * Tour-only: pre-fills `selected` so the Check button reads as enabled
   * instead of permanently greyed out, in a screen where taps never reach
   * the options (see TourLessonScreen). Never passed by the real lesson
   * flow, so `selected` still starts `null` there exactly as before.
   */
  previewSelected?: string;
  /** Tour-only: lets TourLessonScreen measure the real Check button, for the cutout hole. */
  checkButtonRef?: React.Ref<View>;
  /** Tour-only: lets TourLessonScreen measure the pre-selected option, for the cutout hole. */
  selectedOptionRef?: React.Ref<View>;
  /** Tour-only: glow the real Check button itself. */
  glowCheck?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(previewSelected ?? null);
  const arabicFont = useArabicFont();

  useEffect(() => {
    if (ex.word_audio_url) { void playUrl(ex.word_audio_url); }
    setSelected(previewSelected ?? null);
  }, [ex.ex_id, previewSelected]);

  // Show "Hear words" only when the blank is the first or last token (corner position)
  const blankIdx = ex.tokens?.findIndex(t => t.blank) ?? -1;
  const isCorner = blankIdx === 0 || (ex.tokens != null && blankIdx === ex.tokens.length - 1);
  const wordAudioUrls = isCorner && ex.segment_audio_urls?.length ? ex.segment_audio_urls : null;
  return (
    <ExerciseLayout
      footer={
        <ExerciseFooterButton
          onPress={() => { if (selected) onSubmit(selected); }}
          disabled={!selected || locked}
          buttonRef={checkButtonRef}
          glow={glowCheck}
        />
      }
    >
      <UstadSays
        character={character}
        text={BUBBLE_TEXT[ex.type] ?? ex.instruction}
        label={`Surah ${surahName} · Verse ${ex.ayah_no}`}
        retry={ex.phase === 'mistakes_review'}
      />

      {/* Word-by-word speaker — only when blank is in corner position */}
      {wordAudioUrls && (
        <HearButton label="Hear words" onPress={() => void playUrlSequence(wordAudioUrls)} />
      )}

      {/* Question card: the whole ayah on one line, blank inline */}
      <View style={EX.questionCard}>
        <AyahWithBlank before={ex.context_before} tokens={ex.tokens} after={ex.context_after} blankText={selected} />
      </View>

      {/* Options: tap once = select, long-press = audio; locked after Check */}
      <View style={EX.optionsGrid}>
        {ex.options?.map((o, i) => {
          // Gated on the immutable prop, not the `selected` state — `selected`
          // is seeded from `previewSelected` via useState/useEffect, so for a
          // beat across renders it can lag behind, and the ref detaching then
          // reattaching is exactly what let a stale rect from the wrong
          // option survive in the tour store (confirmed: the tour's "Pick
          // your answer" tail pointed at the wrong option). `previewSelected`
          // itself never changes after the exercise mounts, so gating on it
          // directly is stable from the very first render.
          const isPreviewPick = previewSelected != null && o.ar === previewSelected;
          return (
            <Pressable
              key={i}
              ref={isPreviewPick ? selectedOptionRef : undefined}
              style={[
                EX.optionBtn,
                selected === o.ar && EX.optionSelected,
                // Tour-only: glow the auto-picked option so it's obvious why
                // Check is enabled, since no real tap ever lands here.
                isPreviewPick && EX.optionGlow,
                locked && { opacity: 0.7 },
              ]}
              // Re-enabled 2026-09-13 (was removed 2026-08-28 — see git
              // history for the original comment). The original removal was
              // real: pairing onLongPress with onPress on the legacy
              // TouchableOpacity (Touchable.Mixin) made a real device
              // occasionally drop/delay the select tap while the responder
              // waited to disambiguate. Pressable is a different, purpose-
              // built responder implementation — onPress fires on release
              // exactly like before, and onLongPress only preempts it once
              // the press has genuinely been held past delayLongPress — but
              // since that earlier bug was only ever confirmed on-device,
              // not reproduced in code, this still needs a real-device check
              // before shipping, same as before.
              onLongPress={() => { if (!locked && o.audio_url) void playUrl(o.audio_url); }}
              delayLongPress={350}
              onPress={() => { if (!locked) setSelected(o.ar); }}
            >
              <Text style={[arabicTextStyle(EX.optionText as any, arabicFont) as any, selected === o.ar && EX.optionTextSelected]}>{o.ar}</Text>
            </Pressable>
          );
        })}
      </View>
    </ExerciseLayout>
  );
}
