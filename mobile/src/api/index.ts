import { api } from './client';
import { getTokens } from '../utils/storage';
import { getDeviceTimezone } from '../utils/timezone';
import type {
  AuthMeResponse,
  AuthResponse,
  AyahOut,
  ExerciseAttemptResponse,
  ExerciseOut,
  FormulaAttemptIn,
  FormulaAttemptOut,
  HifzAssessmentStartResponse,
  HifzAssessmentSubmitResponse,
  JuzOut,
  LearningMe,
  LearningStats,
  LeaderboardOut,
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
      { retryOnNetworkError: true },
    ),

  login: (body: { email: string; password: string }) =>
    api<AuthResponse>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(body) },
      false,
      { retryOnNetworkError: true },
    ),

  // Starts an unclaimed account (email null) so a first-time user can play
  // immediately. Unauthenticated — this is what mints the first token pair.
  guest: () =>
    api<AuthResponse>('/auth/guest', { method: 'POST' }, false),

  // Sign in, sign up, and guest conversion all at once — only the server can
  // tell them apart, by checking whether the verified Google email already has
  // an account, and it reports which happened via `account_action`.
  //
  // auth: true on purpose (note register/login pass false). The caller is
  // normally a guest, and sending that bearer is what lets the server claim
  // that exact row instead of orphaning it. api() omits the header when no
  // token exists, so a genuinely signed-out caller still works.
  google: (body: {
    id_token: string;
    pending_xp: number;
    pending_streak: number;
  }) =>
    api<AuthResponse>(
      '/auth/google',
      { method: 'POST', body: JSON.stringify(body) },
      true,
      { retryOnNetworkError: true },
    ),

  // Claims the *current* guest account by attaching credentials to the same
  // user row, so level progress survives. pending_xp/pending_streak hand back
  // what the guest earned but was never banked (the server clamps them).
  upgradeGuest: (body: {
    email: string;
    password: string;
    display_name?: string;
    pending_xp: number;
    pending_streak: number;
  }) =>
    api<AuthResponse>('/auth/guest/upgrade', {
      method: 'POST',
      body: JSON.stringify(body),
    }, true, { retryOnNetworkError: true }),

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
    api<{ sent: boolean; retry_after_seconds?: number }>(
      '/auth/forgot-password',
      { method: 'POST', body: JSON.stringify({ email }) },
      false,
    ),

  // Checks the code without consuming it — safe to call as the code-entry
  // screen's own "Confirm" step before the user ever sees the new-password
  // screen. The code is still re-validated (and this time consumed) by
  // resetPassword below.
  verifyResetCode: (email: string, code: string) =>
    api<{ valid: boolean }>(
      '/auth/verify-reset-code',
      { method: 'POST', body: JSON.stringify({ email, code }) },
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

  // Password is optional because Google-only accounts have none. The server
  // requires it whenever the row does have a password, and otherwise treats a
  // valid access token as sufficient confirmation.
  deleteAccount: (password?: string) =>
    api<void>('/users/me/delete', {
      method: 'POST',
      body: JSON.stringify({ password: password ?? null }),
    }),

  updateGender: (gender: 'male' | 'female') =>
    api<{ gender: string }>('/users/me/gender', {
      method: 'PATCH',
      body: JSON.stringify({ gender }),
    }),

  updateAge: (age: number) =>
    api<{ age: number }>('/users/me/age', {
      method: 'PATCH',
      body: JSON.stringify({ age }),
    }),

  updateName: (name: string) =>
    api<{ name: string }>('/users/me/name', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
};

/** PATCH profile only when logged in — safe during pre-auth onboarding. */
export async function updateProfileIfAuthed(body: ProfilePatch): Promise<void> {
  const tokens = await getTokens();
  if (!tokens?.access_token) return;
  await usersApi.updateProfile(body).catch(() => undefined);
}

/** Best-effort sync of the device's IANA timezone — keeps streak day boundaries
 * anchored to the user's real local day. Call on login/register and app foreground. */
export function syncDeviceTimezone(): Promise<void> {
  return updateProfileIfAuthed({ timezone: getDeviceTimezone() });
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

  hifzAssessmentStart: () =>
    api<HifzAssessmentStartResponse>('/onboarding/hifz-assessment', {
      method: 'GET',
    }),

  hifzAssessmentSubmit: (body: {
    answers: Array<{ question_id: string; user_answer: string | string[]; time_seconds: number }>;
    total_time_seconds: number;
  }) =>
    api<HifzAssessmentSubmitResponse>('/onboarding/hifz-assessment/submit', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── Leaderboard ──────────────────────────────────────────────────

export const leaderboardApi = {
  top: () => api<LeaderboardOut>('/leaderboard'),
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

// ── Feedback ─────────────────────────────────────────────────────

export const feedbackApi = {
  // Guests have a real bearer token (see authApi.guest), so this rides the
  // default auth: true like any other call and the backend can attach the
  // submitting user's id when one is present — it never requires it.
  submit: (body: {
    message: string;
    rating?: number; // 1-5, omitted if the user skipped the emoji rating
    name?: string;
    email?: string;
  }) =>
    api<{ success: boolean }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── Usage sessions ───────────────────────────────────────────────
// App-foreground-to-background envelope, distinct from a lesson session —
// see services/usageSession.ts for the AppState wiring that calls these.

// Redeclared rather than imported from usageSession.ts, which imports
// usageApi from this file — importing the type back would be circular.
type EntryMethod = 'login' | 'register' | 'guest' | 'guest_upgrade' | 'google_login' | 'google_signup' | 'resume';

export const usageApi = {
  startSession: (body: { platform: string; app_version?: string; device_model?: string; os_version?: string; entry_method?: EntryMethod }) =>
    api<{ session_id: string }>('/usage/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  endSession: (sessionId: string, body: { last_screen?: string; previous_screen?: string } = {}) =>
    api<{ session_id: string; duration_s: number }>(`/usage/sessions/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
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

