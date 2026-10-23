import { useMemo } from 'react';
import { learningApi } from '../../api';

type SubmitBody = Parameters<typeof learningApi.hifzAssessmentSubmit>[0];

/** The onboarding placement assessment: fetch the questions, submit answers.
 * Throws what the API throws (2026-10-22). */
export function useHifzAssessment() {
  return useMemo(() => ({
    start: () => learningApi.hifzAssessmentStart(),
    submit: (body: SubmitBody) => learningApi.hifzAssessmentSubmit(body),
  }), []);
}
