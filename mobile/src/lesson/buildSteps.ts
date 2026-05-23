import type { AyahOut } from '../types/api';
import type { ExerciseStep } from './types';

export function buildLessonSteps(ayahs: AyahOut[]): ExerciseStep[] {
  const steps: ExerciseStep[] = [];
  ayahs.forEach((ayah, index) => {
    if (index === 0) {
      steps.push({ type: 'listen', ayah });
    }
    const words = ayah.words ?? [];
    if (words.length >= 2) {
      steps.push({
        type: 'fill_blank',
        ayah,
        blankPosition: Math.min(1, words.length - 1),
      });
      steps.push({ type: 'reorder', ayah });
    }
    if (ayah.translation_en) {
      const wrong = ayahs
        .filter(a => a.id !== ayah.id && a.translation_en)
        .map(a => a.translation_en)
        .slice(0, 3);
      const options = shuffle([
        ayah.translation_en,
        ...wrong,
        'The opening',
        'Praise be to Allah',
      ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4));
      steps.push({
        type: 'match_meaning',
        ayah,
        options,
        correctIndex: options.indexOf(ayah.translation_en),
      });
    }
    steps.push({ type: 'listen_repeat', ayah });
    if (index === 1) {
      steps.push({ type: 'interstitial', ayah });
    }
  });
  return steps;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
