/**
 * The guided tour, exactly as specced, walking one fill blank exercise
 * start to finish (pick a word, check it, see the feedback), then one
 * recitation exercise (submit your voice, see the same feedback), then back
 * to the map to send the user off.
 *
 * It runs in two halves. Steps 1 to 7 happen over the live Map, spotlighting
 * the four real tabs and the two real HUD pills one at a time (rather than
 * the tab bar/HUD as one lump) so each callout points at exactly the thing
 * it describes — step 8 is a plain lead-in card, shown before navigating
 * into the lesson half so that screen never just appears without warning.
 * Steps 9 to 18 happen on TourLessonScreen, which renders the genuine lesson
 * components (see LessonHeader in LessonSessionScreen) against fixed Surah
 * An-Nas content, so what a new user is shown is the thing they'll actually
 * meet, not a mock up that quietly rots as the lesson UI changes. Step 19
 * lands back on the map.
 *
 * Steps whose `target` is null dim the screen without a cutout: the feature
 * being described lives inside an exercise component we don't hold a ref into,
 * so pointing a hole at a guessed rectangle would be worse than not pointing.
 */
export type TourTargetKey =
  | 'tabHome'
  | 'tabQuests'
  | 'tabBoard'
  | 'tabProfile'
  | 'hudStreak'
  | 'hudXp'
  | 'lessonExercise'
  | 'lessonHint'
  | 'lessonHearts'
  | 'lessonProgress'
  | 'lessonMic'
  | 'lessonCheck'
  | 'lessonOption'
  | 'lessonFeedback';

export interface TourStep {
  /** Which host screen must be on top for this step. */
  screen: 'map' | 'lesson';
  /** Element to glow outline, or null for a plain dimmed backdrop. */
  target: TourTargetKey | null;
  title: string;
  body: string;
  /**
   * Forces the narration card to a fixed edge instead of the default
   * rule based placement (below the target unless the target sits in the
   * bottom ~45% of the screen). Used for steps whose target sits at the
   * very bottom of the exercise's own scroll content (Check, the feedback
   * sheet, the mic), so the card can't ever end up sitting on top of it.
   */
  cardPosition?: 'top' | 'bottom';
}

export const TOUR_STEPS: TourStep[] = [
  {
    screen: 'map',
    target: null,
    title: 'Assalamu alaikum!',
    body: "I'm Lumo, and I'll be with you the whole way. Let me show you around, it'll only take a moment.",
  },
  {
    screen: 'map',
    target: 'tabHome',
    title: 'Home',
    body: "This is your map of levels — you're looking at it right now.",
  },
  {
    screen: 'map',
    target: 'tabQuests',
    title: 'Quests',
    body: 'Sets you daily goals to aim for.',
  },
  {
    screen: 'map',
    target: 'tabBoard',
    title: 'Board',
    body: 'Ranks you against other learners.',
  },
  {
    screen: 'map',
    target: 'tabProfile',
    title: 'Profile',
    body: 'Keeps your settings and account.',
  },
  {
    screen: 'map',
    target: 'hudStreak',
    title: 'Your streak',
    body: 'Finish a level each day to keep it burning.',
  },
  {
    screen: 'map',
    target: 'hudXp',
    title: 'Your XP',
    body: 'Every correct answer earns XP, always in sight up here.',
  },
  {
    screen: 'map',
    target: null,
    title: 'Ready for a level?',
    body: "Let's show you some levels so you're comfortable with it, starting with a real exercise.",
  },
  {
    screen: 'lesson',
    target: 'lessonExercise',
    title: 'This is a level',
    body: "Levels are built from short exercises on one surah, here it's An Nas. Let's walk through one together.",
    cardPosition: 'bottom',
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
    body: 'Mistakes cost half a heart. Run out and the level ends, but you can start it again straight away, and nothing is lost.',
  },
  {
    screen: 'lesson',
    target: 'lessonProgress',
    title: 'How far you have to go',
    body: 'This bar fills as you work through the level. It only ever moves forward, so a wrong answer never sets you back.',
  },
  {
    screen: 'lesson',
    target: 'lessonOption',
    title: 'Pick your answer',
    body: "Tap an option to select it. I've picked this one for you so you can see how a selected answer looks.",
  },
  {
    screen: 'lesson',
    target: 'lessonCheck',
    title: 'Check your answer',
    body: 'Once you have picked one, press Check, and I\'ll grade it right away.',
    cardPosition: 'top',
  },
  {
    screen: 'lesson',
    target: 'lessonFeedback',
    title: 'Instant feedback',
    body: "The moment you check, this is what you'll see: right or wrong, plus any XP you've earned.",
    cardPosition: 'top',
  },
  {
    screen: 'lesson',
    target: 'lessonMic',
    title: 'Tap to submit your voice',
    body: 'Tap the mic to start recording, tap it again to submit. I\'ll score your recitation the moment you do.',
    cardPosition: 'top',
  },
  {
    screen: 'lesson',
    target: 'lessonFeedback',
    title: 'Same feedback either way',
    body: 'Recitation gets graded the exact same way, right there on the spot, so you always know how you did.',
    cardPosition: 'top',
  },
  {
    screen: 'map',
    target: null,
    title: 'Good luck!',
    body: "That's everything. May Allah make it easy for you, and if anything feels off, do reach out and tell us.",
  },
];

/** Index of the first step that needs TourLessonScreen on top. */
export const FIRST_LESSON_STEP = TOUR_STEPS.findIndex(s => s.screen === 'lesson');
