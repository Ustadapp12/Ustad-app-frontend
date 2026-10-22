// Hooks that wrap server calls. Screens import from here instead of calling
// src/api directly, so each call (and what happens after it) lives in one
// place (2026-10-22, user: "custom hooks for each API").
export { useAuthActions } from './useAuthActions';
export { useFeedback } from './useFeedback';
export { useHifzAssessment } from './useHifzAssessment';
export { useLeaderboard } from './useLeaderboard';
export { useLessonAttempt } from './useLessonAttempt';
export { useProfileActions } from './useProfileActions';
export { useRecitationScoring } from './useRecitationScoring';
export { useStreakCalendar } from './useStreakCalendar';
export { useSurahStatuses, type SurahState } from './useSurahStatuses';
