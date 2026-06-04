import type { AyahOut, WordOut } from '../types/api';

export type ExerciseType =
  | 'listen'
  | 'fill_blank'
  | 'reorder'
  | 'match_meaning'
  | 'word_meaning'
  | 'continue_ayah'
  | 'sequence_order'
  | 'listen_repeat'
  | 'mcq'
  | 'interstitial';

export interface ExerciseStep {
  type: ExerciseType;
  ayah: AyahOut;
  exercise_id?: string | null;
  /** For match_meaning / mcq / word_meaning / continue_ayah */
  options?: string[];
  correctIndex?: number;
  /** For fill_blank — word index in ayah.words */
  blankPosition?: number;
  /** fill_blank: backend-rendered blank string e.g. "وَجَعَلْنَا ___ لِبَاسًا" */
  blankDisplay?: string;
  /** reorder: scrambled word list from backend */
  scrambledWords?: string[];
  /** reorder: correct order from backend */
  correctOrder?: string[];
  /** continue_ayah: the ayah to display as the prompt */
  shownAyahAr?: string;
  /** word_meaning: specific Arabic word to define */
  wordAr?: string;
  /** sequence_order: ayah cards to arrange */
  sequenceAyahs?: { ar: string; number: number }[];
  /** listen / listen_repeat: direct audio URL from backend metadata */
  ayahAudioUrl?: string | null;
  /** listen / listen_repeat: word-level data with individual audio URLs */
  metadataWords?: WordOut[];
}
