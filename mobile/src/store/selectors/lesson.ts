import type { LessonState } from '../lessonStore';

// One exact value per selector; see selectors/auth.ts for why. The lesson
// store changes on every answer, so reading it whole redrew the entire
// lesson screen for fields it never shows.
export const selectLessonSessionId = (s: LessonState) => s.sessionId;
export const selectLessonFirstExercise = (s: LessonState) => s.firstExercise;
export const selectLessonError = (s: LessonState) => s.error;
export const selectLessonLoading = (s: LessonState) => s.loading;
export const selectLessonGroup = (s: LessonState) => s.group;
export const selectLessonReset = (s: LessonState) => s.reset;
export const selectLessonLoadGroup = (s: LessonState) => s.loadGroup;
export const selectLessonStartSession = (s: LessonState) => s.startSession;
export const selectLessonCompleteSession = (s: LessonState) => s.completeSession;
export const selectLessonAbandonSession = (s: LessonState) => s.abandonSession;
export const selectLessonGroupId = (s: LessonState) => s.groupId;
export const selectLessonProgressPct = (s: LessonState) => s.progressPct;
export const selectLessonResumed = (s: LessonState) => s.resumed;
export const selectLessonCorrectCount = (s: LessonState) => s.correctCount;
export const selectLessonMistakes = (s: LessonState) => s.mistakes;
export const selectLessonWrongCount = (s: LessonState) => s.wrongCount;
export const selectLessonSessionStartedAt = (s: LessonState) => s.sessionStartedAt;
export const selectLessonXpEarnedSoFar = (s: LessonState) => s.xpEarnedSoFar;
