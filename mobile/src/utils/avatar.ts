type Gender = 'male' | 'female';

// The user's own avatar (OnboardWelcome + Profile) — distinct from the
// rotating "Ustad ___" narrator characters used inside lessons, which stay
// on ayesha.png/hamza.png untouched.
const MALE_SRCS = [
  require('../../assets/characters/male1.png'),
  require('../../assets/characters/male2.png'),
];
const FEMALE_SRCS = [
  require('../../assets/characters/female1.png'),
  require('../../assets/characters/female2.png'),
];

/**
 * Deterministic, not a fresh coin flip on every call: the same user id
 * always lands on the same character, which is the whole point — Welcome
 * and Profile have to agree on the one the user was actually introduced to.
 * Looks arbitrary per account since it's just a hash of the id, with no
 * meaning tied to which of the two a given id lands on.
 */
function stablePickIndex(id: string, length: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % length;
}

/** Number of avatar art variants per gender — MALE_SRCS/FEMALE_SRCS are kept
 * the same length, so either one is a valid source for this. */
export const AVATAR_VARIANT_COUNT = MALE_SRCS.length;

/** Which variant index is currently in effect for this user — their own
 * explicit pick if set, otherwise whichever index the original deterministic
 * hash-of-user-id pick resolves to. Used by the avatar-picker popup so its
 * arrows start from the avatar the user is actually looking at, not always
 * index 0, for an account that hasn't picked yet. */
export function currentAvatarVariantIndex(userId: string, variant: number | null | undefined): number {
  if (variant != null && variant >= 0 && variant < AVATAR_VARIANT_COUNT) return variant;
  return stablePickIndex(userId, AVATAR_VARIANT_COUNT);
}

/**
 * The user's own avatar. `variant` (0 or 1, from profile.avatar_variant) is
 * the user's own explicit pick from the avatar-picker popup — takes
 * priority whenever set. Falls back to the original deterministic
 * hash-of-user-id pick when null/undefined, which covers every account
 * that hasn't opened the picker yet (never awarded a variant before this
 * feature existed) without changing the avatar they were already shown.
 */
export function characterSrcFor(userId: string, gender: Gender | null | undefined, variant?: number | null) {
  const srcs = gender === 'female' ? FEMALE_SRCS : MALE_SRCS;
  return srcs[currentAvatarVariantIndex(userId, variant)];
}

/** Both variant srcs for a gender, in index order — for the avatar-picker
 * popup, which needs to show/cycle through both rather than resolve to
 * just one like characterSrcFor(). */
export function avatarSrcsForGender(gender: Gender | null | undefined) {
  return gender === 'female' ? FEMALE_SRCS : MALE_SRCS;
}

/** Fixed preview art for the gender picker itself (Onboarding + Edit
 * Profile) — always the first of each pair, not a per-user pick, since this
 * is "which one are you" rather than "here is your assigned character". */
export const GENDER_PREVIEW_SRCS = {
  female: FEMALE_SRCS[0],
  male: MALE_SRCS[0],
};
