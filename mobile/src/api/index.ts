import { api } from './client';
import { getTokens } from '../utils/storage';
import type {
  AuthMeResponse,
  AuthResponse,
  AyahOut,
  ExerciseAttemptResponse,
  ExerciseOut,
  FormulaAttemptIn,
  FormulaAttemptOut,
  JuzOut,
  LearningMe,
  LearningStats,
  LessonGroupDetail,
  LessonGroupExercises,
  LessonGroupSummary,
  ActiveLessonSession,
  LessonSessionStart,
  PlacementSubmitResponse,
  ReciterOut,
  RecommendedNext,
  RevisionNext,
  SessionCompleteOut,
  SpeakAttemptResponse,
  SurahBrief,
  SurahLevel,
  SurahPath,
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

type ProfilePatch = Partial<Omit<UserProfile, 'avatar_url'> & { display_name?: string }>;

export const usersApi = {
  updateProfile: (body: ProfilePatch) =>
    api<AuthMeResponse>('/users/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteAccount: (password: string) =>
    api<void>('/users/me/delete', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
};

/** PATCH profile only when logged in — safe during pre-auth onboarding. */
export async function updateProfileIfAuthed(body: ProfilePatch): Promise<void> {
  const tokens = await getTokens();
  if (!tokens?.access_token) return;
  await usersApi.updateProfile(body).catch(() => undefined);
}

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

  surahPath: (surahNumber: number) =>
    api<SurahPath>(`/lessons/surahs/${surahNumber}/path`),

  exercises: (groupId: string) =>
    api<LessonGroupExercises>(`/lessons/groups/${groupId}/exercises`, {}, false),
};

// ── Learning ─────────────────────────────────────────────────────

export const learningApi = {
  me: () => api<LearningMe>('/learning/me'),

  levels: (surahNumber: number) =>
    api<SurahLevel[]>(`/learning/surahs/${surahNumber}/levels`),

  /** Batched, lightweight status of just the first group of each surah — O(1)
   * backend round-trips regardless of how many surahs are requested. */
  firstLevels: (surahNumbers: number[]) =>
    api<SurahLevel[]>(
      `/learning/surahs/first-levels?${surahNumbers.map(n => `surah_numbers=${n}`).join('&')}`,
    ),

  stats: () => api<LearningStats>('/learning/stats'),

  recommendedNext: () =>
    api<RecommendedNext | null>('/learning/recommended-next'),

  startSession: (lesson_group_id: string) =>
    api<LessonSessionStart>('/learning/sessions', {
      method: 'POST',
      body: JSON.stringify({ lesson_group_id }),
    }),

  activeSession: () =>
    api<ActiveLessonSession | null>('/learning/sessions/active'),

  abandonActive: () =>
    api<{ ok?: boolean }>('/learning/sessions/abandon-active', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  abandonSession: (sessionId: string) =>
    api<{ ok?: boolean }>(`/learning/sessions/${sessionId}/abandon`, {
      method: 'POST',
      body: JSON.stringify({}),
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

  weakExercises: (limit = 20) =>
    api<ExerciseOut[]>(`/learning/weak-exercises?limit=${limit}`),

  exerciseAttempt: (body: {
    exercise_id: string;
    session_id: string;
    correct: boolean;
    response_ms: number;
    mistake_count: number;
  }) =>
    api<ExerciseAttemptResponse>('/learning/exercise-attempts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  formulaAttempt: (sessionId: string, body: FormulaAttemptIn) =>
    api<FormulaAttemptOut>(`/learning/sessions/${sessionId}/formula-attempt`, {
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
  /**
   * Score a read_ayah_and_speak or read_and_speak recitation.
   * Always sends multipart/form-data with the recorded audio file.
   */
  speakAttempt: (body: {
    expected_arabic: string; // the text shown to the user (from exercise.expected_arabic)
    audioUri: string;        // local URI of the recorded file
    audioType?: string;      // MIME type, defaults to audio/m4a
  }) => {
    const { expected_arabic, audioUri, audioType = 'audio/m4a' } = body;
    // Filename extension must match the declared MIME type — Android records
    // audio/mp4 (see LessonSessionScreen's speak handlers), and a mismatched
    // .m4a filename on an audio/mp4 upload can trip up server-side format
    // sniffing for the transcription service.
    const ext = audioType.split('/')[1] ?? 'm4a';
    const form = new FormData();
    form.append('expected_arabic', expected_arabic);
    form.append('audio', {
      uri: audioUri,
      name: `recitation.${ext}`,
      type: audioType,
    } as unknown as Blob);
    return api<SpeakAttemptResponse>('/progress/speak-attempt', {
      method: 'POST',
      body: form,
    });
  },

  /**
   * Submit a recitation attempt.
   * When audioUri is provided, sends multipart/form-data with the audio file.
   * Falls back to JSON-only (duration_ms) when no recording is available.
   */
  voiceAttempt: (body: {
    session_id: string;
    ayah_id: string;
    duration_ms?: number;
    audioUri?: string;
    audioType?: string;
  }) => {
    const { session_id, ayah_id, audioUri, audioType = 'audio/m4a' } = body;
    if (audioUri) {
      const form = new FormData();
      form.append('ayah_id', ayah_id);
      form.append('session_id', session_id);
      form.append('audio', {
        uri: audioUri,
        name: 'recitation.m4a',
        type: audioType,
      } as unknown as Blob);
      return api<VoiceAttemptResponse>('/progress/voice-attempt', {
        method: 'POST',
        body: form,
      });
    }
    // Legacy fallback (no recording library available)
    return api<VoiceAttemptResponse>('/progress/voice-attempt', {
      method: 'POST',
      body: JSON.stringify({ session_id, ayah_id, duration_ms: body.duration_ms ?? 0 }),
    });
  },
};

// ── Helpers ──────────────────────────────────────────────────────

/** Map client exercise step types to API logging keys. */
export function exerciseTypeForApi(clientType: string): string {
  switch (clientType) {
    case 'listen':
    case 'ayah_display':
      return 'listen';
    case 'fill_blank':
    case 'next_word':
      return 'fill_blank';
    case 'reorder':
    case 'segment_recall':
      return 'recall';
    case 'hear_and_select':
      return 'hear_and_select';
    default:
      return clientType;
  }
}

