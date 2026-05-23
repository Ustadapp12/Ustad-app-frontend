import { api } from './client';
import type {
  AuthResponse,
  AyahOut,
  LearningMe,
  LessonGroupDetail,
  LessonGroupSummary,
  LessonSessionStart,
  RevisionNext,
  SessionCompleteOut,
  SurahBrief,
  SurahLevel,
} from '../types/api';

export const authApi = {
  register: (body: {
    email: string;
    password: string;
    display_name?: string;
  }) =>
    api<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }, false),

  login: (body: { email: string; password: string }) =>
    api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }, false),
};

export const contentApi = {
  surahs: (juz = 30, mvpOnly = true) =>
    api<SurahBrief[]>(
      `/content/surahs?juz=${juz}&mvp_only=${mvpOnly}`,
      {},
      false,
    ),

  surah: (n: number) => api<SurahBrief>(`/content/surahs/${n}`, {}, false),

  ayah: (surah: number, ayah: number) =>
    api<AyahOut>(`/content/surahs/${surah}/ayahs/${ayah}`, {}, false),
};

export const lessonsApi = {
  groups: (surahNumber: number) =>
    api<LessonGroupSummary[]>(`/lessons/surahs/${surahNumber}/groups`, {}, false),

  group: (groupId: string) =>
    api<LessonGroupDetail>(`/lessons/groups/${groupId}`, {}, false),
};

export const learningApi = {
  me: () => api<LearningMe>('/learning/me'),

  levels: (surahNumber: number) =>
    api<SurahLevel[]>(`/learning/surahs/${surahNumber}/levels`),

  startSession: (lesson_group_id: string) =>
    api<LessonSessionStart>('/learning/sessions', {
      method: 'POST',
      body: JSON.stringify({ lesson_group_id }),
    }),

  attempt: (
    sessionId: string,
    body: {
      exercise_type: string;
      correct: boolean;
      mistake_count: number;
      detail?: Record<string, unknown> | null;
    },
  ) =>
    api<{ id: string }>(`/learning/sessions/${sessionId}/attempts`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  complete: (
    sessionId: string,
    body: { passed: boolean; score_pct: number; mistakes: number },
  ) =>
    api<SessionCompleteOut>(`/learning/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const revisionApi = {
  next: () => api<RevisionNext>('/revision/next'),
};
