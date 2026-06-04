import AsyncStorage from '@react-native-async-storage/async-storage';
import { learningApi } from '../api';
import { ApiError } from '../api/client';

const PENDING_KEY = '@ustadapp/pending-lesson-session/v1';

export type PendingLessonSession = {
  sessionId: string;
  groupId: string;
  mistakes: number;
};

export async function setPendingLessonSession(
  pending: PendingLessonSession,
): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export async function getPendingLessonSession(): Promise<PendingLessonSession | null> {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingLessonSession;
  } catch {
    return null;
  }
}

export async function clearPendingLessonSession(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}

function isBenignAbandonError(e: unknown): boolean {
  return (
    e instanceof ApiError &&
    (e.status === 400 || e.status === 404 || e.status === 409)
  );
}

/**
 * POST /learning/sessions/abandon-active — use on background, app close, leave lesson.
 */
export async function abandonActiveLessonSession(): Promise<void> {
  try {
    await learningApi.abandonActive();
  } catch (e) {
    if (!isBenignAbandonError(e)) {
      throw e;
    }
  }
}

/** POST /learning/sessions/{id}/abandon when a specific session id is known. */
export async function abandonLessonSessionById(sessionId: string): Promise<void> {
  try {
    await learningApi.abandonSession(sessionId);
  } catch (e) {
    if (!isBenignAbandonError(e)) {
      throw e;
    }
  }
}

/**
 * Clear any server-side active session (abandon-active + optional stored id).
 * Call on cold start before loading levels.
 */
export async function abandonPendingLessonSessionFromStorage(): Promise<void> {
  const pending = await getPendingLessonSession();
  await clearPendingLessonSession();
  if (pending?.sessionId) {
    try {
      await abandonLessonSessionById(pending.sessionId);
    } catch {
      // fall through to abandon-active
    }
  }
  try {
    await abandonActiveLessonSession();
  } catch {
    // Best-effort — must not block app open or new lessons
  }
}

/** Best-effort abandon-active (never throws). For AppState / fire-and-forget. */
export function abandonActiveLessonSessionSilent(): void {
  void abandonActiveLessonSession().catch(() => {});
}
