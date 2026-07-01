import type { AyahOut, ExerciseOut, WordOut } from '../types/api';
import type { ExerciseStep, ExerciseType } from './types';
import { wordsInAyahOrder } from './wordOrder';
import { BLANK_PLACEHOLDER } from './exerciseHelpers';

export function buildLessonSteps(ayahs: AyahOut[]): ExerciseStep[] {
  const steps: ExerciseStep[] = [];

  ayahs.forEach((ayah, index) => {
    steps.push({
      type: 'listen',
      ayah,
      ayahAudioUrl: ayah.audio_url ?? null,
      metadataWords: ayah.words?.length ? ayah.words : undefined,
    });

    const words = ayah.words ?? [];
    if (words.length >= 2) {
      const ordered = wordsInAyahOrder(words);

      // ── fill_blank at up to 3 different positions ──────────────
      // Always blank the 2nd word; add middle + last for longer ayahs.
      const blankIndices: number[] = [Math.min(1, ordered.length - 1)];
      if (ordered.length >= 4) {
        blankIndices.push(Math.floor(ordered.length / 2));
        blankIndices.push(ordered.length - 1);
      } else if (ordered.length === 3) {
        blankIndices.push(2);
      }

      [...new Set(blankIndices)].forEach(blankIdx => {
        const blankWord = ordered[blankIdx];
        // Distractors: other words in this ayah + words from other ayahs
        const sameAyahDistractors = ordered
          .filter((_, i) => i !== blankIdx)
          .map(w => w.arabic);
        const crossAyahDistractors = ayahs
          .filter(a => a.id !== ayah.id)
          .flatMap(a => wordsInAyahOrder(a.words ?? []).map(w => w.arabic))
          .filter(ar => ar !== blankWord.arabic);
        const distractors = [...new Set([...sameAyahDistractors, ...crossAyahDistractors])].slice(0, 3);
        const options = shuffle([blankWord.arabic, ...distractors]);
        steps.push({
          type: 'fill_blank',
          ayah,
          blankPosition: blankWord.position,
          options,
          correctIndex: options.indexOf(blankWord.arabic),
          blankDisplay: ordered
            .map((w, i) => (i === blankIdx ? BLANK_PLACEHOLDER : w.arabic))
            .join(' '),
        });
      });

      // ── reorder (full ayah scrambled) ──────────────────────────
      steps.push({
        type: 'reorder',
        ayah,
        scrambledWords: shuffle(ordered.map(w => w.arabic)),
        correctOrder: ordered.map(w => w.arabic),
      });

      // ── continue_ayah (procedural): show first half, complete second ──
      if (ordered.length >= 4 && ayahs.length > 1) {
        const cutoff = Math.ceil(ordered.length / 2);
        const shownAyahAr = ordered.slice(0, cutoff).map(w => w.arabic).join(' ');
        const correctEnding = ordered.slice(cutoff).map(w => w.arabic).join(' ');
        const wrongEndings = ayahs
          .filter(a => a.id !== ayah.id)
          .map(a => {
            const aw = wordsInAyahOrder(a.words ?? []);
            if (aw.length < 2) return null;
            const c = Math.ceil(aw.length / 2);
            return aw.slice(c).map(w => w.arabic).join(' ');
          })
          .filter((v): v is string => !!v && v !== correctEnding)
          .slice(0, 3);
        const coptions = shuffle([correctEnding, ...wrongEndings]);
        if (coptions.length >= 2) {
          steps.push({
            type: 'continue_ayah',
            ayah,
            shownAyahAr,
            options: coptions,
            correctIndex: coptions.indexOf(correctEnding),
          });
        }
      }

      // ── word_meaning (for words that carry meaning metadata) ────
      const wordsWithMeaning = ordered.filter(w => w.meaning);
      if (wordsWithMeaning.length > 0) {
        const target = wordsWithMeaning[0];
        const wrongMeanings = [
          ...ordered
            .filter(w => w.meaning && w.position !== target.position)
            .map(w => w.meaning as string),
          ...ayahs
            .filter(a => a.id !== ayah.id)
            .flatMap(a => wordsInAyahOrder(a.words ?? []))
            .filter(w => w.meaning && w.meaning !== target.meaning)
            .map(w => w.meaning as string),
        ]
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .slice(0, 3);

        if (wrongMeanings.length >= 1 && target.meaning) {
          const woptions = shuffle([target.meaning, ...wrongMeanings].slice(0, 4));
          steps.push({
            type: 'word_meaning',
            ayah,
            wordAr: target.arabic,
            blankPosition: target.position,
            options: woptions,
            correctIndex: woptions.indexOf(target.meaning),
          });
        }
      }
    }

    if (ayah.translation_en) {
      const wrong = ayahs
        .filter(a => a.id !== ayah.id && a.translation_en)
        .map(a => a.translation_en as string)
        .slice(0, 3);
      const options = shuffle(
        [ayah.translation_en, ...wrong].filter(
          (v, i, arr): v is string => !!v && arr.indexOf(v) === i,
        ).slice(0, 4),
      );
      if (options.length >= 2) {
        steps.push({
          type: 'match_meaning',
          ayah,
          options,
          correctIndex: options.indexOf(ayah.translation_en),
        });
      }
    }

    steps.push({
      type: 'listen_repeat',
      ayah,
      ayahAudioUrl: ayah.audio_url ?? null,
      metadataWords: ayah.words?.length ? ayah.words : undefined,
    });

    if (index === 1) {
      steps.push({ type: 'interstitial', ayah });
    }
  });

  return steps;
}

