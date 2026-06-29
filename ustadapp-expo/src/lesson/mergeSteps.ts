import type { ExerciseStep } from './types';

const LISTEN_TYPES = new Set(['listen', 'listen_repeat']);

/** True when every step is only listen / listen_repeat (backend placeholder flow). */
export function isListenOnlyLesson(steps: ExerciseStep[]): boolean {
  return (
    steps.length > 0 &&
    steps.every(s => LISTEN_TYPES.has(s.type))
  );
}

