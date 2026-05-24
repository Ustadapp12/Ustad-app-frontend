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
  transliteration: string;
  audio_rel_path: string;
  audio_url: string;
}

export interface AudioAsset {
  rel_path: string;
  audio_url: string;
  duration_s: number | null;
}

export interface AyahOut {
  id: string;
  surah_number: number;
  ayah_number: number;
  arabic: string;
  transliteration: string;
  translation_en: string;
  words: WordOut[];
  audio_assets: Record<string, AudioAsset>;
  default_reciter_id: string;
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

export type LearnerMode = 'child' | 'adult' | 'beginner';
export type ScriptPreference = 'uthmani' | 'nastaliq' | 'simple';
export type PlacementLevel = 'beginner' | 'intermediate' | 'advanced';

export interface OnboardingAnswers {
  motivation?: string;
  script?: ScriptPreference;
  dailyGoalMinutes?: 5 | 10 | 15 | 20;
  notificationsEnabled?: boolean;
  streakGoalDays?: 3 | 7 | 14 | 30;
  learnerMode?: LearnerMode;
  pathChoice?: 'fresh' | 'placement';
  placementLevel?: PlacementLevel;
  startSurah?: number;
  completedAt?: string;
}
