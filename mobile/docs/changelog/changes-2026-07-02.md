# Changes log — 2026-07-02 session

Covers everything changed today across `ustadapp-expo` and `mobile`. "Both apps"
means the file lives under `src/` and is auto-mirrored expo → mobile by the
PostToolUse hook; "mobile only" / "expo only" means the file is intentionally
allowed to diverge between the two apps (same pattern as the existing
`secureTokens.ts` split).

## 1. Config / IP

- **`mobile/src/config.ts`** and **`ustadapp-expo/src/config.ts`**: set
  `PHYSICAL_DEVICE_HOST` to the current dev machine's LAN IP (`172.20.10.5`)
  for local-API testing.
- **`mobile/src/config.ts` (mobile only)**: removed the local-API toggle
  entirely (`USE_LOCAL_API`, `PHYSICAL_DEVICE_HOST`, `localApiBase()`).
  Mobile release builds now always hit `PRODUCTION_API_BASE`
  (`https://ustad-app-backend-git-main-ustadapp.vercel.app`) — no dev-server
  dependency. Expo keeps its local-API toggle since it's the active dev app.

## 2. Recitation exercises (both apps) — `screens/lesson/LessonSessionScreen.tsx`

- `ReadAyahAndSpeak` / `ReadAndSpeak`: changed from press-and-hold-to-record to
  **tap to start, tap to stop, then a "Check" button to submit** — matching
  the check-to-submit pattern every other exercise type already used.
- Wired real correctness into heart loss: `submitAnswer()` now accepts an
  optional `correctOverride` so a failed recitation (`score_pct < 60`)
  actually costs a heart. Previously the result banner always called
  `submitAnswer(null)` regardless of pass/fail, so recitation never lost
  hearts no matter the score.

## 3. Fill-in-the-blank sizing (both apps) — `LessonSessionScreen.tsx`

- Added `scaledBlankBox(scale)`. The blank box was a fixed size tuned for the
  default Naskh font; scripts like `nastaliq`/`nastaliq_urdu` render up to
  15% larger (see `arabicFont.ts`), so the filled-in word was clipping
  against a box that didn't scale with it. Now the blank scales with
  `arabicFont.scale`, same as the text inside it.

## 4. Map screen alignment + theme (both apps) — `screens/home/MapScreen.tsx`

- The SVG background/road used a hardcoded `viewBox="0 0 393 ..."` (the width
  of whatever device this was designed on) while node dots (plain RN Views)
  were positioned using the real device width. On any screen that isn't
  393dp wide, this caused the road to visually drift away from the node
  circles ("nodes not on the map") and the background gradient rect
  (`width="393"`) to not fully cover the screen, leaking the plain blue
  `container` background at the edges.
- Fixed by making the viewBox, background rect, river, and star decorations
  all scale off the real `MAP_W` instead of the hardcoded 393.
- "Daily Quests" badge: was hardcoded to show `"2 / 3 Done"` fake progress.
  Changed to `"Coming soon"` since the feature isn't implemented yet.

## 5. Auth token race condition (both apps) — `utils/storage.ts`

- Root cause of "levels not showing" on the APK: the Map screen fires one
  `surahPath()` request per surah **in parallel** via `Promise.allSettled`.
  Each call independently read the token via `getTokens()` → OS Keystore
  (`react-native-keychain` on mobile), with no caching — concurrent Keystore
  reads aren't reliably safe, so some of those parallel requests could go out
  with no `Authorization` header, get silently dropped (`Promise.allSettled`
  only uses `fulfilled` results), and the affected nodes fell back to their
  default `locked` status with zero error output anywhere.
- Fixed by adding an in-memory token cache + in-flight-request dedup to
  `getTokens()` — the Keystore is now read once per session and shared by
  every caller instead of racing.

## 6. Mobile-only: removed the `expo-av` dependency — `screens/lesson/LessonSessionScreen.tsx`, `services/audioPlayer.ts`

**This was the critical one — it would have failed the next `gradlew assembleRelease`.**

`LessonSessionScreen.tsx` (mirrored byte-for-byte from Expo) imported
`Audio` from `expo-av` for all general playback (`playUrl`,
`playUrlSequence`, `playUrlSequenceFast`, the preload cache) and for
recitation recording (`Audio.Recording`). `expo-av` is a valid dependency in
`ustadapp-expo` but was **never installed in `mobile`**
(`npm ls expo-av` → empty, not in `package.json`, not in `node_modules`).
The currently-installed APK only worked because it was built before this
import existed in the mirrored file; the built JS bundle contained zero
references to `expo-av`. The next rebuild would have failed at the Metro
bundling step.

