import type { ExerciseStep } from './types';
import type { WordOut } from '../types/api';
import { wordsInAyahOrder } from './wordOrder';

export const BLANK_PLACEHOLDER = 'ــــ';

function hasVisibleBlank(text: string): boolean {
  return (
    text.includes(BLANK_PLACEHOLDER) ||
    text.includes('___') ||
    text.includes('…') ||
    /_{2,}/.test(text)
  );
}

/** Resolves the word at blankPosition (1-based position or 0-based index). */
export function wordAtBlankPosition(
  words: WordOut[],
  blankPosition?: number,
): WordOut | undefined {
  if (!words.length || blankPosition == null) return undefined;

  const byPos = words.find(w => w.position === blankPosition);
  if (byPos) return byPos;

  const ordered = wordsInAyahOrder(words);
  if (blankPosition >= 1 && blankPosition <= ordered.length) {
    return ordered[blankPosition - 1];
  }
  if (blankPosition >= 0 && blankPosition < ordered.length) {
    return ordered[blankPosition];
  }
  return undefined;
}

/** Canonical correct answer for fill_blank — text-based, not option index. */
export function getFillBlankCorrectAnswer(step: ExerciseStep): string {
  const words = step.ayah.words ?? [];
  const atBlank = wordAtBlankPosition(words, step.blankPosition);
  if (atBlank?.arabic) return atBlank.arabic;

  if (
    step.options?.length &&
    step.correctIndex != null &&
    step.correctIndex >= 0 &&
    step.correctIndex < step.options.length
  ) {
    return step.options[step.correctIndex];
  }
  return '';
}

/** Ayah text with the blank word replaced by a visible placeholder. */
export function resolveBlankDisplay(step: ExerciseStep): string {
  const raw = step.blankDisplay?.trim();
  if (raw && hasVisibleBlank(raw)) return raw;

  const words = wordsInAyahOrder(step.ayah.words ?? []);
  const atBlank = wordAtBlankPosition(step.ayah.words ?? [], step.blankPosition);

  if (words.length && atBlank) {
    return words
      .map(w =>
        w.position === atBlank.position ? BLANK_PLACEHOLDER : w.arabic,
      )
      .join(' ');
  }

  if (raw) {
    const ans = getFillBlankCorrectAnswer(step);
    if (ans && raw.includes(ans)) {
      return raw.replace(ans, BLANK_PLACEHOLDER);
    }
    return raw;
  }

  return step.ayah.arabic || words.map(w => w.arabic).join(' ');
}

/** Prefer the most complete Arabic string for listen / display cards. */
export function resolveFullAyahArabic(
  ayahArabic: string | undefined | null,
  words: WordOut[],
): string {
  const ordered = wordsInAyahOrder(words);
  const joined = ordered.map(w => w.arabic).join(' ');
  const ar = ayahArabic?.trim() ?? '';
  if (!ar) return joined;
  if (!joined) return ar;
  return joined.length > ar.length ? joined : ar;
}

