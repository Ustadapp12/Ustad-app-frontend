# Apple App Review Rejections

One entry per rejection: what Apple said, the real cause in our code, and what
was done about it. Newest at the bottom.

---

## 1. Guideline 4.8 - Login Services (first App Store submission, before 2026-10-03)

**Apple's reason:** the app offers a third-party login (Google Sign-In) but no
equivalent privacy-focused login option. In practice Apple expects Sign in
with Apple whenever Google/Facebook/etc. login is offered.

**Fix (2026-10-03, see `changelog/changes-2026-10-03.md`):** added Sign in
with Apple on iOS.
- `@invertase/react-native-apple-authentication` native module.
- `src/services/appleAuth.ts`: native call, nonce, identity token,
  authorization code, and the name (Apple only sends it on first
  authorization).
- `src/components/AppleSignInButton.tsx`: custom black HIG button, Apple logo,
  system font, approved wording only, same size as the Google button.
- `authStore.loginWithApple()` -> `POST /auth/apple` (same one-endpoint design
  as Google: signup, login and guest claim).
- `ios/UstadApp/UstadApp.entitlements` with `com.apple.developer.applesignin`.
- App ID capability enabled and provisioning profile regenerated.

**Shipped in:** build 20042 (2026-10-03), the first build carrying Sign in
with Apple.

---

## 2. Guideline 4 - Design (Sign in with Apple UX), reviewed 2026-10-17

- **Submission ID:** `1f501bb0-2039-4ee6-b5e5-6a6dec5d251b`
- **Version reviewed:** 1.0 (build 20043, app version 1.0.35)
- **Review device:** iPad Air 11-inch (M3)

**Apple's reason (verbatim):** "The app offers Sign in with Apple as a login
option but does not follow the design and user experience requirements for
Sign in with Apple. Specifically, users are required to provide their name
and/or email address after using Sign in with Apple even though that
information is already provided by the Authentication Services framework."

**Reference:** https://developer.apple.com/documentation/authenticationservices

**Root cause in our code:**
- After a new or claimed Apple account, `handleGoogleSuccess()` in
  `SignUpScreen.tsx` (shared by the Google and Apple buttons, mirrored in
  `LoginScreen.tsx`) always does `navigation.replace('OnboardUsername')`.
- `OnboardUsernameScreen.tsx` always starts with an empty name field, so the
  user retypes the name Apple just gave us.
- The name is not lost on the server: `appleAuth.ts` reads `fullName`,
  `authStore.loginWithApple()` sends it as `full_name`, and the backend saves
  it as `display_name`. But `/auth/apple` returns `UserOut`, which has no name
  field, and `completeSocialSignIn()` calls `displayNameFor(res.user)` with no
  name, so the app's local user shows the email prefix instead of the real
  name.
- No onboarding screen asks for email, so only the name half of the rejection
  applies.

**Decision (user, 2026-10-21):** skip `OnboardUsername` entirely when Apple
supplied a name, instead of pre-filling it. Research (below) shows this must
apply to EVERY Apple sign-in, including when Apple sends no name.

### Research, 2026-10-21

Four agents: Apple's official docs, a general web search, a social media and
GitHub search for what actually passed, and a read-only audit of our code
and backend.

**Key facts:**
- Apple sends the name only on the FIRST authorization of an Apple ID for our
  app. Reviewers reuse test Apple IDs that already authorized us, so in review
  the name comes back empty. Three separate 2026 reports confirm this. Any
  name screen shown "only when Apple gave nothing" is exactly what the
  reviewer sees.
- A "username" or "nickname" field counts as the same violation (2 reports,
  2026). Our "What should we call you?" screen will be read as a name prompt.
- Replying in Resolution Center without a code change used to work and now
  fails (1 strong report, June 2026).
- The HIG: "As soon as Sign in with Apple completes, welcome people to their
  new account... don't delay the experience by asking for information that
  isn't required." and "If people choose not to provide optional information,
  don't prevent them from accessing their account."

**What our code does today (audit):**
- The name screen is a hard gate: empty field, Continue disabled until a
  valid name is typed, no Skip.
- The resume path brings it back. `getNextOnboardingScreen`
  (`utils/storage.ts:262-284`) returns `OnboardUsername` for any step before
  `'path'`. `OnboardUsernameScreen` writes no checkpoint, and `currentStep` is
  per device. So skipping on first launch is not enough: kill the app, and on
  the next launch the screen is back. A returning ("restored") Apple account
  that never finished onboarding also lands there on the next cold launch.
