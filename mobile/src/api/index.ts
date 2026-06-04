import { api } from './client';
import type {
  AuthMeResponse,
  AuthResponse,
  AyahOut,
  JuzOut,
  LearningMe,
  LearningStats,
  LessonGroupDetail,
  LessonGroupSummary,
  LessonSessionStart,
  PlacementSubmitResponse,
  ReciterOut,
  RecommendedNext,
  RevisionNext,
  SessionCompleteOut,
  SurahBrief,
  SurahLevel,
  UserProfile,
  VerifyEmailResponse,
  VoiceAttemptResponse,
} from '../types/api';

// ── Auth ─────────────────────────────────────────────────────────

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

  me: () => api<AuthMeResponse>('/auth/me'),

  verifyEmail: (email: string, code: string) =>
    api<VerifyEmailResponse>(
      '/auth/verify-email',
      { method: 'POST', body: JSON.stringify({ email, code }) },
      false,
    ),

  resendVerification: (email: string) =>
    api<{ sent: boolean }>(
      '/auth/resend-verification',
      { method: 'POST', body: JSON.stringify({ email }) },
      false,
    ),

  forgotPassword: (email: string) =>
    api<{ sent: boolean }>(
      '/auth/forgot-password',
      { method: 'POST', body: JSON.stringify({ email }) },
      false,
    ),

  resetPassword: (email: string, code: string, new_password: string) =>
    api<{ success: boolean }>(
      '/auth/reset-password',
      { method: 'POST', body: JSON.stringify({ email, code, new_password }) },
      false,
    ),
};

// ── Users / Profile ──────────────────────────────────────────────

export const usersApi = {
  updateProfile: (body: Partial<Omit<UserProfile, 'avatar_url'> & { display_name?: string }>) =>
    api<AuthMeResponse>('/users/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

// ── Content ──────────────────────────────────────────────────────

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

  search: (q: string, mvpOnly = true) =>
    api<SurahBrief[]>(
      `/content/surahs/search?q=${encodeURIComponent(q)}&mvp_only=${mvpOnly}`,
      {},
      false,
    ),
};

// ── Lessons ──────────────────────────────────────────────────────

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

// ── Learning ─────────────────────────────────────────────────────

export const learningApi = {
  me: () => api<LearningMe>('/learning/me'),

  levels: (surahNumber: number) =>
    api<SurahLevel[]>(`/learning/surahs/${surahNumber}/levels`),

  stats: () => api<LearningStats>('/learning/stats'),

  recommendedNext: () =>
    api<RecommendedNext | null>('/learning/recommended-next'),

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

  submitPlacement: (body: {
    answers: { question_id: string; selected_index: number; correct: boolean }[];
    score_pct: number;
    level: string;
    start_surah: number;
  }) =>
    api<PlacementSubmitResponse>('/learning/placement', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── Revision ─────────────────────────────────────────────────────

export const revisionApi = {
  next: () => api<RevisionNext>('/revision/next'),

  schedule: (ayah_id: string, due_at: string) =>
    api<{ ok?: boolean }>('/revision/schedule', {
      method: 'POST',
      body: JSON.stringify({ ayah_id, due_at }),
    }),
};

// ── Progress ─────────────────────────────────────────────────────

export const progressApi = {
  voiceAttempt: (body: {
    session_id: string;
    ayah_id: string;
    duration_ms: number;
    self_rated?: boolean | null;
  }) =>
    api<VoiceAttemptResponse>('/progress/voice-attempt', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── Helpers ──────────────────────────────────────────────────────

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
