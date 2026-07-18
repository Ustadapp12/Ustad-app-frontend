export interface Tokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
  name?: string; // populated from profile.display_name after login
  email_verified: boolean;
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
  script_preference?: ScriptPreference | null; // optional, returned by some endpoints
}

export interface LeaderboardEntry {
  rank: number;
  display_name: string;
  xp: number;
  gender?: 'male' | 'female' | null;
}

export interface LeaderboardOut {
  entries: LeaderboardEntry[];
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
  first_exercise?: ExerciseDict | null;
  base_total?: number;
  correct_count?: number;
  wrong_count?: number;
  progress_pct?: number;
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
  streak_incremented: boolean;
  current_streak: number;
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
export type ScriptPreference = 'uthmani' | 'nastaliq' | 'simple' | 'amiri' | 'nastaliq_urdu';
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
  gender: 'male' | 'female' | null;
  age: number | null;
  timezone: string | null;
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

export interface HifzAssessmentStartResponse {
  assessment_id: string;
  total_questions: number;
  exercises: ExerciseDict[];
}

export interface HifzAssessmentSubmitResponse {
  assessment_id: string;
  total_questions: number;
  accuracy: number;
  accuracy_pct: number;
  time_total: number;
  time_avg: number;
  results: Array<{
    question_id: string;
    type: string;
    correct: boolean;
    time_seconds: number;
  }>;
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
  groups: SurahLevel[];
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

// ── Formula Engine (Phase 2 backend) ─────────────────────────────

export interface ExerciseToken {
  ar: string;
  blank?: boolean;          // undefined for read_and_speak tokens (all tokens are shown, none blanked)
  audio_url?: string | null; // present for read_and_speak — tap-to-hear per word
}

export interface ExerciseOptionWord {
  ar: string;
  audio_url?: string | null;
}

export interface ExerciseTile {
  ar: string;
  audio_url?: string | null;
}

export interface ExerciseDict {
  ex_id: string;
  type: 'ayah_display' | 'fill_blank' | 'audio_fill' | 'reorder' | 'next_word' | 'segment_recall' | 'sequence' | 'hear_and_select' | 'ayat_then_order' | 'read_ayah_and_speak' | 'read_and_speak' | string;
  phase: string;
  surah_no: number;
  ayah_no: number;
  seg_no: number;
  instruction: string;
  ayah_audio_url?: string | null;
  // ayah_display
  ayah_ar?: string | null;
  ayah_translation?: string | null;
  // fill_blank / next_word / audio_fill
  tokens?: ExerciseToken[] | null;
  options?: ExerciseOptionWord[] | null;
  context_before?: string[] | null;
  context_after?: string[] | null;
  // reorder / ayat_then_order
  tiles?: ExerciseTile[] | null;
  answer_len?: number | null;
  // ayat_then_order
  first_ayah_text?: string | null;
  first_ayah_audio_url?: string | null;
  // teaching mode
  word_audio_url?: string | null;
  // word-level audio (fill_blank / next_word / hear_and_select / audio_fill)
  segment_audio_urls?: string[] | null;
  // read_ayah_and_speak / read_and_speak — sent to speak-attempt for scoring
  expected_arabic?: string | null;
}

export interface SegmentStatus {
  ayah_no: number;
  seg_no: number;
  status: 'new' | 'learning' | 'mastered' | 'questionable';
  asked: number;
  wrong: number;
}

export interface FormulaAttemptIn {
  ex_id: string;
  user_answer: string | string[] | number[] | null;
  response_ms?: number;
}

export interface FormulaAttemptOut {
  correct: boolean;
  correct_answer: string | string[] | null;
  was_type: string;
  next_exercise: ExerciseDict | null;
  phase: 'view' | 'main' | 'review' | 'done';
  done: boolean;
  segments: SegmentStatus[];
  xp_awarded?: number | null;
  base_total?: number;
  correct_count?: number;
  wrong_count?: number;
  progress_pct?: number;
}

// ─────────────────────────────────────────────────────────────────

// ── Speak attempt (read_ayah_and_speak / read_and_speak) ─────────────

/** Per-word timing entry returned by Deepgram transcription. */
export interface WordTiming {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

/** Per-word correctness of the expected text, aligned against what was heard. */
export interface ExpectedWordResult {
  index: number;
  word: string;
  correct: boolean;
}

/** Response from POST /api/v1/progress/speak-attempt */
export interface SpeakAttemptResponse {
  passed: boolean;       // true when score_pct >= 60
  score_pct: number;     // 0–100
  transcript: string;    // what Deepgram heard
  word_timings: WordTiming[];
  expected_words: ExpectedWordResult[]; // expected text, word-by-word correct/wrong
}

// ─────────────────────────────────────────────────────────────────

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
  hifzAssessmentScore?: number;
  completedAt?: string;
  currentStep?: 'goal' | 'script' | 'path' | 'assessment';
}