- Local display name is the email prefix. For Hide My Email that is a random
  relay string.
- Already fine: Hide My Email works (relay address stored, never mistaken for
  a guest); the server matches on `apple_sub` first; the button wording, fill
  and font are correct; in-app account deletion exists, skips the password for
  Apple users, and revokes the Apple token via `/auth/revoke`.
- Gaps that are not review blockers: no credential-revoked check on launch, no
  server-to-server notifications endpoint, and the backend name validator
  rejects Arabic and other non-Latin names (they silently become "Learner").

### Approaches for the name screen, by real-world evidence

| Rank | Approach | Evidence (2024-2026) | Verdict |
|---|---|---|---|
| 1 | A. No name screen for Apple users, silent fallback | 2 reports, one later approved | Passed |
| 2 | B+C. Optional, prefilled field (not a gate) | 1 approved, 2 no outcome | Mixed to good |
| 3 | D. Name editable later in profile only | Only alongside A/B/C | Supporting fix |
| 4 | C alone. Prefill, still required | Fails when Apple sends no name | Risky |
| 5 | E. Ask for a username/nickname instead | 2 rejected, same text | Rejected |
| 6 | F. Reply in Resolution Center, no code change | Worked before 2026, now fails | Rejected |

Sources: github.com/CodeCooLTH/deep-web PR 30 and 35,
github.com/AgenciaSeniors/TriciGo PR 994, github.com/Tave-Makers/SURF-BE
issue 392, github.com/IDEMSInternational/open-app-builder PR 3554, Apple
Developer Forums threads 711242, 729250, 751115, 792770.

### Ranked fix plan

| # | Fix | Priority | What changes for the user | How | Pros | Cons |
|---|---|---|---|---|---|---|
| 1 | Skip the name screen for every Apple sign-in | MUST | Apple users go straight from sign-in to the Age screen | `AppleSignInButton` passes `provider: 'apple'` to `onSuccess`; `SignUpScreen`/`LoginScreen` route Apple to `OnboardAge` | Matches the approach that passed; small change | Users who never get a name from Apple show a fallback name until they edit it |
| 2 | Resume path never sends Apple accounts back to the name screen | MUST | Killing the app mid-onboarding no longer brings the prompt back | Option a: treat `has_password === false` with a real email as a social account and skip the name step in `getNextOnboardingScreen`. Option b: backend adds a `provider` field to `UserOut` | a: no backend deploy, survives reinstall. b: exact | a: also skips the name screen for Google users. b: needs a backend change you deploy |
| 3 | Show the real saved name, not the email prefix | MUST | Profile, leaderboard and welcome show the Apple name, or "Learner" for relay emails | After `/auth/apple`, fetch the profile (same as `hydrate` does) and use `profile.display_name`; never derive a name from a relay email | HIG says to welcome people by the name they shared; no backend change | One extra request at sign-in |
| 4 | Resolution Center reply with an iPad recording | MUST | Nothing in-app | Record on an iPad with an Apple ID that already authorized the app (the no-name path), attach to the reply, and explain the name is now optional in Edit Profile | Shows the reviewer the exact case they hit | Manual step for you |
| 5 | Name editable later in Edit Profile | Already done | Nothing | `EditProfileScreen.tsx` already edits it | Free | None |
| 6 | Accept Arabic and non-Latin names in the backend | SHOULD | Arabic Apple names are kept instead of becoming "Learner" | Loosen `validate_full_name` in backend `service.py` | Correct names for the core audience | Backend change you deploy |
| 7 | Confirm Apple key env vars in both Vercel projects | SHOULD | Account deletion actually revokes Apple access | Check team ID, key ID and private key are set in testing and production | Deletion is fully compliant with 5.1.1(v) | Manual dashboard check for you |
| 8 | Move the Apple/Google buttons above the email form on Sign Up | SHOULD | Apple button visible without scrolling | Reorder `SignUpScreen.tsx:332-416` | HIG: no scrolling to see the button | Layout change on a reviewed screen |
| 9 | Credential-revoked check on launch | SHOULD | Users who revoke access in iOS Settings get signed out | Call `getCredentialStateForUser` in `hydrate` | Correctness | Rarely tested in review |
| 10 | Server-to-server notifications endpoint | LATER | None visible | New backend route for consent-revoked, account-deleted, email events | Apple recommends it | Backend work, not enforced |

**Status:** awaiting the user's go on the plan, and a choice for fix 2 (a or
b). Not implemented yet.
