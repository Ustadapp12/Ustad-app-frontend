import type { ExerciseDict, FormulaAttemptOut } from '../../types/api';

/**
 * The exercises the guided tour shows, hardcoded and identical for every user.
 *
 * These are real `ExerciseDict` payloads — the same shape the formula engine
 * returns — so TourLessonScreen can feed them straight into the genuine
 * exercise components from LessonSessionScreen. Nothing here is fetched and
 * nothing is submitted: the tour must never create a session, spend a heart or
 * bank a point of XP.
 *
 * Surah An-Nas (114), as specced. Its six ayahs are the first thing most
 * learners memorise, so the tour shows them ground they already stand on.
 *
 * Audio urls are deliberately null. In a real lesson these are signed,
 * per-environment Supabase paths handed down by the backend; there is no
 * honest way to hardcode one here, and a dead url would be worse than none.
 * The components degrade cleanly — the hint still shows the ayah and its
 * meaning, which is what the tour is pointing at.
 */
export const TOUR_SURAH_NAME = 'An-Nas';
export const TOUR_SURAH_NUMBER = 114;

/** Ayah 1, with "بِرَبِّ" blanked — the classic first exercise a learner meets. */
const FILL_BLANK: ExerciseDict = {
  ex_id: 'tour-fill-blank',
  type: 'fill_blank',
  phase: 'main',
  surah_no: TOUR_SURAH_NUMBER,
  ayah_no: 1,
  seg_no: 1,
  instruction: 'Fill in the missing word',
  ayah_ar: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ',
  ayah_translation: 'Say, "I seek refuge in the Lord of mankind."',
  ayah_audio_url: null,
  tokens: [
    { ar: 'قُلْ' },
    { ar: 'أَعُوذُ' },
    { ar: 'بِرَبِّ', blank: true },
    { ar: 'ٱلنَّاسِ' },
  ],
  options: [
    { ar: 'بِرَبِّ' },
    { ar: 'مَلِكِ' },
    { ar: 'إِلَٰهِ' },
    { ar: 'صَدْرِ' },
  ],
  context_before: null,
  context_after: null,
  segment_audio_urls: null,
};

/** Ayah 2, shown as word chips to read aloud — the recitation half of a level. */
const RECITE: ExerciseDict = {
  ex_id: 'tour-read-and-speak',
  type: 'read_and_speak',
  phase: 'main',
  surah_no: TOUR_SURAH_NUMBER,
  ayah_no: 2,
  seg_no: 1,
  instruction: 'Read the ayah aloud',
  ayah_ar: 'مَلِكِ ٱلنَّاسِ',
  ayah_translation: 'The Sovereign of mankind.',
  ayah_audio_url: null,
  tokens: [
    { ar: 'مَلِكِ' },
    { ar: 'ٱلنَّاسِ' },
  ],
  expected_arabic: 'مَلِكِ ٱلنَّاسِ',
};

/**
 * Which exercise sits behind each lesson step of the tour, by step index into
 * TOUR_STEPS. The fill-blank carries the first eight lesson steps start to
 * finish (word holding, hint, hearts, progress, picking an option, Check,
 * and its feedback) since that's where the whole exercise loop lives; the
 * last two lesson steps (submit your voice, its own feedback) swap to the
 * recitation so the tour walks through both exercise types in full, not
 * just a glimpse of the second one.
 */
export const TOUR_EXERCISES: ExerciseDict[] = [FILL_BLANK, RECITE];

export function tourExerciseForStep(stepIndex: number, firstLessonStep: number): ExerciseDict {
  const offset = stepIndex - firstLessonStep;
  return offset >= 8 ? RECITE : FILL_BLANK;
}

/**
 * Half-hearts spent, so the tour's heart row shows a realistic mid-level state
 * (four and a half of five) rather than a full row that makes the "mistakes
 * cost half a heart" explanation impossible to see.
 */
export const TOUR_MISTAKES = 1;

/** Roughly a third of the way in — enough bar to be visibly partial. */
export const TOUR_PROGRESS_FRACTION = 0.35;

/**
 * The feedback the tour shows after "Check" and after the recitation mic
 * step, reusing the exact same FeedbackBanner both times (a "clone" of the
 * same component/props, not two different designs) so the two exercise
 * types visibly grade the same way. Always the correct branch, since the
 * tour narrates success, never a wrong answer.
 */
export const TOUR_FEEDBACK_RESULT: FormulaAttemptOut = {
  correct: true,
  correct_answer: null,
  was_type: 'fill_blank',
  next_exercise: null,
  phase: 'main',
  done: false,
  segments: [],
  xp_awarded: 2,
};
