export type Gender = 'male' | 'female';

// The user's own avatar (Onboarding, Profile, Leaderboard) — distinct from the
// rotating "Ustad ___" narrator characters used inside lessons, which stay
// on ayesha.png/hamza.png untouched.
//
// Head-and-shoulders portraits from the Figma "assets" sheet (2026-10-11),
// split one folder per gender. Every file is the same 512x512 square, so any
// two avatars rendered at the same box size line up exactly. The two pools
// are deliberately different lengths (26 male, 19 female): always size
// against the gender's own pool, never one shared count.
const MALE_SRCS = [
  require('../../assets/shared/avatars/male/male_01.png'),
  require('../../assets/shared/avatars/male/male_02.png'),
  require('../../assets/shared/avatars/male/male_03.png'),
  require('../../assets/shared/avatars/male/male_04.png'),
  require('../../assets/shared/avatars/male/male_05.png'),
  require('../../assets/shared/avatars/male/male_06.png'),
  require('../../assets/shared/avatars/male/male_07.png'),
  require('../../assets/shared/avatars/male/male_08.png'),
  require('../../assets/shared/avatars/male/male_09.png'),
  require('../../assets/shared/avatars/male/male_10.png'),
  require('../../assets/shared/avatars/male/male_11.png'),
  require('../../assets/shared/avatars/male/male_12.png'),
  require('../../assets/shared/avatars/male/male_13.png'),
  require('../../assets/shared/avatars/male/male_14.png'),
  require('../../assets/shared/avatars/male/male_15.png'),
  require('../../assets/shared/avatars/male/male_16.png'),
  require('../../assets/shared/avatars/male/male_17.png'),
  require('../../assets/shared/avatars/male/male_18.png'),
  require('../../assets/shared/avatars/male/male_19.png'),
  require('../../assets/shared/avatars/male/male_20.png'),
  require('../../assets/shared/avatars/male/male_21.png'),
  require('../../assets/shared/avatars/male/male_22.png'),
  require('../../assets/shared/avatars/male/male_23.png'),
  require('../../assets/shared/avatars/male/male_24.png'),
  require('../../assets/shared/avatars/male/male_25.png'),
  require('../../assets/shared/avatars/male/male_26.png'),
];
const FEMALE_SRCS = [
  require('../../assets/shared/avatars/female/female_01.png'),
  require('../../assets/shared/avatars/female/female_02.png'),
  require('../../assets/shared/avatars/female/female_03.png'),
  require('../../assets/shared/avatars/female/female_04.png'),
  require('../../assets/shared/avatars/female/female_05.png'),
  require('../../assets/shared/avatars/female/female_06.png'),
  require('../../assets/shared/avatars/female/female_07.png'),
  require('../../assets/shared/avatars/female/female_08.png'),
  require('../../assets/shared/avatars/female/female_09.png'),
  require('../../assets/shared/avatars/female/female_10.png'),
  require('../../assets/shared/avatars/female/female_11.png'),
  require('../../assets/shared/avatars/female/female_12.png'),
  require('../../assets/shared/avatars/female/female_13.png'),
  require('../../assets/shared/avatars/female/female_14.png'),
  require('../../assets/shared/avatars/female/female_15.png'),
  require('../../assets/shared/avatars/female/female_16.png'),
  require('../../assets/shared/avatars/female/female_17.png'),
  require('../../assets/shared/avatars/female/female_18.png'),
  require('../../assets/shared/avatars/female/female_19.png'),
];
// Gender unset (pre-gender accounts, still common on the leaderboard) draws
// from both pools rather than defaulting everyone to one gender's art.
const ALL_SRCS = [...MALE_SRCS, ...FEMALE_SRCS];

/** Same h*31 string hash used since the first avatar work: the same key
 * always lands on the same index, so a fallback pick never reshuffles
 * between reloads or between screens. */
export function stablePickIndex(key: string, length: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % length;
}

/** Every avatar src for a gender, in index order. Unset gender is the male
 * pool, matching how the user's own avatar has always fallen back. */
export function avatarSrcsForGender(gender: Gender | string | null | undefined) {
  return gender === 'female' ? FEMALE_SRCS : MALE_SRCS;
}

/** How many avatars exist for this gender (26 male, 19 female). */
export function avatarVariantCount(gender: Gender | string | null | undefined): number {
  return avatarSrcsForGender(gender).length;
}

/** Which variant index is in effect for this user: their saved pick when it
 * is valid for their gender, otherwise the deterministic hash of their user
 * id. A saved index past the end of the pool (e.g. a male pick kept after
 * switching gender to female) falls back rather than rendering nothing. */
export function currentAvatarVariantIndex(
  userId: string,
  variant: number | null | undefined,
  gender: Gender | string | null | undefined,
): number {
  const count = avatarVariantCount(gender);
  if (variant != null && variant >= 0 && variant < count) return variant;
  return stablePickIndex(userId, count);
}

/** The user's own avatar, for Onboarding/Profile and their own leaderboard row. */
export function characterSrcFor(userId: string, gender: Gender | string | null | undefined, variant?: number | null) {
  return avatarSrcsForGender(gender)[currentAvatarVariantIndex(userId, variant, gender)];
}

/** A random variant for a gender, granted once at onboarding so every new
 * account has a real saved pick (which the leaderboard can show to others)
 * instead of relying on the client-side hash fallback. */
export function randomAvatarVariant(gender: Gender): number {
  return Math.floor(Math.random() * avatarVariantCount(gender));
}

/** Another learner's avatar on the leaderboard. Their saved pick when the
 * backend sent one that is valid for their gender; otherwise a stable
 * name-keyed pick (rows carry no user id), from both pools if gender is
 * unknown. */
export function avatarForLeaderboardEntry(e: {
  display_name: string;
  gender?: string | null;
  avatar_variant?: number | null;
}) {
  if (e.gender === 'male' || e.gender === 'female') {
    const pool = avatarSrcsForGender(e.gender);
    const v = e.avatar_variant;
    if (v != null && v >= 0 && v < pool.length) return pool[v];
    return pool[stablePickIndex(e.display_name, pool.length)];
  }
  return ALL_SRCS[stablePickIndex(e.display_name, ALL_SRCS.length)];
}

/** Fixed preview art for the gender picker itself (Onboarding + Edit
 * Profile): always the first of each pool, since this is "which one are
 * you" rather than "here is your assigned character". */
export const GENDER_PREVIEW_SRCS = {
  female: FEMALE_SRCS[0],
  male: MALE_SRCS[0],
};