Fix — ported the audio engine in `LessonSessionScreen.tsx` (mobile's copy
only) to the libraries mobile already had installed and half-wired:
- Playback → `services/audioPlayer.ts` (`react-native-sound`, already used by
  the recitation feature's "Hear the Ayah" button). Added two small exports
  it was missing: `evictPreloadedUrls(urls)` (per-URL cache eviction,
  previously only `clearPreloadedAudio()` existed) and `isSoundActive()`
  (guard for pause/resume no-ops).
- Recording → `services/audioRecorder.ts` (`react-native-audio-recorder-player`,
  already installed and already exporting `requestMicPermission`,
  `startRecording`, `stopRecording` with matching signatures — just never
  wired into `LessonSessionScreen.tsx`).

Because the sync hook mirrors expo → mobile on every edit to a shared file
(no exceptions, confirmed by reading `.claude/settings.json`), this port had
to be re-applied twice more after later edits to the *shared* portions of
`LessonSessionScreen.tsx` (the `absoluteFillObject` fix) clobbered mobile's
copy back to the broken `expo-av` state. Final state is verified clean.

## 7. Shared bug fixes surfaced by a full mobile `tsc` audit (both apps)

Ran `npx tsc --noEmit` on both apps. Expo was 100% clean; mobile had ~132
errors. ~110 of those were confirmed dead code (see §8). The rest were two
real, low-severity bugs present in both apps' actual runtime behavior — just
not caught by Expo's `tsc` because its installed `@types/react-native` /
`crashReporter.ts` stub differ slightly from mobile's:

- `StyleSheet.absoluteFillObject` doesn't exist in the RN types either app
  actually ships with — should be `StyleSheet.absoluteFill`. Spreading
  `undefined` into a style object is a silent no-op in JS (not a crash), but
  the intended absolute-fill positioning never applied. Rather than rely on
  either `absoluteFill` or `absoluteFillObject` (their spreadability differs
  between the two apps' type packages), replaced all 4 occurrences
  (`MapScreen.tsx` x1, `LessonSessionScreen.tsx` x3) with the literal
  `position:'absolute', top:0, left:0, right:0, bottom:0` properties inline.
- `api/client.ts`'s `addBreadcrumb(...)` call passed an object where the
  function's second parameter expected a string `category` — breadcrumbs
  were being mis-tagged in Sentry, not user-visible. `crashReporter.ts` has
  genuinely different signatures between the two apps (mobile: real Sentry
  wrapper; expo: no-op stub) — same class of intentional divergence as
  `secureTokens.ts`. Unified both to `addBreadcrumb(message, data?)`,
  dropping the unused `category` param from mobile's implementation
  (hardcoded to `'app'` internally instead) so the shared `client.ts` call
  type-checks identically in both apps without needing per-app special-casing.

## 8. Deleted dead code — mobile only

Confirmed via grep (exact import-path matching, not fuzzy) that these files
have **zero live imports anywhere in the app** and **don't exist in
`ustadapp-expo` at all** (mobile-only leftovers from an earlier component
architecture, before everything consolidated into the current monolithic
`MapScreen.tsx` / `LessonSessionScreen.tsx`). Deleted the whole
`mobile/src/components/` directory:
- `components/journey/` (`LevelNode.tsx`, `SurahBanner.tsx`)
- `components/lesson/ExerciseRenderer.tsx`, `components/lesson/LessonShell.tsx`
- `components/onboarding/OnboardingLayout.tsx`
- `components/ui/` (20 files — `AppText.tsx`, `AudioPlayButton.tsx`,
  `BackButton.tsx`, `FeatureChip.tsx`, `GridOptionCard.tsx`,
  `IrabBackground.tsx`, `JourneyTopBar.tsx`, `Logo.tsx`, `OptionCard.tsx`,
  `PrimaryButton.tsx`, `ProgressHeader.tsx`, `SpeechBubble.tsx`,
  `StepDots.tsx`, and 7 more)

These accounted for ~110 of mobile's ~132 `tsc` errors (broken references to
an old `colors` theme shape and old `services/audioUrls` /
`theme/typography` exports that no longer exist). Not a build risk on their
own (Metro doesn't bundle unreferenced files), but pure noise/confusion —
removed rather than fixed since nothing uses them.

## Verification

- `npx tsc --noEmit` — **0 errors, both apps** (was 0 in expo, ~132 in mobile
  before today's fixes).
- Confirmed via `npm ls expo-av` and `grep -rl "from 'expo-av'"` that no
  remaining mobile source file references `expo-av`.
- Confirmed via exact import-path grep that no live mobile code references
  the deleted `components/` cluster.
