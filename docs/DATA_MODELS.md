# Data Models — API & Client

Types mirror the FastAPI backend today. Use these for `api/` layer and Zustand/React Query caches.

---

## Auth

```typescript
export interface RegisterIn {
  email: string;
  password: string; // 8–128 chars
  display_name?: string;
}

export interface LoginIn {
  email: string;
  password: string;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
}

export interface User {
  id: string;
  email: string;
  role: 'learner' | 'admin';
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}
```

---

## Learning profile (`GET /learning/me`)

```typescript
export interface LearningMe {
  user_id: string;
  hearts_remaining: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string; // ISO date
  xp_total: number;
  gem_balance: number;
  mvp_surah_numbers: number[];
}
```

---

## Content

```typescript
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
  id: string; // "078_001"
  surah_number: number;
  ayah_number: number;
  arabic: string;
  transliteration: string;
  translation_en: string;
  words: WordOut[];
  audio_assets: Record<string, AudioAsset>; // key: reciter_id e.g. "husary"
  default_reciter_id: string;
}

export interface Reciter {
  id: string;
  reciter_id: string;
  name: string;
  style: string;
  audio_base_url: string;
  path_template: string;
}

export interface LessonGroupSummary {
  id: string; // "078_group_1"
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
```

---

## Progression

```typescript
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

export interface ExerciseAttemptIn {
  exercise_type: string;
  correct: boolean;
  mistake_count: number;
  detail?: Record<string, unknown> | null;
}

export interface SessionCompleteIn {
  passed: boolean;
  score_pct: number; // 0–100
  mistakes: number;
}

export interface SessionCompleteOut {
  session_id: string;
  passed: boolean;
  xp_awarded: number;
  hearts_remaining: number;
  stars: number; // 1–3
  completion_saved: boolean;
}
```

**Client-derived session state (not from API):**

```typescript
export interface LessonSessionState {
  sessionId: string;
  groupId: string;
  heartsAtStart: number;
  mistakes: number;
  exerciseIndex: number;
  attempts: ExerciseAttemptIn[];
  startedAt: string;
}
```

---

## Revision

```typescript
export interface RevisionNext {
  ayah_id: string | null;
  due_at: string | null;
}

export interface RevisionScheduleIn {
  ayah_id: string;
  due_at: string; // ISO datetime
}
```

---

## Local-only (until backend APIs exist)

```typescript
export type LearnerMode = 'child' | 'adult' | 'beginner';

export interface OnboardingAnswers {
  learnerMode?: LearnerMode;
  dailyGoalMinutes?: number;
  isRevert?: boolean;
  completedAt?: string;
}

export interface AppSettings {
  reciterId: string;
  showTransliteration: boolean;
  showTranslationEn: boolean;
  playbackSpeed: number; // 0.75 | 1 | 1.25
}
```

---

## ID parsing helpers

```typescript
// "078_001" → { surah: 78, ayah: 1 }
export function parseAyahId(id: string): { surah: number; ayah: number };

export function formatAyahId(surah: number, ayah: number): string;
```

---

## Caching keys (React Query / MMKV)

| Key | Data |
|-----|------|
| `learning/me` | `LearningMe` |
| `content/surahs?juz=30&mvp_only=true` | `SurahBrief[]` |
| `content/surahs/{n}/ayahs` | `AyahOut[]` |
| `learning/surahs/{n}/levels` | `SurahLevel[]` |
| `lessons/groups/{id}` | `LessonGroupDetail` |

Invalidate `learning/me` and surah `levels` after `session/complete`.
