export const copy = {
  appName: 'Ustad',
  tagline: 'The gamified way to memorise the Holy Quran',
  splash: {
    loading: 'Preparing your journey…',
  },
  welcome: {
    getStarted: "Get Started — it's free",
    hasAccount: 'I already have an account',
    features: [
      { icon: '🌙', label: 'Hifz tracking' },
      { icon: '⚡', label: 'XP & streaks' },
      { icon: '📖', label: 'All scripts' },
      { icon: '🏆', label: 'Achievements' },
    ],
  },
  intro: {
    bubble:
      'Before we begin, let me ask you one question to personalise your Hifz journey! 🌙',
    cta: "Let's go! 🚀",
  },
  motivation: {
    title: 'Why do you want to memorize the Quran?',
    options: [
      { id: 'faith', label: 'Spiritual growth', icon: '🕌' },
      { id: 'prayer', label: 'Learn for salah', icon: '🤲' },
      { id: 'child', label: 'Help my child learn', icon: '👶' },
      { id: 'revision', label: 'Hifz revision', icon: '📖' },
      { id: 'beginner', label: 'New to Arabic', icon: '✨' },
      { id: 'routine', label: 'Build a daily habit', icon: '⏰' },
    ],
    cta: 'Continue',
  },
  dailyGoal: {
    title: 'Great. Now choose a daily goal.',
    options: [
      { id: 'casual' as const, label: 'Casual', minutes: 5 },
      { id: 'regular' as const, label: 'Regular', minutes: 10 },
      { id: 'serious' as const, label: 'Serious', minutes: 15 },
      { id: 'intense' as const, label: 'Intense', minutes: 20 },
    ],
    cta: 'Continue',
  },
  notifications: {
    title: 'Get a daily reminder to stay on track',
    cta: 'Continue',
    skip: 'Not now',
  },
  account: {
    title: 'Create an account to save your progress and streak',
    emailCta: 'Continue with email',
    googleCta: 'Continue with Google',
    appleCta: 'Continue with Apple',
    skip: 'Not now',
    comingSoon: 'Coming soon',
  },
  path: {
    title: 'Choose how you want to begin',
    startFresh: {
      title: 'Start from the beginning',
      subtitle: 'New to memorization? Begin with the first ayahs of Juz Amma.',
    },
    checkLevel: {
      title: 'Check your level',
      subtitle: 'Already memorized some surahs? Find your starting point.',
    },
  },
  placement: {
    title: "Let's find your starting point",
    body: 'This short check helps you begin at the right ayah group.',
    cta: 'Start the test',
  },
  streakGoal: {
    title: 'Pick your streak goal!',
    options: [
      { days: 3, label: '3 days', subtitle: 'Baby steps' },
      { days: 7, label: '7 days', subtitle: 'Strong start' },
      { days: 14, label: '14 days', subtitle: 'Clearly committed' },
      { days: 30, label: '30 days', subtitle: 'Unstoppable' },
    ],
    tip: 'A daily habit makes memorization 5× more likely to stick.',
    skip: 'Skip',
    cta: 'I can do it!',
  },
  auth: {
    loginTitle: 'Welcome back',
    registerTitle: 'Create your account',
    email: 'Email',
    password: 'Password',
    displayName: 'Display name',
    login: 'Log in',
    register: 'Sign up',
    forgot: 'Forgot password?',
    noAccount: "Don't have an account? Sign up",
    hasAccount: 'Already have an account? Log in',
  },
  lesson: {
    check: 'Check',
    continue: 'Continue',
    correct: 'Excellent!',
    incorrect: 'Not quite',
    cantListen: "Can't listen now",
    exitTitle: 'Leave lesson?',
    exitBody: 'Your progress in this session will be lost.',
  },
  complete: {
    title: 'Lesson complete!',
    xpLabel: 'Total XP',
    accuracyLabel: 'Accuracy',
    gemsLabel: 'Gems',
    cta: 'Continue',
  },
  streak: {
    title: (n: number) => `${n} day streak!`,
    warning: 'Practice tomorrow to keep your streak alive.',
  },
  journey: {
    start: 'START',
    locked: 'Complete the previous level to unlock',
    juzTitle: 'Juz 30 — Amma',
  },
  tabs: {
    home: 'Home',
    journey: 'Journey',
    revision: 'Revision',
    profile: 'Profile',
  },
};
