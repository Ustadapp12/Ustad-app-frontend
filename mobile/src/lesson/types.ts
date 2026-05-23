import type { AyahOut } from '../types/api';

export type ExerciseType =
  | 'listen'
  | 'fill_blank'
  | 'reorder'
  | 'match_meaning'
  | 'listen_repeat'
  | 'mcq'
  | 'interstitial';

export interface ExerciseStep {
  type: ExerciseType;
  ayah: AyahOut;
  /** For match / mcq */
  options?: string[];
  correctIndex?: number;
  /** For fill blank */
  blankPosition?: number;
}
