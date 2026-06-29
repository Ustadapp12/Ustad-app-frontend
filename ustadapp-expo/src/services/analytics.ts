export const AnalyticsEvents = {
  LOGIN: 'login',
  SIGN_UP: 'sign_up',
  LESSON_START: 'lesson_start',
  LESSON_COMPLETE: 'lesson_complete',
  LESSON_ABANDON: 'lesson_abandon',
  EXERCISE_CORRECT: 'exercise_correct',
  EXERCISE_INCORRECT: 'exercise_incorrect',
} as const;

export async function logAnalyticsEvent(event: string, params?: Record<string, unknown>): Promise<void> {
  if (__DEV__) console.log('[Analytics]', event, params);
}

export async function setAnalyticsUserId(userId: string | null): Promise<void> {
  if (__DEV__) console.log('[Analytics] userId:', userId);
}

export async function setUserProperties(props: Record<string, unknown>): Promise<void> {
  if (__DEV__) console.log('[Analytics] userProps:', props);
}

