import { useCallback } from 'react';
import { feedbackApi } from '../../api';

type FeedbackBody = Parameters<typeof feedbackApi.submit>[0];

/** Sends in-app feedback. Throws what the API throws (2026-10-22). */
export function useFeedback() {
  return useCallback((body: FeedbackBody) => feedbackApi.submit(body), []);
}
