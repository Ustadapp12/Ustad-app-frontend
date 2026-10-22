import { type ImageSourcePropType } from 'react-native';
import { LESSON_IMAGES } from '../../assets';

// The speaker/audio-playback icon used everywhere a "tap to hear" control
// shows a handheld speaker — replaces the old 🔊 emoji.
export const SPEAKER_ICON = LESSON_IMAGES.speaker;


// ── Speech bubble text per exercise type ─────────────────────────
export const BUBBLE_TEXT: Record<string, string> = {
  fill_blank:          "Let's fill the blank",
  audio_fill:          "Hear and fill the blank",
  next_word:           "Let's fill the blank",
  reorder:             "Let's order the ayah",
  sequence:            "Tap the ayahs to the correct order",
  ayat_then_order:     "First ayat is shown, complete the rest",
  segment_recall:      "Can you find the right verse?",
  hear_and_select:     "Hear the sound and select",
  read_ayah_and_speak: "Listen, then recite the ayah",
  read_and_speak:      "Read the words aloud",
};

// Shown instead of the normal BUBBLE_TEXT once a recitation attempt has
// failed and the retry-choice sheet is up — most low scores trace back to
// background noise the mic picked up, so this is the one moment worth
// telling the user that directly rather than just "try again".
export const RETRY_BUBBLE_TEXT = "Try again with a clear background, it helps a lot";

// Types the app fully handles — anything else is silently skipped
export const HANDLED_EXERCISE_TYPES = new Set([
  'ayah_display', 'fill_blank', 'audio_fill', 'next_word',
  'reorder', 'sequence', 'ayat_then_order', 'segment_recall', 'hear_and_select',
  'read_ayah_and_speak', 'read_and_speak',
]);

// ── Character rotation ────────────────────────────────────────────
export interface Character { src: ImageSourcePropType; name: string }
export const CHARACTERS: Character[] = [
  { src: LESSON_IMAGES.ayesha,   name: 'Ayesha' },
  { src: LESSON_IMAGES.farah,    name: 'Farah' },
  { src: LESSON_IMAGES.fatima,   name: 'Fatima' },
  { src: LESSON_IMAGES.hamza,    name: 'Hamza' },
  { src: LESSON_IMAGES.muhammad, name: 'Muhammad' },
  { src: LESSON_IMAGES.umar,     name: 'Umar' },
  { src: LESSON_IMAGES.waleed,   name: 'Waleed' },
];
export function shuffleIndices(len: number): number[] {
  const arr = Array.from({ length: len }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
export function characterForIndex(shuffled: number[], idx: number): Character {
  return CHARACTERS[shuffled[idx % shuffled.length]];
}

export function accuracyPct(a: { correct: number; wrong: number }): number {
  const total = a.correct + a.wrong;
  return total > 0 ? Math.round((a.correct / total) * 100) : 100;
}
