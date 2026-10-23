import type { SurahLevel } from '../types/api';

// One rule for every star shown in the app: 100% accuracy earns 3 stars,
// 66% or more earns 2, and any finished level earns at least 1 (a completed
// node with 0 stars would read as unfinished on the map). The backend's
// _stars_from_score (app/learning/service.py) should use the same thresholds.
export function starsFromAccuracy(scorePct: number): number {
  const pct = Math.round(scorePct);
  if (pct >= 100) return 3;
  if (pct >= 66) return 2;
  return 1;
}

// Map stars come from the level's saved best accuracy rather than the
// backend's stored star count, so they always follow the rule above,
// including for levels finished before it changed.
export function levelStars(level: Pick<SurahLevel, 'status' | 'stars' | 'score_pct'>): number {
  if (level.status !== 'completed') return 0;
  if (level.score_pct != null) return starsFromAccuracy(level.score_pct);
  return level.stars ?? 0;
}
