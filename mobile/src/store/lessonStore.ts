import { create } from 'zustand';
import { lessonsApi, learningApi, exerciseTypeForApi } from '../api';
import { ApiError } from '../api/client';
import { buildLessonSteps, buildStepsFromExerciseOut } from '../lesson/buildSteps';
import { isListenOnlyLesson } from '../lesson/mergeSteps';
import { AnalyticsEvents, logAnalyticsEvent } from '../services/analytics';
import {
  abandonActiveLessonSession,
  abandonLessonSessionById,
  abandonPendingLessonSessionFromStorage,
  clearPendingLessonSession,
  getPendingLessonSession,
  setPendingLessonSession,
} from '../services/lessonSession';
import type { ExerciseStep } from '../lesson/types';
import type {
  LessonGroupDetail,
  SessionCompleteOut,
} from '../types/api';

interface LessonState {
  group: LessonGroupDetail | null;
  steps: ExerciseStep[];
  stepIndex: number;
  sessionId: string | null;
  heartsAtStart: number;
  mistakes: number;
  correctCount: number;
  loading: boolean;
  error: string | null;
  result: SessionCompleteOut | null;
  stepStartedAt: number;
  loadGroup: (groupId: string) => Promise<void>;
  startSession: () => Promise<void>;
  recordAttempt: (
    exerciseType: string,
    correct: boolean,
    mistakeCount?: number,
  ) => Promise<void>;
  nextStep: () => void;
  completeSession: () => Promise<SessionCompleteOut>;
  abandonSession: (opts?: { silent?: boolean }) => Promise<void>;
  reset: () => void;
}

export const useLessonStore = create<LessonState>((set, get) => ({
  group: null,
  steps: [],
  stepIndex: 0,
  sessionId: null,
  heartsAtStart: 10,
  mistakes: 0,
  correctCount: 0,
  loading: false,
  error: null,
  result: null,
  stepStartedAt: Date.now(),

  loadGroup: async groupId => {
    set({ loading: true, error: null });
    try {
      const [group, exercisesData] = await Promise.all([
        lessonsApi.group(groupId),
        lessonsApi.exercises(groupId).catch(() => null),
      ]);
      let steps;
      if (exercisesData && exercisesData.exercises.length > 0) {
        steps = buildStepsFromExerciseOut(exercisesData.exercises, group.ayahs);
        if (isListenOnlyLesson(steps)) {
          steps = buildLessonSteps(group.ayahs);
        }
      } else {
        steps = buildLessonSteps(group.ayahs);
      }
      set({ group, steps, stepIndex: 0, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load lesson',
      });
    }
  },

  startSession: async () => {
    const { group } = get();
    if (!group) return;
    set({ loading: true, error: null });
    try {
      await abandonPendingLessonSessionFromStorage();
      await abandonActiveLessonSession().catch(() => null);

      const startOnce = () => learningApi.startSession(group.id);
      let session;
      try {
        session = await startOnce();
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          await abandonActiveLessonSession().catch(() => null);
          session = await startOnce();
        } else {
          throw e;
        }
      }

      await setPendingLessonSession({
        sessionId: session.session_id,
        groupId: group.id,
        mistakes: 0,
      });
      set({
        sessionId: session.session_id,
        heartsAtStart: session.hearts_at_start,
        loading: false,
        stepStartedAt: Date.now(),
        mistakes: 0,
        correctCount: 0,
        result: null,
      });
      void logAnalyticsEvent(AnalyticsEvents.LESSON_START, {
        lesson_group_id: group.id,
        surah_number: group.surah_number,
      });
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not start session';
      set({ loading: false, error: message });
      throw e;
    }
  },

  recordAttempt: async (exerciseType, correct, mistakeCount = 0) => {
    const { sessionId, mistakes, correctCount, steps, stepIndex, stepStartedAt } = get();
    if (!sessionId) return;
    const response_ms = Date.now() - stepStartedAt;
    if (!correct) {
      set({ mistakes: mistakes + (mistakeCount || 1) });
    } else {
      set({ correctCount: correctCount + 1 });
    }
    const sessionAttempt = learningApi.attempt(sessionId, {
      exercise_type: exerciseTypeForApi(exerciseType),
      correct,
      mistake_count: mistakeCount,
    });
    const step = steps[stepIndex];
    const exercise_id = step?.exercise_id ?? null;
    const srsAttempt = exercise_id
      ? learningApi.exerciseAttempt({
          exercise_id,
          session_id: sessionId,
          correct,
          response_ms,
          mistake_count: mistakeCount,
        }).catch(() => null)
      : Promise.resolve(null);
    await Promise.all([sessionAttempt, srsAttempt]);
    const pending = await getPendingLessonSession();
    if (pending?.sessionId === sessionId) {
      await setPendingLessonSession({ ...pending, mistakes: get().mistakes });
    }
  },

  nextStep: () => {
    set({ stepIndex: get().stepIndex + 1, stepStartedAt: Date.now() });
  },

  completeSession: async () => {
    const { sessionId, steps, correctCount, mistakes } = get();
    if (!sessionId) throw new Error('No session');
    const score_pct = Math.round((correctCount / Math.max(steps.length, 1)) * 100);
    const passed = score_pct >= 70;
    const result = await learningApi.complete(sessionId, {
      passed,
      score_pct,
      mistakes,
    });
    await clearPendingLessonSession();
    set({ result, sessionId: null });
    void logAnalyticsEvent(AnalyticsEvents.LESSON_COMPLETE, {
      passed: passed ? 1 : 0,
      score_pct,
      mistakes,
    });
    return result;
  },

  abandonSession: async ({ silent } = {}) => {
    const { sessionId, result, group } = get();
    if (result) {
      await clearPendingLessonSession();
      return;
    }
    const id = sessionId;
    set({ sessionId: null });
    await clearPendingLessonSession();
    try {
      if (id) {
        await abandonLessonSessionById(id);
      }
      await abandonActiveLessonSession();
      void logAnalyticsEvent(AnalyticsEvents.LESSON_ABANDON, {
        lesson_group_id: group?.id ?? '',
        session_id: id ?? '',
      });
    } catch (e) {
      if (!silent) {
        throw e;
      }
    }
  },

  reset: () =>
    set({
      group: null,
      steps: [],
      stepIndex: 0,
      sessionId: null,
      mistakes: 0,
      correctCount: 0,
      result: null,
      error: null,
      stepStartedAt: Date.now(),
    }),
}));
