import { create } from 'zustand';
import { lessonsApi, learningApi, exerciseTypeForApi } from '../api';
import { ApiError } from '../api/client';
import { buildLessonSteps } from '../lesson/buildSteps';
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
  loadGroup: (groupId: string) => Promise<void>;
  startSession: () => Promise<void>;
  recordAttempt: (
    exerciseType: string,
    correct: boolean,
    mistakeCount?: number,
  ) => Promise<void>;
  nextStep: () => void;
  completeSession: () => Promise<SessionCompleteOut>;
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

  loadGroup: async groupId => {
    set({ loading: true, error: null });
    try {
      const group = await lessonsApi.group(groupId);
      const steps = buildLessonSteps(group.ayahs);
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
      const session = await learningApi.startSession(group.id);
      set({
        sessionId: session.session_id,
        heartsAtStart: session.hearts_at_start,
        loading: false,
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
    const { sessionId, mistakes, correctCount } = get();
    if (!sessionId) return;
    if (!correct) {
      set({ mistakes: mistakes + (mistakeCount || 1) });
    } else {
      set({ correctCount: correctCount + 1 });
    }
    await learningApi.attempt(sessionId, {
      exercise_type: exerciseTypeForApi(exerciseType),
      correct,
      mistake_count: mistakeCount,
    });
  },

  nextStep: () => {
    set({ stepIndex: get().stepIndex + 1 });
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
    set({ result });
    return result;
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
    }),
}));
