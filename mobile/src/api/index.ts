import { api } from './client';
import type {
  AuthResponse,
  AyahOut,
  JuzOut,
  LearningMe,
  LessonGroupDetail,
  LessonGroupSummary,
  LessonSessionStart,
  ReciterOut,
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
    api<AuthResponse>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(body) },
      false,
    ),

  login: (body: { email: string; password: string }) =>
    api<AuthResponse>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(body) },
      false,
    ),
};

export const contentApi = {
  juz: (n = 30) => api<JuzOut>(`/content/juz/${n}`, {}, false),

  surahs: (juz = 30, mvpOnly = true) =>
    api<SurahBrief[]>(
      `/content/surahs?juz=${juz}&mvp_only=${mvpOnly}`,
      {},
      false,
    ),

  surah: (n: number, mvpOnly = true) =>
    api<SurahBrief>(`/content/surahs/${n}?mvp_only=${mvpOnly}`, {}, false),

  ayah: (surah: number, ayah: number) =>
    api<AyahOut>(`/content/surahs/${surah}/ayahs/${ayah}`, {}, false),

  reciters: () => api<ReciterOut[]>('/content/reciters', {}, false),
};

export const lessonsApi = {
  groups: (surahNumber: number) =>
    api<LessonGroupSummary[]>(
      `/lessons/surahs/${surahNumber}/groups`,
      {},
      false,
    ),

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

  schedule: (ayah_id: string, due_at: string) =>
    api<{ ok?: boolean }>('/revision/schedule', {
      method: 'POST',
      body: JSON.stringify({ ayah_id, due_at }),
    }),
};

/** Map client exercise step types to API logging keys. */
export function exerciseTypeForApi(clientType: string): string {
  switch (clientType) {
    case 'listen':
      return 'listen';
    case 'fill_blank':
      return 'fill_blank';
    case 'reorder':
      return 'recall';
    case 'match_meaning':
    case 'mcq':
      return 'recall';
    case 'listen_repeat':
      return 'voice_check';
    case 'interstitial':
      return 'listen';
    default:
      return clientType;
  }
}