/** Converts backend ExerciseOut[] into ExerciseStep[] for the renderer. */
export function buildStepsFromExerciseOut(
  exercises: ExerciseOut[],
  ayahs: AyahOut[],
): ExerciseStep[] {
  const ayahMap = new Map<string, AyahOut>();
  for (const a of ayahs) {
    ayahMap.set(`${a.surah_number}:${a.ayah_number}`, a);
  }
  const fallback = ayahs[0];
  const steps: ExerciseStep[] = [];

  for (const ex of exercises) {
    const ayah = ayahMap.get(`${ex.surah_no}:${ex.ayah_no}`) ?? fallback;
    if (!ayah) continue;

    const meta = (ex.metadata ?? {}) as Record<string, unknown>;
    const opts = ex.options?.map(o => o.text);
    const base = {
      exercise_id: ex.id,
      ayah,
      options: opts,
      correctIndex: ex.correct_idx ?? undefined,
    };

    const type = ex.type as ExerciseType;

    switch (ex.type) {
      case 'listen':
        steps.push({
          ...base,
          type: 'listen',
          ayahAudioUrl:
            (meta.ayah_audio_url as string | null | undefined) ??
            ayah.audio_url ??
            null,
          metadataWords:
            (meta.words as WordOut[] | undefined) ??
            (ayah.words?.length ? ayah.words : undefined),
        });
        break;
      case 'listen_repeat':
        steps.push({
          ...base,
          type: 'listen_repeat',
          ayahAudioUrl:
            (meta.ayah_audio_url as string | null | undefined) ??
            ayah.audio_url ??
            null,
          metadataWords:
            (meta.words as WordOut[] | undefined) ??
            (ayah.words?.length ? ayah.words : undefined),
        });
        break;
      case 'match_meaning':
      case 'mcq':
        steps.push({ ...base, type: 'match_meaning' });
        break;
      case 'word_meaning':
        steps.push({
          ...base,
          type: 'word_meaning',
          wordAr: meta.word_ar as string ?? undefined,
          blankPosition: meta.word_position as number ?? undefined,
        });
        break;
      case 'fill_blank':
        steps.push({
          ...base,
          type: 'fill_blank',
          blankPosition: meta.word_position as number ?? undefined,
          blankDisplay: meta.blank_display as string ?? undefined,
        });
        break;
      case 'reorder':
        steps.push({
          ...base,
          type: 'reorder',
          scrambledWords: meta.scrambled_words as string[] ?? undefined,
          correctOrder: meta.correct_order as string[] ?? undefined,
        });
        break;
      case 'continue_ayah':
        steps.push({
          ...base,
          type: 'continue_ayah',
          shownAyahAr: meta.shown_ayah_ar as string ?? undefined,
        });
        break;
      case 'sequence_order':
        steps.push({
          ...base,
          type: 'sequence_order',
          sequenceAyahs: meta.ayahs as { ar: string; number: number }[] ?? undefined,
        });
        break;
      default:
        if (type) {
          steps.push({ ...base, type });
        }
    }
  }

  // Ensure every ayah block starts with a listen step.
  // The backend may omit listen steps for non-first ayahs, so inject them.
  const withIntros: ExerciseStep[] = [];
  let lastAyahKey = '';
  for (const step of steps) {
    const key = `${step.ayah.surah_number}:${step.ayah.ayah_number}`;
    if (key !== lastAyahKey) {
      if (step.type !== 'listen') {
        withIntros.push({
          ayah: step.ayah,
          type: 'listen',
          ayahAudioUrl: step.ayah.audio_url ?? null,
          metadataWords: step.ayah.words?.length ? step.ayah.words : undefined,
        });
      }
      lastAyahKey = key;
    }
    withIntros.push(step);
  }
  return withIntros;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

