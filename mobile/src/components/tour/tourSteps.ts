/**
 * The guided tour, exactly as specced — 12 steps, identical for every user.
 *
 * It runs in two halves. Steps 1–3 happen over the live Map, spotlighting the
 * real tab bar and the real XP/streak pills. Steps 4–11 happen on
 * TourLessonScreen, which renders the genuine lesson components (see
 * LessonHeader in LessonSessionScreen) against fixed Surah An-Nas content, so
 * what a new user is shown is the thing they'll actually meet — not a mock-up
 * that quietly rots as the lesson UI changes.
 *
 * Steps whose `target` is null dim the screen without a cutout: the feature
 * being described lives inside an exercise component we don't hold a ref into,
 * so pointing a hole at a guessed rectangle would be worse than not pointing.
 */
export type TourTargetKey =
  | 'tabBar'
  | 'hud'
  | 'lessonExercise'
  | 'lessonHint'
  | 'lessonHearts'
  | 'lessonProgress';

export interface TourStep {
  /** Which host screen must be on top for this step. */
  screen: 'map' | 'lesson';
  /** Element to cut a hole around, or null for a plain dimmed backdrop. */
  target: TourTargetKey | null;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    screen: 'map',
    target: null,
    title: 'Assalamu alaikum!',
    body: "I'm Lumo, and I'll be with you the whole way. Let me show you around — it'll only take a moment.",
  },
  {
    screen: 'map',
    target: 'tabBar',
    title: 'Your four tabs',
    body: 'Home is your map of levels. Quests sets you daily goals, Board ranks you against other learners, and Profile keeps your settings.',
  },
  {
    screen: 'map',
    target: 'hud',
    title: 'Streaks and XP',
    body: 'Finish a level each day to keep your streak burning. Every correct answer earns XP — both live up here, always in sight.',
  },
  {
    screen: 'lesson',
    target: 'lessonExercise',
    title: 'This is a level',
    body: "Levels are built from short exercises on one surah — here, An-Nas. You'll fill in missing words, put ayahs back in order, and recite aloud.",
  },
  {
    screen: 'lesson',
    target: null,
    title: 'Listen as often as you like',
    body: 'Tap play to hear the ayah recited, and pause whenever you want. There is no limit — listening is how it settles.',
  },
  {
    screen: 'lesson',
    target: null,
    title: 'Hold any word to hear it',
    body: "Press and hold a word to hear just that word pronounced. Use it whenever you're unsure how something should sound.",
  },
  {
    screen: 'lesson',
    target: 'lessonHint',
    title: 'Stuck? Take a hint',
    body: "Tap the lightbulb and I'll show you the full ayah with its meaning, and recite it for you. Using hints is not cheating.",
  },
  {
    screen: 'lesson',
    target: 'lessonHearts',
    title: 'Your hearts',
    body: 'Mistakes cost half a heart. Run out and the level ends — but you can start it again straight away, and nothing is lost.',
  },
  {
    screen: 'lesson',
    target: 'lessonProgress',
    title: 'How far you have to go',
    body: 'This bar fills as you work through the level. It only ever moves forward, so a wrong answer never sets you back.',
  },
  {
    screen: 'lesson',
    target: null,
    title: 'Check your answer',
    body: "Pick your answer, then press Check. I'll tell you right away whether it's right and show you the correct one if not.",
  },
  {
    screen: 'lesson',
    target: null,
    title: 'Good luck!',
    body: "That's everything. May Allah make it easy for you — and if anything feels off, do reach out and tell us.",
  },
];

/** Index of the first step that needs TourLessonScreen on top. */
export const FIRST_LESSON_STEP = TOUR_STEPS.findIndex(s => s.screen === 'lesson');
