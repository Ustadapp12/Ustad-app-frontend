import { InteractionManager } from 'react-native';
import { create } from 'zustand';
import { lessonsApi, learningApi, exerciseTypeForApi } from '../api';
import { loadLessonGroup } from '../services/cachedContent';
import { preloadAudioUrls, clearPreloadedAudio } from '../services/audioPlayer';
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
import type { ExerciseDict, LessonGroupDetail, SessionCompleteOut } from '../types/api';

let startSessionInFlight: Promise<void> | null = null;
// Incremented every time loadGroup() is called. Any async work that started
// for an older generation (i.e. a previous lesson tap) will self-abort when
// it resumes after an await and sees the generation has moved on.
let storeGeneration = 0;

function isEndedSessionError(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false;
  if (e.status === 404) return true;
  if (e.status === 400) return /session.*end|already ended|not active/i.test(e.message);
  return false;
}

interface LessonState {
  group: LessonGroupDetail | null;
  groupId: string | null;   // the ID passed to loadGroup — used in startSession to avoid relying on group.id from backend
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
  firstExercise: ExerciseDict | null;
  progressPct: number;
  loadGroup: (groupId: string) => Promise<void>;
  startSession: (initialStepIndex?: number) => Promise<void>;
  recordAttempt: (exerciseType: string, correct: boolean, mistakeCount?: number) => Promise<void>;
  nextStep: () => void;
  completeSession: () => Promise<SessionCompleteOut>;
  abandonSession: (opts?: { silent?: boolean }) => Promise<void>;
  reset: () => void;
}

