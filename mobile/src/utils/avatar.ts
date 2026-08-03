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
function stablePick<T>(id: string, options: readonly T[]): T {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return options[h % options.length];
}

/** The user's own avatar — awarded once at onboarding, stable per account. */
export function characterSrcFor(userId: string, gender: Gender | null | undefined) {
  return stablePick(userId, gender === 'female' ? FEMALE_SRCS : MALE_SRCS);
}
