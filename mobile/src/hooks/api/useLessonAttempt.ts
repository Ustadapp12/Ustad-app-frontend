import { useCallback } from 'react';
import { learningApi } from '../../api';

type AttemptBody = Parameters<typeof learningApi.formulaAttempt>[1];

/**
 * Submits one answer in a running lesson. A stable function (same identity
 * every render), so LessonSessionScreen's submitAnswer, which calls it,
 * behaves exactly as when it called the API directly (2026-10-22). Throws
 * what the API throws.
 */
export function useLessonAttempt() {
  return useCallback(
    (sessionId: string, body: AttemptBody) => learningApi.formulaAttempt(sessionId, body),
    [],
  );
}
