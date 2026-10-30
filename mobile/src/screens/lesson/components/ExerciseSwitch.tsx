import React from 'react';
import type { ExerciseDict } from '../../../types/api';
import type { Character } from '../lessonShared';
import type { SpeakResult } from './SpeakResultBanner';
import { AyahDisplay } from './AyahDisplay';
import { FillBlankOrNextWord } from '../exercises/FillBlankOrNextWord';
import { ReorderOrSequence } from '../exercises/ReorderOrSequence';
import { SequenceExercise } from '../exercises/SequenceExercise';
import { SegmentRecall } from '../exercises/SegmentRecall';
import { HearAndSelect } from '../exercises/HearAndSelect';
import { AudioFill } from '../exercises/AudioFill';
import { AyatThenOrder } from '../exercises/AyatThenOrder';
import { ReadAyahAndSpeak } from '../exercises/ReadAyahAndSpeak';
import { ReadAndSpeak } from '../exercises/ReadAndSpeak';

type Answer = string | string[] | number[] | null;

interface Props {
  exercise: ExerciseDict;
  surahName: string;
  character: Character;
  /** True while a feedback sheet is up: the exercise can't be answered again. */
  locked: boolean;
  /** ayah_display only. */
  transliteration: string | null;
  showLumo: boolean;
  onAyahContinue: () => void;
  onSubmit: (answer: Answer) => void;
  /** Recitation exercises only. */
  onSpeakScored: (result: SpeakResult) => void;
  onSpeakFinalize: (result: SpeakResult) => void;
  onSpeakSkip: () => void;
}

// Picks the component for the current exercise type. Moved out of
// LessonSessionScreen (2026-10-22 split); same components, same props.
export default function ExerciseSwitch({
  exercise, surahName, character, locked, transliteration, showLumo,
  onAyahContinue, onSubmit, onSpeakScored, onSpeakFinalize, onSpeakSkip,
}: Props) {
  const key = exercise.ex_id;
  const common = { ex: exercise, surahName, character };
  switch (exercise.type) {
    case 'ayah_display':
      return (
        <AyahDisplay
          key={key}
          ex={exercise}
          surahName={surahName}
          transliteration={transliteration}
          showLumo={showLumo}
          onContinue={onAyahContinue}
        />
      );
    case 'fill_blank':
    case 'next_word':
      return <FillBlankOrNextWord key={key} {...common} locked={locked} onSubmit={onSubmit} />;
    case 'reorder':
      return <ReorderOrSequence key={key} {...common} locked={locked} onSubmit={onSubmit} />;
    case 'sequence':
      return <SequenceExercise key={key} {...common} locked={locked} onSubmit={onSubmit} />;
    case 'segment_recall':
      return <SegmentRecall key={key} {...common} locked={locked} onSubmit={onSubmit} />;
    case 'hear_and_select':
      return <HearAndSelect key={key} {...common} locked={locked} onSubmit={onSubmit} />;
    case 'audio_fill':
      return <AudioFill key={key} {...common} locked={locked} onSubmit={onSubmit} />;
    case 'ayat_then_order':
      return <AyatThenOrder key={key} {...common} locked={locked} onSubmit={onSubmit} />;
    case 'read_ayah_and_speak':
      return (
        <ReadAyahAndSpeak
          key={key}
          {...common}
          onSpeakScored={onSpeakScored}
          onFinalize={onSpeakFinalize}
          onSkip={onSpeakSkip}
        />
      );
    case 'read_and_speak':
      return (
        <ReadAndSpeak
          key={key}
          {...common}
          onSpeakScored={onSpeakScored}
          onFinalize={onSpeakFinalize}
          onSkip={onSpeakSkip}
        />
      );
    default:
      return null;
  }
}