export const useLessonStore = create<LessonState>((set, get) => ({
  group: null,
  groupId: null,
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
  firstExercise: null,
  progressPct: 0,

  loadGroup: async groupId => {
    const myGen = ++storeGeneration;
    startSessionInFlight = null; // discard any in-flight startSession from a previous lesson
    set({ loading: true, error: null, groupId, firstExercise: null, sessionId: null, result: null, progressPct: 0 });
    try {
      const [group, exercisesData] = await Promise.all([
        loadLessonGroup(groupId),
        lessonsApi.exercises(groupId).catch(() => null),
      ]);
      if (myGen !== storeGeneration) return; // superseded by a newer loadGroup call
      const steps = await new Promise<ExerciseStep[]>(resolve => {
        InteractionManager.runAfterInteractions(() => {
          let s: ExerciseStep[];
          if (exercisesData && exercisesData.exercises.length > 0) {
            s = buildStepsFromExerciseOut(exercisesData.exercises, group.ayahs);
            if (isListenOnlyLesson(s)) s = buildLessonSteps(group.ayahs);
          } else {
            s = buildLessonSteps(group.ayahs);
          }
          resolve(s);
        });
      });
      if (myGen !== storeGeneration) return; // superseded while building steps
      set({ group, steps, stepIndex: 0, loading: false });
      const audioUrls = [...new Set(
        steps.flatMap(s => {
          const url = (s as { ayahAudioUrl?: string | null }).ayahAudioUrl ?? s.ayah.audio_url;
          return url ? [url] : [];
        }),
      )];
      void preloadAudioUrls(audioUrls);
    } catch (e) {
      if (myGen !== storeGeneration) return;
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load lesson' });
    }
  },

  startSession: async (initialStepIndex = 0) => {
    const { group, sessionId, result } = get();
    if (!group) return;
    if (sessionId && !result) return;
    if (startSessionInFlight) return startSessionInFlight;
    const myGen = storeGeneration; // snapshot: if loadGroup fires again we self-abort
    startSessionInFlight = (async () => {
      set({ loading: true, error: null });
      try {
        await abandonPendingLessonSessionFromStorage();
        if (myGen !== storeGeneration) return; // a newer loadGroup already took over
        // Use the groupId the caller passed to loadGroup(), not group.id from the
        // backend response, which may still carry the old "114_stg1_g1" format.
        const canonicalId = get().groupId ?? group.id;
        const startOnce = () => learningApi.startSession(canonicalId);
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
        if (myGen !== storeGeneration) return; // superseded while awaiting backend
        await setPendingLessonSession({ sessionId: session.session_id, groupId: canonicalId, mistakes: 0, stepIndex: initialStepIndex });
        set({
          sessionId: session.session_id,
          heartsAtStart: session.hearts_at_start,
          loading: false,
          stepStartedAt: Date.now(),
          mistakes: 0,
          correctCount: 0,
          result: null,
          stepIndex: initialStepIndex,
          firstExercise: session.first_exercise ?? null,
          progressPct: session.progress_pct ?? 0,
        });
        void logAnalyticsEvent(AnalyticsEvents.LESSON_START, { lesson_group_id: group.id, surah_number: group.surah_number });
      } catch (e) {
        if (myGen !== storeGeneration) return; // stale error — swallow it
        const message = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Could not start session';
        set({ loading: false, error: message });
        throw e;
      } finally {
        startSessionInFlight = null;
      }
    })();
    return startSessionInFlight;
  },

  recordAttempt: async (exerciseType, correct, mistakeCount = 0) => {
    const { sessionId, mistakes, correctCount, steps, stepIndex, stepStartedAt, result } = get();
    if (!sessionId || result) return;
    const response_ms = Date.now() - stepStartedAt;
    if (!correct) set({ mistakes: mistakes + (mistakeCount || 1) });
    else set({ correctCount: correctCount + 1 });
    const sessionAttempt = learningApi.attempt(sessionId, { exercise_type: exerciseTypeForApi(exerciseType), correct, mistake_count: mistakeCount }).catch(e => { if (isEndedSessionError(e)) return null; throw e; });
    const step = steps[stepIndex];
    const exercise_id = step?.exercise_id ?? null;
    const srsAttempt = exercise_id ? learningApi.exerciseAttempt({ exercise_id, session_id: sessionId, correct, response_ms, mistake_count: mistakeCount }).catch(() => null) : Promise.resolve(null);
    await Promise.all([sessionAttempt, srsAttempt]);
    void getPendingLessonSession().then(pending => {
      if (pending?.sessionId === sessionId) void setPendingLessonSession({ ...pending, mistakes: get().mistakes });
    });
  },

  nextStep: () => {
    const newIndex = get().stepIndex + 1;
    set({ stepIndex: newIndex, stepStartedAt: Date.now() });
    const { sessionId, group, mistakes } = get();
    if (sessionId && group) void setPendingLessonSession({ sessionId, groupId: group.id, mistakes, stepIndex: newIndex });
  },

  completeSession: async () => {
    const { sessionId, steps, correctCount, mistakes, result } = get();
    if (result) return result;
    if (!sessionId) throw new Error('No session');
    const answerableSteps = steps.filter(s => s.type !== 'listen' && s.type !== 'interstitial').length;
    const score_pct = Math.round((correctCount / Math.max(answerableSteps, 1)) * 100);
    const passed = score_pct >= 70;
    const completed = await learningApi.complete(sessionId, { passed, score_pct, mistakes });
    await clearPendingLessonSession();
    set({ result: completed, sessionId: null });
    void logAnalyticsEvent(AnalyticsEvents.LESSON_COMPLETE, { passed: passed ? 1 : 0, score_pct, mistakes });
    return completed;
  },

  abandonSession: async ({ silent } = {}) => {
    const { sessionId, result, group } = get();
    clearPreloadedAudio();
    if (result) { await clearPendingLessonSession(); return; }
    const id = sessionId;
    set({ sessionId: null });
    await clearPendingLessonSession();
    try {
      if (id) await abandonLessonSessionById(id);
      await abandonActiveLessonSession();
      void logAnalyticsEvent(AnalyticsEvents.LESSON_ABANDON, { lesson_group_id: group?.id ?? '', session_id: id ?? '' });
    } catch (e) {
      if (!silent) throw e;
    }
  },

  reset: () => {
    clearPreloadedAudio();
    set({ group: null, groupId: null, steps: [], stepIndex: 0, sessionId: null, mistakes: 0, correctCount: 0, result: null, error: null, loading: false, stepStartedAt: Date.now(), firstExercise: null, progressPct: 0 });
  },
}));

