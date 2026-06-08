export interface Tokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

export interface LearningMe {
  user_id: string;
  hearts_remaining: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string;
  xp_total: number;
  gem_balance: number;
  mvp_surah_numbers: number[];
}

export interface SurahBrief {
  surah_number: number;
  name_ar: string;
  name_en: string;
  transliteration: string;
  ayah_count: number;
  juz: number;
  revelation: string;
}

export interface WordOut {
  position: number;
  arabic: string;
  transliteration?: string | null;
  meaning?: string | null;
  audio_rel_path?: string | null;
  audio_url?: string | null;
}

export interface AudioAsset {
  rel_path?: string | null;
  duration_s?: number | null;
  audio_url?: string | null;
}

export interface AyahOut {
  id: string;
  surah_number: number;
  ayah_number: number;
  arabic: string;
  transliteration?: string | null;
  translation_en?: string | null;
  audio_url?: string | null;
  words: WordOut[];
  audio_assets?: Record<string, AudioAsset>;
  default_reciter_id?: string | null;
}

export interface LessonGroupSummary {
  id: string;
  surah_number: number;
  start_ayah: number;
  end_ayah: number;
  ayah_ids: string[];
  difficulty: number;
  estimated_minutes: number;
  curriculum_version: number;
}

export interface LessonGroupDetail extends LessonGroupSummary {
  ayahs: AyahOut[];
}

export type LevelStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface SurahLevel {
  lesson_group_id: string;
  surah_number: number;
  start_ayah: number;
  end_ayah: number;
  status: LevelStatus;
  stars: number | null;
  score_pct: number | null;
}

export interface LessonSessionStart {
  session_id: string;
  lesson_group_id: string;
  hearts_at_start: number;
}

/** GET /learning/sessions/active — null when no in-progress session. */
export interface ActiveLessonSession {
  session_id: string;
  lesson_group_id: string;
  hearts_at_start?: number;
}

export interface SessionCompleteOut {
  session_id: string;
  passed: boolean;
  xp_awarded: number;
  hearts_remaining: number;
  stars: number;
  completion_saved: boolean;
}

export interface RevisionNext {
  ayah_id: string | null;
  due_at: string | null;
}

export interface ReciterOut {
  id: string;
  name_en: string;
  name_ar?: string;
  audio_base_url: string;
}

export interface JuzOut {
  juz_number: number;
  name_en?: string;
  name_ar?: string;
  surah_numbers: number[];
}

export type LearnerMode = 'child' | 'adult' | 'beginner' | 'placement_pending';
export type ScriptPreference = 'uthmani' | 'nastaliq' | 'simple';
export type PlacementLevel = 'beginner' | 'intermediate' | 'advanced';

// ── New backend APIs (June 2025) ──────────────────────────────────

export interface UserProfile {
  display_name: string | null;
  avatar_url: string | null;
  learner_mode: LearnerMode | null;
  script_preference: ScriptPreference | null;
  daily_goal_minutes: number | null;
  streak_goal_days: number | null;
  motivation: string | null;
}

export interface AuthMeResponse {
  user: User;
  profile: UserProfile;
}

export interface VerifyEmailResponse {
  verified: boolean;
  xp_awarded: number;
}

export interface LearningStats {
  total_sessions: number;
  total_correct: number;
  total_attempts: number;
  accuracy_pct: number;
  total_time_minutes: number;
  surahs_started: number;
  surahs_completed: number;
  weekly_xp: number[];
  best_streak: number;
  current_streak: number;
}

export interface RecommendedNext {
  surah_number: number;
  lesson_group_id: string;
  surah_name_en: string;
  surah_name_ar: string;
  level_number: number;
  status: string;
}

export interface PlacementSubmitResponse {
  placement_saved: boolean;
  xp_awarded: number;
}

export interface WordTiming {
  word: string;
  start: number; // seconds
  end: number;   // seconds
  confidence: number;
}

export interface VoiceAttemptResponse {
  passed: boolean;
  score_pct: number;
  transcript?: string | null;
  word_timings?: WordTiming[] | null;
}

// ─────────────────────────────────────────────────────────────────

export interface SurahStage {
  stage_num: number;
  stage_type: 'listening' | 'recognition' | 'building' | 'recall' | 'mastery';
  title_en: string;
  status: 'completed' | 'available' | 'in_progress' | 'locked';
  stars: number | null;
  lesson_group_ids: string[];
  xp_reward: number;
  min_pass_pct: number;
}

export interface SurahPath {
  surah_number: number;
  surah_name_en: string;
  surah_name_ar: string;
  ayah_count: number;
  stages: SurahStage[];
}

export interface ExerciseOption {
  text: string;
  is_correct: boolean;
}

export interface ExerciseOut {
  id: string | null;
  surah_no: number;
  ayah_no: number;
  type: string;
  stage: number;
  seq: number;
  prompt_en: string | null;
  prompt_ar: string | null;
  options: ExerciseOption[] | null;
  correct_idx: number | null;
  difficulty: number;
  metadata: Record<string, unknown> | null;
}

export interface ExerciseAttemptResponse {
  id: string;
  next_review_at: string;
}

export interface LessonGroupExercises {
  lesson_group_id: string;
  surah_number: number;
  stage: number;
  stage_type: string;
  estimated_minutes: number;
  needs_generation: boolean;
  exercises: ExerciseOut[];
}

export interface OnboardingAnswers {
  motivation?: string;
  script?: ScriptPreference;
  dailyGoalMinutes?: 5 | 10 | 15 | 20;
  notificationsEnabled?: boolean;
  recitationLevel?: 'none' | 'letters' | 'reads' | 'advanced';
  streakGoalDays?: 3 | 7 | 14 | 30;
  learnerMode?: LearnerMode;
  pathChoice?: 'fresh' | 'placement';
  placementLevel?: PlacementLevel;
  startSurah?: number;
  completedAt?: string;
}
