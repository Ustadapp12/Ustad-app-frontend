import { create } from 'zustand';
import { lessonsApi, learningApi } from '../api';
import { loadLessonGroup } from '../services/cachedContent';
import { preloadAudioUrls, clearPreloadedAudio } from '../services/audioPlayer';
import { ApiError } from '../api/client';
import { addBreadcrumb } from '../services/crashReporter';
import { buildLessonSteps, buildStepsFromExerciseOut } from '../lesson/buildSteps';
import { isListenOnlyLesson } from '../lesson/mergeSteps';
import { AnalyticsEvents, logAnalyticsEvent } from '../services/analytics';
import { invalidateLevels } from '../services/bootCache';
import {
  abandonActiveLessonSession,
  abandonLessonSessionById,
  abandonPendingLessonSessionFromStorage,
  clearPendingLessonSession,
  setPendingLessonSession,
} from '../services/lessonSession';
import type { ExerciseStep } from '../lesson/types';
import type { ExerciseDict, LessonGroupDetail, SessionCompleteOut } from '../types/api';

let startSessionInFlight: Promise<void> | null = null;
// Incremented every time loadGroup() is called. Any async work that started
// for an older generation (i.e. a previous lesson tap) will self-abort when
// it resumes after an await and sees the generation has moved on.
let storeGeneration = 0;

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
  // Surah number of the level just completed, for MapScreen to pick up on its
  // next focus — MapScreen only remounts once for the app's lifetime (it sits
  // underneath the lesson screens in the same stack), so its own cached level
  // data for that surah otherwise never gets told to refresh.
  lastCompletedSurah: number | null;
  loadGroup: (groupId: string) => Promise<void>;
  startSession: (initialStepIndex?: number) => Promise<void>;
  completeSession: () => Promise<SessionCompleteOut>;
  abandonSession: (opts?: { silent?: boolean }) => Promise<void>;
  clearLastCompletedSurah: () => void;
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
  lastCompletedSurah: null,

  loadGroup: async groupId => {
    const myGen = ++storeGeneration;
    startSessionInFlight = null; // discard any in-flight startSession from a previous lesson
    addBreadcrumb('loadGroup: start', { groupId });
    set({ loading: true, error: null, groupId, firstExercise: null, sessionId: null, result: null, progressPct: 0 });
    try {
      const [group, exercisesData] = await Promise.all([
        loadLessonGroup(groupId),
        lessonsApi.exercises(groupId).catch(() => null),
      ]);
      if (myGen !== storeGeneration) {
        addBreadcrumb('loadGroup: superseded after fetch', { groupId });
        return;
      }
      addBreadcrumb('loadGroup: group+exercises fetched', { groupId, exerciseCount: exercisesData?.exercises.length ?? 0 });
      // Deferred with a plain setTimeout rather than
      // InteractionManager.runAfterInteractions(): that API waits for every
      // pending "interaction handle" app-wide to clear, including React
      // Navigation's own screen-transition animation — if that transition's
      // completion signal doesn't fire cleanly (a known flaky spot), this
      // callback would sit queued forever, hanging the loading screen
      // indefinitely with no exception ever thrown (nothing here to catch).
      // setTimeout always fires on the next tick regardless of any other
      // subsystem's state, while still deferring this off the current render.
      const steps = await new Promise<ExerciseStep[]>((resolve, reject) => {
        setTimeout(() => {
          try {
            let s: ExerciseStep[];
            if (exercisesData && exercisesData.exercises.length > 0) {
              s = buildStepsFromExerciseOut(exercisesData.exercises, group.ayahs);
              if (isListenOnlyLesson(s)) s = buildLessonSteps(group.ayahs);
            } else {
              s = buildLessonSteps(group.ayahs);
            }
            resolve(s);
          } catch (e) {
            reject(e);
          }
        }, 0);
      });
      if (myGen !== storeGeneration) {
        addBreadcrumb('loadGroup: superseded after steps built', { groupId });
        return;
      }
      addBreadcrumb('loadGroup: steps built', { groupId, stepCount: steps.length });
      set({ group, steps, stepIndex: 0, loading: false });
      const audioUrls = [...new Set(
        steps.flatMap(s => {
          const url = (s as { ayahAudioUrl?: string | null }).ayahAudioUrl ?? s.ayah.audio_url;
          return url ? [url] : [];
        }),
      )];
      void preloadAudioUrls(audioUrls);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load lesson';
      addBreadcrumb('loadGroup: failed', { groupId, error: message });
      if (myGen !== storeGeneration) return;
      set({ loading: false, error: message });
    }
  },

  startSession: async (initialStepIndex = 0) => {
    const { group, sessionId, result } = get();
    if (!group) return;
    if (sessionId && !result) return;
    if (startSessionInFlight) return startSessionInFlight;
    const myGen = storeGeneration; // snapshot: if loadGroup fires again we self-abort
    addBreadcrumb('startSession: start', { groupId: group.id, initialStepIndex });
    startSessionInFlight = (async () => {
      set({ loading: true, error: null });
      try {
        await abandonPendingLessonSessionFromStorage();
        if (myGen !== storeGeneration) {
          addBreadcrumb('startSession: superseded before request', { groupId: group.id });
          return; // a newer loadGroup already took over
        }
        // Use the groupId the caller passed to loadGroup(), not group.id from the
        // backend response, which may still carry the old "114_stg1_g1" format.
        const canonicalId = get().groupId ?? group.id;
        const startOnce = () => learningApi.startSession(canonicalId);
        let session;
        try {
          session = await startOnce();
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) {
            addBreadcrumb('startSession: 409 conflict, abandoning + retrying', { groupId: canonicalId });
            await abandonActiveLessonSession().catch(() => null);
            session = await startOnce();
          } else {
            throw e;
          }
        }
        if (myGen !== storeGeneration) {
          addBreadcrumb('startSession: superseded after request', { groupId: canonicalId });
          return; // superseded while awaiting backend
        }
        addBreadcrumb('startSession: session created', { groupId: canonicalId, sessionId: session.session_id, hasFirstExercise: !!session.first_exercise });
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
        const message = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Could not start session';
        addBreadcrumb('startSession: failed', { groupId: group.id, error: message });
        if (myGen !== storeGeneration) return; // stale error — swallow it
        set({ loading: false, error: message });
        throw e;
      } finally {
        startSessionInFlight = null;
      }
    })();
    return startSessionInFlight;
  },

  completeSession: async () => {
    const { sessionId, steps, correctCount, mistakes, result, group } = get();
    if (result) return result;
    if (!sessionId) throw new Error('No session');
    const answerableSteps = steps.filter(s => s.type !== 'listen' && s.type !== 'interstitial').length;
    const score_pct = Math.round((correctCount / Math.max(answerableSteps, 1)) * 100);
    const passed = score_pct >= 70;
    const completed = await learningApi.complete(sessionId, { passed, score_pct, mistakes });
    await clearPendingLessonSession();
    set({ result: completed, sessionId: null });
    // The completed group's status/stars just changed server-side — drop the
    // stale cached levels so the map re-fetches instead of continuing to show
    // pre-completion statuses (was never invalidated, so the map/next node
    // silently kept showing whatever was cached before this lesson started).
    if (group?.surah_number != null) {
      invalidateLevels([group.surah_number]);
      set({ lastCompletedSurah: group.surah_number });
    }
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

  clearLastCompletedSurah: () => set({ lastCompletedSurah: null }),

  reset: () => {
    clearPreloadedAudio();
    set({ group: null, groupId: null, steps: [], stepIndex: 0, sessionId: null, mistakes: 0, correctCount: 0, result: null, error: null, loading: false, stepStartedAt: Date.now(), firstExercise: null, progressPct: 0, lastCompletedSurah: null });
  },
}));

