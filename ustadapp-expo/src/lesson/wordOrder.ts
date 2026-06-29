import type { WordOut } from '../types/api';

/** Words in recitation order (position 1 = first word of the ayah). */
export function wordsInAyahOrder(words: WordOut[]): WordOut[] {
  return [...words].sort((a, b) => a.position - b.position);
}

