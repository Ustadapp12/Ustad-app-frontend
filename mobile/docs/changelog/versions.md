# Version log

One entry per real build (`assembleRelease`/`bundleRelease` that actually
succeeded). Append-only — never edit or delete a past entry. Backfilled
2026-08-29 for the 2026-08-28 session's builds from the changes-*.md history;
every build from that point forward is logged live, same session.

Format: `versionCode` / `versionName` — artifact — date — what's in it.

---

**26082802** / 1.0.17 — APK — 2026-08-28 — Map "Continue here" tag truncation
fix, blank-green review nodes fixed (recommended_special.png), pulse ring
removed, firstActiveNode never picks a completed node, duplicate-ayah guards
(submitLockRef, answeredExIdsRef), Google Sign-In diagnostic patch (widened
DEVELOPER_ERROR message).

**26082803** / 1.0.17 — AAB — 2026-08-28 — same as APK above. Backend on
testing.

**26082810** / 1.0.18 — APK — 2026-08-28 — never-fabricate-completed-status
fix (map shows 'available' not 'completed' when unconfirmed), resolve-on-tap
for unresolved nodes, Google Sign-In diagnostic patch confirmed compiled in.

**26082820** / 1.0.19 — APK — 2026-08-28 — first (incomplete) padding fix
attempt: native module returns 0 for gesture nav. Later found insufficient —
safeBottomInset still fell through to a nonzero native fallback.

**26082830** / 1.0.20 — APK — 2026-08-28 — real padding fix: safeBottomInset
made a straight pass-through (app is not edge-to-edge, window already
excludes the nav bar; the floor itself was the bug).

**26082831** / 1.0.21 — APK — 2026-08-28 — padding fix (above) + font
persistence (hydrateScriptPreference wired into boot) + map-stale-after-exit
fix (lastVisitedSurah, abandonSession now triggers a refresh too, not just
completion).

**26082840** / 1.0.22 — APK — 2026-08-28 — blue "frozen streak" Lottie
animation (streak_frozen.json) replacing the ice-cube placeholder, font modal
button relabeled "Save and Close".

**26082850** / 1.0.23 — APK — 2026-08-28 — full batch: wave animation removed
from Hear-the-sound-and-select, exit-confirm dialog Stay/Leave swapped, tab
bar dead space removed when insets are zero (first attempt, 8px compromise),
return-from-level scroll-to-Continue-here, logout custom Lumo modal, tour
first-message centered, tour cutout extended to tab labels. Installed and
tested on both the Oppo F9 and a Samsung SM-A515F (via adb).

**26082851** / 1.0.23 — AAB — 2026-08-28 — same batch as 26082850. Backend on
testing.

**26082901** / 1.0.24 — AAB — 2026-08-29 — **published build.** Everything
above, plus: tab bar padding compromise corrected to true 0 (not 8) when
there's no real inset; HearAndSelect's real audio-dropping bug fixed
(onPlayingChange's seqGenRef bump was killing multi-word sequences after
word 1 — separate from and found after the onLongPress fix); invalidateLevels
disk-cache race fixed (now awaited end-to-end, closes the "node shows stale
locked status on cold start" bug). Every fix in the full 08-28→29 session
re-verified present in build-tree source immediately before this build (30
checks, all passed) — see changes-2026-08-29.md for the fixes' own detail.

Google Sign-In: **fixed the same day, 2026-08-28, via Firebase Console**
(missing SHA-1 fingerprint for the Play App Signing certificate) — not an app
code change, so it isn't tied to any specific versionCode above. Confirmed
working on Play-delivered v1.0.16 without a reinstall.

**26083121** / 1.0.25 — AAB — 2026-08-31 — Backend on **testing**
(ustad-app-backend-testing.vercel.app), not production — explicit choice this
session, not a default. No app-code functional change since 1.0.24: the only
source diff was a comment in LessonSessionScreen.tsx documenting a backend
fix (`process_answer()` now replays a stored grading result for a repeat
`ex_id` instead of risking a wrong regrade — see backend CHANGES.md,
2026-08-31). android/ was diffed file-by-file against source; identical
except splash_logo.png, which BuildProjects already had newer/smaller than
OneDrive (kept the BuildProjects version, did not overwrite). package.json
unchanged, so node_modules/patches were not re-copied. Verified post-build via
aapt2 on the extracted base module: versionCode/versionName landed correctly,
JS bundle (3.87MB) contains current-source strings, not stale.

**26090101** / 1.0.26 — AAB — 2026-09-01 — Backend on **testing**
(ustad-app-backend-testing.vercel.app), not production — unchanged, no
explicit switch requested. Two source changes: (1) MapScreen.tsx — every
currently-open map node (not just the backend-recommended one) now renders a
breathing color-matched glow behind it, gray for normal levels / green for
special-review ones; (2) MainTabs.tsx — removed `insets.bottom` entirely from
the tab bar's height/padding calc (was reserving space for the Android nav
bar even though it persists on screen on the user's real device instead of
actually staying hidden — see changes-2026-09-01.md for the root-cause trace
through `edgeToEdgeEnabled=true` in gradle.properties). Tab bar is now a flat
64px with 0 bottom padding, always. `android/` diffed clean against source
(only the known splash_logo.png/local-build-artifact noise). Verified
post-build: `versionCode="26090101" versionName="1.0.26"` confirmed in the
pre-compiled bundle manifest
(`intermediates/bundle_manifest/release/.../AndroidManifest.xml`); JS bundle
(`generated/assets/react/release/index.android.bundle`, timestamp 13:39:48)
confirmed generated *after* both edited source files were synced (13:15,
13:30) and Metro's own log showed a real fresh bundle run, not
up-to-date/cached.

Output: `C:\BuildProjects\ustadapp-mobile\android\app\build\outputs\bundle\release\app-release.aab`

**26090101** / 1.0.26 — APK — 2026-09-01 — same source as the AAB above
(same versionCode reused — for direct device-install testing of the tab-bar
padding removal and glow changes, not a separate release). Backend on
testing. Verified via `aapt2 dump badging`: versionCode/versionName landed
correctly.

Output: `C:\BuildProjects\ustadapp-mobile\android\app\build\outputs\apk\release\app-release.apk`

**26090102** / 1.0.27 — AAB — 2026-09-01 — Backend on **testing**
(ustad-app-backend-testing.vercel.app) — explicitly confirmed by the user
for this build, unchanged. Adds one more source change on top of 1.0.26:
replaced the native `Alert.alert` app-exit confirmation with a custom
Lumo-card popup (new `src/components/ExitAppModal.tsx`, wired into
`RootNavigator.tsx`) — Leave (red, left) / Stay (green, right), per explicit
user request. `android/` unchanged since the last diff check. Verified
post-build: `versionCode="26090102" versionName="1.0.27"` confirmed in the
pre-compiled bundle manifest; JS bundle (`index.android.bundle`, timestamp
14:37:21) confirmed generated after `RootNavigator.tsx` (14:10:46) and
`ExitAppModal.tsx` (14:10:24) were synced, and Metro's own log showed a real
fresh bundle run.

Output: `C:\BuildProjects\ustadapp-mobile\android\app\build\outputs\bundle\release\app-release.aab`

**26090118** / 1.0.28 — AAB — 2026-09-01 — Backend on **testing**
(ustad-app-backend-testing.vercel.app), unchanged. Full batch from this
session: Profile screen version footer (new `src/utils/appVersion.ts`,
reads `process.env.VERSION_NAME` inlined via a new
`babel-plugin-transform-inline-environment-variables` devDependency —
added to `babel.config.js` and installed in **both** OneDrive and
BuildProjects node_modules, since neither is covered by the src/assets
robocopy sync); MapScreen node-glow shrunk (1.4x/1.75x → 1.14x/1.32x of
NODE_SIZE, lower opacity/shadow) plus a 1.06x "pop" scale on open nodes;
MapScreen AppState foreground-refresh fix — the map previously only
re-fetched after a lesson session ended, never on a plain
background-to-foreground reopen, which is what let stale `fullLevels`/
`recommended` render a "Continue here" tag next to a still-locked-looking
node until a manual pull-to-refresh corrected it; new floating
feedback-icon button on MapScreen (bottom-right, above the Profile tab,
outline message-bubble SVG icon, opens the same Feedback screen as
Profile's own entry, unguarded so guests can use it too); SplashScreen
status-message interval 1200ms → 2200ms; LessonSessionScreen —
`read_ayah_and_speak`/`read_and_speak` exercise cards now show
"· Verse N" (every other exercise type already had it; these two were
the only ones missing it).

Verified post-build: JS bundle is Hermes bytecode, generated 18:35 (after
every touched source file was synced by 18:13); `versionCode="26090118"
versionName="1.0.28" package="com.ustadapp"` confirmed in the
pre-compiled bundle manifest; bundle content directly checked — the
literal `"1.0.28"` string is present (confirms the new env-var inlining
actually substituted, not just silently fell back to the "1.0.0"
default), zero leftover `"VERSION_NAME"` text (clean substitution, no
broken reference), `"feedbackFab"` string present (confirms MapScreen's
new code compiled in, not a stale cached bundle). `signReleaseBundle` ran
against the real release keystore (`keystore.properties` present) — not
debug-signed.

Not independently verified this session: actual on-device behavior of the
AppState foreground-refresh fix and the version-footer display — both are
new logic that should be exercised on a real phone (ideally via the
closed-testing track, same as the Dua stale-build incident) before being
treated as confirmed working, not just "builds clean."

**10036** / 1.0.29 — IPA (TestFlight) — 2026-09-14 — first iOS TestFlight
build logged here (earlier ones, 10034/10035, were never backfilled — this
file had only tracked Android APK/AAB builds until now). Same source as
commit `d9e2bfd` on top of `e26e181`'s fixes (already submitted as build
10035 on 2026-09-13): map recommended-node hijack fix, iOS feedback sound,
audio bleed across attempts, fill-in-blank text clipping, level time
estimates, Android device-eligibility filter, trimmed iOS tab bar padding.
This build's only actual diff from 10035 is the release-notes text itself
(user-reviewed and approved before this build): the in-app v1.0.29 popup
now lists every fix above instead of just the first three.

Verified via `eas-cli build:list`: build ID `8dd99574-d90b-4234-a95e-dd14603d25f8`,
status `finished`, commit `d9e2bfd7e22ebb41000c94feb5252f087318cab9` (exact
match to the pushed commit), real `.ipa` artifact URL. GitHub Actions run
`34845965116` also completed all-green in 16m3s (build + submit + Apple
TestFlight processing).

Not independently verified: on-device behavior of any of the fixes listed
above — this was a resubmit of already-built code (per the previous
session's build 10035) triggered specifically to ship the reviewed release
notes; no new native code changed since 10035.

Output: `C:\BuildProjects\ustadapp-mobile\android\app\build\outputs\bundle\release\app-release.aab`

**26091602** / 1.0.29 — APK + AAB — 2026-09-16 — first Android production
candidate. R8/code-shrinking enabled for the first time
(`enableProguardInReleaseBuilds = true` + `shrinkResources`, was hardcoded
off since the project's first release) — combined DEX dropped from a 24.4 MB
uncompressed baseline to 7.9 MB. NDK bumped 27.1.12297006 -> 28.0.13004108
(fixes Play Console's 16 KB page-size crash warning). Fixed `android/`
source drift discovered mid-session: `POST_NOTIFICATIONS` permission and
touchscreen/mic `<uses-feature>` filters existed in source but had never
once reached a real build; synced now. Profile screen: hid the
"Notifications" settings stub (was a no-op `comingSoon` placeholder),
removed the dev-only "Test Notifications" button per its own
remove-before-publishing note. Backend confirmed on production
(unchanged). Picks up everything already shipped to iOS 1.0.29/10036 that
Android hadn't gotten since its own last build, 1.0.28. See
changes-2026-09-16.md for full detail, including exactly which R8-stripped
classes were checked and why they're believed safe.

Verified via `aapt dump badging`: `versionCode='26091602'
versionName='1.0.29'` landed correctly. R8 mapping output
(`outputs/mapping/release/usage.txt`) checked directly: zero Google
Sign-In/Firebase classes stripped (the two areas explicit keep rules were
added for); this app's own native modules untouched beyond auto-generated
`BuildConfig`/`R` classes.

Not independently verified this session — needs a real device pass before
Play Store submission: Google Sign-In (R8 printed several "Invalid stack
map table" warnings against Google's own play-services-auth jar during the
build — did not fail the build, but Google Sign-In is the single highest-
risk area), login/token persistence (react-native-keychain lost more
classes to shrinking than expected, plausibly legitimate dead-code removal
of cipher-storage backends this app's minSdk 24 doesn't need, not
confirmed live), recitation audio playback, and an actual fired
notification.

Output:
- `C:\BuildProjects\ustadapp-mobile\android\app\build\outputs\apk\release\app-release.apk`
- `C:\BuildProjects\ustadapp-mobile\android\app\build\outputs\bundle\release\app-release.aab`

**10037** / 1.0.30 — IPA (TestFlight) — 2026-09-18 — first iOS build carrying
the whole-Quran expansion. Commit `e04095d`, GitHub Actions run
`35354311250`. Ships the 2026-09-16/17/18 work to iOS for the first time: the
map lays out all 114 surahs (4,744 nodes, 159 chapters) generated from the new
`src/data/allSurahs.ts` catalogue instead of hand-typed entries; new
`SearchSurahsScreen` (search by English name, Arabic name or surah number,
then jump); seasons no longer gate anything; recommended-next resolves the
chapter holding that specific level rather than the surah's opening chapter;
streak page practice calendar backed by `GET /learning/streak/calendar` plus
the redesigned gradient hero. In-app v1.0.30 release notes drafted and
user-approved before this build, per the standing rule.

**This build points at the TESTING backend** (`ustad-app-backend-testing.vercel.app`),
explicitly requested — production stays commented out directly above it in
`src/config.ts`.

Verified via `eas-cli build:list`: build ID `1a2c8803`, status `FINISHED`,
build number 10037, production profile, commit `e04095d` (exact match to the
pushed commit), real `.ipa` artifact. The Actions run completed all-green
(build + submit + Apple TestFlight processing); its only annotations were
benign (Node 20 deprecation notice, a GitHub npm-cache service outage, the
ubuntu-latest migration notice).

Backend state at build time, verified against the live testing deployment
rather than assumed: all 114 surahs serve levels with correct ayah coverage
and review interleave, sessions start and complete on newly-added surahs, and
564 sampled audio files resolve. **113 of 114 surahs match the app's expected
level counts.** Al-Baqarah does not, and it is a backend read cap
(`list_lesson_groups`'s `to_list(length=200)` against 215 docs), not anything
in this build — it will dead-end past level 1 until that cap is lifted and the
cached 200-row entry cleared. See changes-2026-09-18.md.

Not verified on a device this session: nothing in the whole-Quran expansion
has been seen rendering on real hardware. The chapter-switch-then-scroll
timing on a recommendation jump, and the streak calendar's layout, are the
two most worth watching.

**10038** / 1.0.30 — IPA (TestFlight) — 2026-09-20 — commit `97a1142`,
GitHub Actions run `35507066149`. Fixes found testing 10037 on-device: the
map's jump-to-recommended landing inconsistently (two stacked bugs — a
spurious-refire and a data-race guessed-chapter fallback, see
changes-2026-09-20.md) and the "Hear and fill" exercise's first option
always feeling slow (preload ordering). Also adds: locked map nodes now
offer "Start {surah}?" (same jump as search); search results show open/done
status with a legend; Lumo added to the map's loading screen; season gate
images and the streak page's status-dependent gradient removed per request;
diagnostics added around the still-unresolved "Couldn't open {surah}" error.

Verified via `eas-cli build:list`: build ID `f4879ab2-cd02-48a1-ad7b-f66799725fca`,
status `FINISHED`, build number 10038, production profile, commit hash
matches the pushed commit exactly, real `.ipa` artifact. Actions run
completed all-green (build + submit); submit log confirms "Submitted your
app to Apple App Store Connect."

**In-app release notes were NOT drafted/reviewed for this build** — it
shipped straight from a "fix these things and build" instruction mid
live-testing session, skipping the standing pre-build release-notes-review
step. `src/data/releaseNotes.ts` still tops out at 1.0.30/10037's entry, so
the in-app popup (if it fires on this build at all — same version number,
1.0.30) won't reflect anything shipped here. Flagged, not fixed.

**Nothing in this build has been run on a device or simulator by this
session** — same caveat as 10037, now compounded: none of 10037's own
unverified risks (chapter-switch-then-scroll timing, streak calendar
layout) were resolved before 10038 layered more map-effect changes on top.
First real verification will be whoever opens this build.

**10039** / 1.0.0 — IPA (App Store production submission) — 2026-09-21 —
commit `f00bdb1`, built and submitted directly from this laptop via
`eas-cli` (not the GitHub Actions workflow) at the user's explicit request,
for actual Apple App Store review rather than internal TestFlight testing.
Ships everything in 10038 plus the chapter-cut restructure, locked-node
prompt scoping, and other fixes/UI changes logged in the "Session 2"
section of changes-2026-09-20.md.

Two build-pipeline gaps surfaced and fixed, both because building outside
the GH Actions workflow skips steps that workflow normally handles silently:

1. First attempt errored in Xcode (`Could not get GOOGLE_APP_ID`) —
   `ios/UstadApp/GoogleService-Info.plist` is gitignored and normally only
   materializes in CI from a repo secret. Found a local copy in
   `Desktop/UA-secrets/`, placed it, ran `scripts/link-firebase-ios.mjs`
   (the same step the workflow runs) to wire it into the Xcode project.
2. Second attempt built fine but stamped build number **100** — the
   workflow's "Stamp a collision-proof build number" step
   (`CURRENT_PROJECT_VERSION = 10000 + github.run_number`, see
   `.github/workflows/ios-testflight.yml`) only ever patches the checkout
   in CI and is never committed back, so the repo's committed baseline is
   just `100`. Building directly skipped that step entirely. Would have
   been rejected by App Store Connect (100 after already-live 10038).
   Replicated the same stamp locally with `10039` (one above 10038) before
   rebuilding — same `ios/UstadApp.xcodeproj/project.pbxproj` mechanism,
   deliberately not committed, matching how the workflow itself never
   commits it either.

`eas submit` also failed twice before succeeding, same "logless instant
failure" both times (`error: null`, zero log files, ~19s) — traced via
direct EAS GraphQL queries (`submissions.byId`) since neither the CLI's
own output nor `--verbose`/`--verbose-fastlane` surfaced anything. Cause:
`asc-api-key.p8` (also gitignored, also only in CI via secret; a copy was
provided by the user into `UA-secrets/`) had `Issuer Id:`/`Key Id:` label
lines prepended above the actual `-----BEGIN PRIVATE KEY-----` PEM block —
invalid format, failed before any real upload attempt or logging. Stripped
to just the valid PEM content; third submit attempt succeeded immediately.

Verified via the same EAS GraphQL introspection used to debug the submit
failures, plus `eas-cli build:view`: build ID
`49461273-1c1a-4880-bacf-303a0bd29eb5`, status `FINISHED`, build number
10039, commit hash matches. Submission `af186eea-a53d-46e5-add8-382f669a41e3`:
"Submitted your app to Apple App Store Connect!" — binary uploaded,
Apple-side processing pending at time of writing (usually 5-10 min).

**This does NOT mean the app is submitted for App Store review.** Uploading
the binary and submitting it for review are two separate steps in Apple's
own flow — once processing finishes, a human needs to go into App Store
Connect, attach build 10039 to an App Store version with release notes/
metadata, and click "Submit for Review" there. That step was explicitly
left to the user, not automated.

**Nothing in this build has been run on a device or simulator by this
session either** — same standing caveat as every build this session. This
one carries the largest unverified diff of the three (10037/10038/10039),
including the chapter-cut restructure that reassigned 2,211 of 4,744
individual level→chapter mappings. If this is genuinely headed for public
release, on-device verification before hitting "Submit for Review" matters
more here than it has for any TestFlight-only build so far.

**10040, 10041** — IPA build attempts, both ERRORED, not submitted, no
build number registered with Apple (only a successful `eas submit` does
that). Both failed identically: `Could not get GOOGLE_APP_ID in Google
Services file from build environment` (Firebase Crashlytics's "Upload
dSYMs" Xcode phase). Two wrong theories tried and ruled out in sequence
(both real, both insufficient) before finding the actual cause — full
trail kept here since the wrong turns are as useful as the fix if this
ever recurs:
- 10040: assumed the same "file missing locally" cause as 10038's first
  attempt. It wasn't — `GoogleService-Info.plist` was present on disk.
- 10041: assumed EAS Build's upload archive was silently excluding the
  file via its `.gitignore` fallback (a real, separate, genuinely worth-
  having fix — added `.easignore`, see that commit). Also insufficient —
  the file WAS in the uploaded archive both times, confirmed via the raw
  Xcode build log's `CpResource` entries (present for every other bundle
  resource, absent for this one specifically).

**Actual cause, found by reading the real (gzip-compressed, needs `curl
--compressed`) Xcode build log rather than trusting EAS's auto-categorized
error summary**: `scripts/link-firebase-ios.mjs`'s idempotency check only
verified a `/* GoogleService-Info.plist */` comment string existed
somewhere in `project.pbxproj` — not that the file was actually wired into
the Xcode Resources build phase or the project group. Some earlier run had
silently no-op'd on those two regex-based insertions (anchored to
hardcoded Xcode object IDs) while the simpler section-marker insertions
for the bare declarations succeeded, leaving an orphaned
PBXFileReference/PBXBuildFile pair that Xcode never actually copies into
the `.app` bundle — confirmed directly: the file's `PBXBuildFile` ID never
appeared in the Resources phase's `files = (...)` list, and grepping the
real build log for `CpResource.*GoogleService` returned nothing, while the
same search for other bundle resources (privacy manifests, fonts) found
plenty. Every subsequent run of the script (including the two "fixes"
above) saw the stale comment string and skipped entirely, permanently
masking the real gap.

Hand-repaired `project.pbxproj`'s Resources phase and group membership,
then rewrote the script (commit `13936a4`) to check all four pieces (build
file, file reference, Resources phase membership, group membership)
independently and insert whichever are actually missing, hard-failing
loudly instead of silently no-op'ing if a structural anchor genuinely
can't be found.

**10042** / 1.0.0 — IPA — 2026-09-21 — commit `13936a4`. Same content as
the 10039→10042 build attempts (nothing else changed across 10039-10042
except build-pipeline plumbing), now with a build archive that actually
contains what Xcode needs. Verified via `eas-cli build:view`: build ID
`2e2ece6a-ab60-4c9b-9fe0-b1e6ec82b650`, status `FINISHED`, build number
10042. Submitted to App Store Connect on explicit go-ahead: submission
`6ae04925-b3cd-4512-923c-5fa7b0ab48d1`, "Submitted your app to Apple App
Store Connect!" — binary uploaded, Apple-side processing pending at time
of writing. As with 10039, uploading the binary is not the same as
submitting it for App Store review — that still needs a human to attach
this build to a version in App Store Connect and click "Submit for
Review" once processing finishes.

Release notes for this content (10038 through 10042) are drafted in
`src/data/releaseNotes.ts` under version `1.0.0` — **pending user review**,
not yet approved, per the standing rule on that file.

**26092223** / 1.0.30 — AAB — 2026-09-22 — Backend on **testing**
(`ustad-app-backend-testing.vercel.app`), explicitly requested — was already
the active line in `src/config.ts` before this build, no toggle needed.
First Android build carrying the whole-Quran-expansion content already
shipped to iOS as 1.0.30 (10037/10038 — 114-surah map, `SearchSurahsScreen`,
chapter-cut fix, streak calendar), which Android hadn't gotten since its own
last build, 1.0.29/26091602 — same "picks up iOS content" convention as that
build's own note. Plus this session's own fixes: `hydrateInner`'s
network-vs-401 distinction (offline launch no longer wipes the stored
session), `api/client.ts`'s `refreshAccess()` no longer mislabels a network
failure during token refresh as a real 401, new `isOffline`
flag + `OfflineBanner` shown regardless of login state, local notifications
now reschedule from a cached streak snapshot on an offline launch instead of
silently skipping, map search button resized to 3x with exact streak-pill
alignment, and the mountain-skyline crop-on-shrink bug fix. Full detail in
`changes-2026-09-22.md`.

**Dependency gap found and fixed during this build:** `@notifee/react-native`
has been a real `package.json` dependency since 2026-09-04 but was never
installed into `C:\BuildProjects\ustadapp-mobile\node_modules` — confirmed
missing outright before this build (the standing local-notifications memory
already flagged "android/ hasn't reached BuildProjects yet" back on
2026-09-04 and this was apparently never closed since). Since
`services/localNotifications.ts` does an unconditional
`require('@notifee/react-native')` in its non-`__DEV__` path, Metro would
have failed to resolve the module and broken `bundleRelease` outright had
this gone unnoticed. Fixed by copying `node_modules/@notifee` from OneDrive
into BuildProjects and syncing `package.json`/`package-lock.json` (same
"install in both, robocopy doesn't cover it" precedent as 1.0.28's
`babel-plugin-transform-inline-environment-variables` gap). No
notifee-specific `patches/` entry exists, so nothing to reapply.

Verified directly from the produced artifact (not inferred): extracted
`base/manifest/AndroidManifest.xml` from inside the `.aab` zip (a stale,
unrelated `intermediates/bundle_manifest/.../AndroidManifest.xml` from
2026-09-07 was NOT regenerated this build and would have been misleading —
checked the real manifest packed into the artifact instead) —
`versionCode="26092223"`, `versionName="1.0.30"`,
`com.ustadapp.notifee-init-provider` present (confirms notifee actually
linked, not just present in node_modules). Extracted
`base/assets/index.android.bundle` (Hermes bytecode) and grepped its string
table directly: `https://ustad-app-backend-testing.vercel.app` present,
`https://ustad-app-backend-six.vercel.app` (production) absent; "You're
offline. Changes will sync once you're back online." and `isOfflineBanner`
present (today's offline-banner fix compiled in, not a stale cached
bundle); "Search for any surah by name or number..." present (confirms
current whole-Quran-expansion source, not an old bundle).

**Not independently verified this session:** nothing in this build has been
installed or run on a device or emulator. This is a closed-testing
candidate, not a production upload — do not attach this `versionCode` to
the production track (`26091602` is still the production candidate
currently under Play review, see project memory).

Output: `C:\BuildProjects\ustadapp-mobile\android\app\build\outputs\bundle\release\app-release.aab`

**26092307** / 1.0.31 — AAB — 2026-09-23 — re-stamp of 26092223/1.0.30, same
content, no source changes since (confirmed via `git status --short` on
`ustadapp/` — only already-built files were dirty, nothing new). Backend
still on **testing**, unchanged. Requested purely for a new versionCode/
versionName pair, not a content update.

Verified directly from the produced artifact: extracted
`base/manifest/AndroidManifest.xml` — `versionCode="26092307"`,
`versionName="1.0.31"`, `com.ustadapp.notifee-init-provider` present.
Grepped `base/assets/index.android.bundle`:
`https://ustad-app-backend-testing.vercel.app` present, production URL
absent.

Not independently verified this session: same standing caveat, nothing
installed/run on a device. Not a production upload — `26091602` remains
the production candidate under Play review.

Output: `C:\BuildProjects\ustadapp-mobile\android\app\build\outputs\bundle\release\app-release.aab` (overwrites the previous `.aab` in place — grab 26092223's copy first if you still need both artifacts side by side).

**26092516** / 1.0.32 — AAB — 2026-09-25 — fixes the 16 KB page-size crash
risk Play Console flagged against 1.0.29 (`base/lib/arm64-v8a/libsqliteJni.so`).
Traced the actual cause first rather than re-bumping `ndkVersion` again (it
was already 28.0.13004108, unrelated): `libsqliteJni.so` ships prebuilt
inside Google's own `androidx.sqlite:sqlite-bundled-android:2.6.0`, pulled
in transitively by `@react-native-async-storage/async-storage`'s native
`storage-android` backend (`org.asyncstorage.shared_storage:storage-android`
→ `androidx.sqlite:sqlite-bundled:2.6.0`) — confirmed via
`gradlew :app:dependencies --configuration releaseRuntimeClasspath`, not
inferred. Bumping this project's own NDK does nothing for a binary Google
already compiled and published. Fix: added a `resolutionStrategy.force` in
`app/build.gradle` pinning `androidx.sqlite:sqlite-bundled` /
`sqlite-bundled-android` to `2.7.1` (latest stable as of 2026-09,
confirmed via developer.android.com's own release notes). Backend unchanged,
still **testing**.

Verified beyond "it resolved": re-ran the dependency resolution first
(`androidx.sqlite:sqlite-bundled:2.6.0 -> 2.7.1`, no conflicts) before
attempting a real build. After building, extracted the actual
`libsqliteJni.so` from the produced `.aab` and ran `readelf -lW` on it
directly — all four `LOAD` segments show `0x4000` (16 KB) alignment, the
literal property Play Console's warning is about, not just "a newer version
number resolved." File size also dropped from ~2.5 MB to ~1.07 MB
(arm64-v8a), consistent with a genuinely different compiled binary, not the
same file relabeled. `versionCode="26092516"`, `versionName="1.0.32"`,
`com.ustadapp.notifee-init-provider` present — same manifest checks as prior
builds.

**Not fixed this build** (per user discussion, these are Play Console
"recommended" quality items, not review blockers, and weren't in scope for
this specific ask): edge-to-edge deprecated-API warning (root cause not yet
isolated — app's own `MainActivity.kt`/`UstadNavigationBarModule.kt` already
use modern `WindowInsetsControllerCompat` APIs; `styles.xml`'s
`Theme.AppCompat.DayNight.NoActionBar` base theme is the only lead so far,
unconfirmed), the portrait-orientation-lock/large-screen-support suggestion
(`android:screenOrientation="portrait"` in `AndroidManifest.xml`, likely
intentional — app isn't built for landscape/tablet), and bitmap image
optimization (found several oversized PNGs — `mascot.png` 1.6 MB,
`clouds.png` 1.3 MB, `lumo_kufi.png`/`kufi_lumo.png` 780 KB each — not yet
compressed).

Not independently verified this session: nothing installed/run on a device.
Not a production upload — `26091602` remains the production candidate
under Play review.

Output: `C:\BuildProjects\ustadapp-mobile\android\app\build\outputs\bundle\release\app-release.aab` (overwrites 26092307's artifact in place).

**26093022** / 1.0.33 — AAB — 2026-09-30 — production-ready AAB, backend
still **testing** (per request). Commit `0910dd5`. Contents since 1.0.32:
surah Progress screen (shield button under XP) with real per-surah
progress; stars follow accuracy (100% = 3, 66%+ = 2, else 1) on the
completion screen and the map; wrong answers now always lower accuracy
(app side; the backend counter change is written but not yet deployed);
map mountain fully visible and flush on a straight grass edge with no sky
leak (asset cropped + solid base skirt); search button 2x and centered
under the streak pill; leaderboard illustrated avatars; offline banner.
Approved 1.0.33 in-app release notes.

Verified from the artifact: versionCode 26093022 and versionName 1.0.33 in
`base/manifest`, `notifee-init-provider` present, arm64-v8a +
armeabi-v7a libs, `base/assets/index.android.bundle` contains the testing
URL and not the production one, plus new strings ("surahs complete",
"Mistakes now always count"); mountain drawable is the new 1382x425.
Stale-resource caches cleared before building.

Not independently verified on a real phone. Emulator (x86_64 release
builds of the same source) covered the map, Progress screen, stars and a
full lesson.

Output: `C:\BuildProjects\ustadapp-mobile\android\app\build\outputs\bundle\release\app-release.aab`

**20040** / 1.0.0 — IPA (TestFlight) — 2026-10-01 — commit `3ce28c1`, GitHub
Actions run `36842303847`, EAS build `31586baa-c72a-4283-9b66-220ec24e1a07`.
Same app content as Android 26093022 / 1.0.33 (Progress screen,
accuracy-based stars, accuracy counting fix, mountain/grass seam, search
button, leaderboard avatars, offline banner, approved 1.0.33 notes).
Backend still **testing**.

First attempt (run `36751646895`, commit `0910dd5`) built fine but was
stamped 10039, a number Apple already held from the hand-numbered 09-21
build, so the submit hung ~64 min and failed with a generic error. Fixed by
raising the workflow baseline to `20000 + run_number`.

Not verified on a device yet; needs a TestFlight install. Still does not
fix the App Review rejection (Guideline 4.8, Sign in with Apple).

**20042** / 1.0.0 — IPA (TestFlight) — 2026-10-03 — commit `2ef5415`, GitHub
Actions run `37133537903` (7m44s), EAS build
`d9e26b64-ea24-4624-a990-6312e2ecafd6`, submission
`913f9976-1fef-49b0-8c3f-7fb70d55e062`. Backend still **testing** (deliberate,
user asked for it explicitly).

First build carrying Sign in with Apple (`9af2e4e`). The signing step passed,
which confirms the `com.apple.developer.applesignin` entitlement is now
present in the App Store provisioning profile held in
`IOS_PROVISIONING_PROFILE` — the portal work flagged as a blocker in
changes-2026-10-03.md is done.

Also the first build with performance Phase 1 step A (`f41c9ba`): console
stripping wired, `TOUR_GLOW` moved out of `LessonSessionScreen` so `MainTabs`
no longer pulls it into the splash bundle, `MapScreenV2` behind a `__DEV__`
require, `renderMode="SOFTWARE"` dropped from all 12 Lotties, and
`enableFreeze(true)` at entry. Plus the never-stopping animation fixes
(map gold pulse, Quests/Leaderboard bobs, Profile flame) and assets cut from
about 14 MB to 5.3 MB. Daily Quest now shows the reading-Lumo mascot and
Profile has the logo top left on a green pill. In-app release notes 1.0.34
were added and shipped WITHOUT the usual review, at the user's explicit
direction for this build only.

First attempt (run `37133293302`, commit `f41c9ba`) failed at `npm ci` in 16s:
`9af2e4e` had regenerated the lock with npm 11 while the runner uses npm 10,
dropping three nested peer entries (1454 -> 1451 packages). Fixed in `2ef5415`
by regenerating with `npx npm@10 install --package-lock-only` (now 1455) and
verifying with `npx npm@10 ci --dry-run`. Same failure mode as `c99783c`;
nothing yet prevents it recurring whenever the lock is regenerated on a
machine whose npm major differs from the runner's.

Not verified on a device. Nothing in this build has been run in the app: the
asset re-encode, the Lottie render-mode change, the focus-scoped animations
and the new Profile logo pill are all first seen here. The pill is a new UI
element rather than a like-for-like swap, so it is the most likely to need
adjusting.

**20043** / 1.0.35 — IPA (TestFlight) — 2026-10-06 — commit `ae6f0fd`, GitHub
Actions run `37516845411`, EAS build `2bd41d75-c3ab-4a1c-897c-ab9b6f8da9b9`,
submission `ace5db33-5a6d-48e2-9865-bdd1e8933a48`. Backend switched to
**production** (`ustad-app-backend-six.vercel.app`) on the user's explicit
instruction, the first build to leave the testing backend.

**First iOS build to carry a real version string.** The EAS log reports
`App Version: 1.0.35`, where 20040 and 20042 were both stamped 1.0.0 — no iOS
workflow exports `VERSION_NAME` and `MARKETING_VERSION` was a hardcoded
"1.0.0". Fixed by making `package.json` the single canonical source and adding
`scripts/sync-version.mjs` to propagate it into `app.json` and both pbxproj
`MARKETING_VERSION` entries, which `build:apk`/`build:aab` now run. This build
is the verification that it works.

Contents since 1.0.34 (full detail in `changes-2026-10-05.md`, `-06`, `-07`):

- Connectivity rebuilt. `authStore.isOffline` — one boolean with five write
  sites across three uncoordinated timers — replaced by
  `store/connectivityStore.ts`: `isDeviceOffline` from the OS via
  `@react-native-community/netinfo` 12.0.1, `isServerUnreachable` only for
  ApiError status 0. Fixes the offline banner appearing on a working app
  (healthCheck's 5 s fuse raced hydrate's 30 s against a cold serverless
  start) and a 500/503 no longer claiming the device is offline.
- Banner copy no longer promises a sync that never existed.
- Surah search shows open (first level complete) / closed (not) / done (all
  complete), with `unknown` deliberately untagged so a failed fetch cannot
  label all 114 closed. Confirm dialog on opening a closed surah.
- `firstLevels` failures surface a retry instead of a silent `console.warn`
  that left every row uncoloured.
- Analytics and the Profile label now read one version source.
- In-app release notes 1.0.35, reviewed and approved by the user **before**
  this build — the standing rule, back in force after 1.0.34's exception.

**`npm ci` passed.** The netinfo install had reproduced the exact lockfile
regression that failed 20042 at 16 s: local npm 11.9.0 dropped the package
count 1455 -> 1452. Caught before pushing by diffing the count against HEAD
and fixed with `npx npm@10 install --package-lock-only` (now 1456). Now a
standing rule in memory, so it should stop recurring.

**netinfo native linkage verified** by this build: the EAS macOS worker ran
`pod install` and the iOS build compiled, which is the confirmation that could
not be obtained from the Windows dev machine.

Timing note: the EAS build itself finished in about 6 minutes (19:10 to 19:16),
but the run took 2 h 47 m total because the TestFlight submission wait ran to
21:56. The workflow still reported success on every one of its 15 steps.

Not verified on a device. The connectivity rebuild, the search open/closed/done
states and the production backend switch are all first seen here. The Gradle
`versionName` fallback that reads `package.json` is **not** exercised by an iOS
build and still needs an Android build to confirm `versionName="1.0.35"`.


**20044** / 1.0.36 — IPA (TestFlight) — 2026-10-10 — commit `4224a9f`, GitHub
Actions run `38019597100` (#44), EAS build `807255ea-bc84-4a38-91ed-44ecaac9a996`
(account `ahmad.claf`), submission `8dc24c5b-4e69-4ec5-9d31-35d0c81a9f15`.
Backend: **production** (`ustad-app-backend-six.vercel.app`), unchanged since
1.0.35. All 15 workflow steps green on the first try, 7m16s end to end
(EAS reported `App Version: 1.0.36`, `Build number: 20044`).

Contents since 1.0.35 (full detail in `changes-2026-10-08.md`, `-09`, `-10`):

- Search Surah screen rebuilt to the Figma mock on real data: green progress
  card with the real completed/total fraction for started surahs, Jump Here
  for the rest, Map button and reward chest both open "coming soon" popups.
- Progress screen rebuilt to the Figma mock: Al Quran Al kareem summary bar,
  In Progress and Completed sections (Not started no longer listed), Claim
  Reward opens the coming-soon chest popup.
- Real Figma assets: reward chest, Map feature button, back arrow, Hint badge.
- Lesson header: chest badge joined onto the end of the bar, new Hint badge
  (floats below-right when hearts show, inline in review levels).
- Every exercise type: content sits as low as it can while ending above the
  feedback sheet, Check pinned at the bottom, never adds scrolling.
- Shared components: BackButton (14 screens), RewardChestButton,
  ChestInfoModal, and components/lesson/ (LessonHeader, HintButton,
  LessonProgressBar, AyahText, ExerciseLayout, ExerciseFooterButton,
  UstadSays). LessonSessionScreen.tsx 3674 to about 3200 lines.
- Earlier-session fixes shipped with it: offline/unreachable banner copy,
  SlowNetworkModal (server unreachable for 9s+), bigger tap targets on the
  practice calendar's month arrows.
- In-app release notes 1.0.36, reviewed and approved by the user before
  this build.

Pre-flight before pushing: `tsc` clean, `jest` 54/54, local
`expo export:embed` iOS bundle (6.7 MB) with all new assets present.

Not verified on a device. First time anyone sees the new exercise layout,
the measured anchor line above the feedback sheet, and the no-scroll rule on
a short phone.


**20045** / 1.0.37 — IPA (TestFlight) — 2026-10-11 — commit `a4d6429`, GitHub
Actions run `38129187903` (#45), EAS build `2dd5d36f-a227-4e6b-8dee-3ef5b40e337c`
(account `ahmad.claf`), submission `92c615d6-6c70-422d-97fe-00898be866e0`.
Backend: **production**, unchanged. All workflow steps green on the first try
(2026-10-11T09:40:09Z -> 2026-10-11T09:46:21Z UTC); EAS reported `App Version: 1.0.37`, `Build number: 20045`.

Contents since 1.0.36 (detail in `changes-2026-10-11.md`):

- Progress screen sections now match Search's surah states: Open (first
  level complete), Completed, Closed (everything else, including a first
  level started but unfinished, which used to show under "In Progress").
  Closed rows use Search's Jump Here card and "Open {surah}?" confirm.
- In-app release notes 1.0.37, reviewed and approved by the user before
  this build.

Pre-flight: `tsc` clean, `jest` 54/54, local iOS bundle 6.7 MB.
Not verified on a device yet.


**20046** / 1.0.38 — IPA (TestFlight) — 2026-10-11 — commit `9f7fe0b`, GitHub
Actions run `38163321853` (#46), EAS build `5c20369e-78e2-48a0-baa3-036c53fd23b7`
(account `ahmad.claf`), submission `ed922e96-b145-4094-95f5-f2b4ca4c3cea`.
Backend: **production** (`ustad-app-backend-six`), which now serves backend
commit `eb261fa` (leaderboard `avatar_variant`/`is_me`/`me`, per-gender avatar
validation; confirmed live via `/openapi.json` before building). All workflow
steps green first try (18:19:27Z -> 18:26:28Z UTC). `eas-cli build:view`
confirms status finished, Version 1.0.38, Build number 20046, commit
`9f7fe0bd` exact match, real `.ipa`.

Contents since 1.0.37 (detail in `changes-2026-10-11.md`):

- Leaderboard redesigned (Figma 1121:8311, league card replaced by one Lumo):
  back to Home, Hijri date, rank/medal rows, gold "You" row that is always
  the user, own rank shown after the list when outside the top 13.
- 45 head-and-shoulders avatars (26 male, 19 female); onboarding grants one
  by gender; Profile picker is a grid of the user's gender's set; no circles.
- MapScreen split into components and hooks (4017 -> 879 lines), memoized
  background/HUD/chapter-end/feedback button, auth-store selectors.
- In-app release notes 1.0.38, reviewed and approved by the user before
  this build.

Pre-flight: `tsc` clean, `jest` 54/54, local `expo export:embed` iOS bundle
6.7 MB with all 45 avatars. Not verified on a device yet.

**26101123** / 1.0.38 — AAB (Play) — 2026-10-11 — commit `9f7fe0b` (same
source as iOS 20046). Backend: **production**. Built locally from
`C:\BuildProjects\ustadapp-mobile` (`gradlew clean bundleRelease`,
VERSION_CODE=26101123, VERSION_NAME=1.0.38, NODE_ENV=production), 13m35s.

Build tree was stale since 1.0.33 and was brought in line first: `src/`
mirrored, `assets/`, `package.json`, `app.json`, `index.js` (enableFreeze),
`babel.config.js` (remove-console in production), `metro.config.js` (Expo
config), `android/app/build.gradle` (versionName from package.json),
`splash_logo.png`, plus the two packages it was missing
(`@react-native-community/netinfo` 12.0.1,
`@invertase/react-native-apple-authentication` 2.5.1). Patched native modules
left untouched. Old 1.0.33 AAB kept at `C:\BuildProjects\app-release-1.0.33-26093022.aab`.

Verified from the artifact: manifest versionName 1.0.38 and versionCode
26101123; signed (`META-INF/USTAD.RSA`); Hermes bundle 4.06 MB contains the
production URL and not the testing one, plus "Choose your avatar", the 1.0.38
release notes, `is_me`, `avatar-variant`, "Rabi al Akhir", "nothing to see
here"; "Bronze League" and the `[APP] index.js loaded` console line absent;
45 avatar drawables; dex contains netinfo, RNAppleAuthentication, notifee;
libs for arm64-v8a and armeabi-v7a.

Contents: same as iOS 20046 above. Not verified on a device yet.

Output: `C:\BuildProjects\app-release-1.0.38-26101123.aab` (also at
`android\app\build\outputs\bundle\release\app-release.aab`).

**26101317** / 1.0.39 — AAB (Play) — 2026-10-13 — uncommitted working tree
(no commit yet). Backend: **production**. Built locally from
`C:\BuildProjects\ustadapp-mobile` (`gradlew clean bundleRelease`,
VERSION_CODE=26101317, VERSION_NAME=1.0.39, NODE_ENV=production), 8m41s.
`src/`, `assets/` synced; `package.json`/`app.json` copied (only the version
differed); the two resized mdpi drawables copied.

Verified from the artifact: merged manifest versionCode 26101317 /
versionName 1.0.39; signed (`META-INF/USTAD.RSA`); libs arm64-v8a +
armeabi-v7a only; Hermes bundle 3.88 MB contains the production URL and not
the testing one, `isShaking` (MapNodeItem), the approved 1.0.39 release notes
("One matching Hear button", "fresh loading screen with Lumo"); the removed
glow styles (`nodeGlowNormal`) absent.

Contents since 1.0.38: map perf (memoized MapNodeItem + node data, no JS
scroll listener on Android, grass-seam Svg cropped, 6 map images resized,
open-node glow and completed-node pulse removed); new map loading screen
(LumoLoader); Progress screen matched to progress_final; offline banner only
when no network; lesson fixes (hint button, centred exercise layout,
one-line fill-blank ayah, shared HearButton, full-width answer grid,
playback blocked while recording); iOS recorder AAC (no effect on Android).
Release notes 1.0.39 reviewed and approved by the user 2026-10-13.

Emulator (x86_64 builds of the same source): map loads, nodes/tag/card/
chapter-end art correct, idle redraws 0, scroll median frame 650 -> 450ms.
Not verified on a real device yet. SVG background still the main cost.

Output: `C:\BuildProjects\app-release-1.0.39-26101317.aab` (also at
`android\app\build\outputs\bundle\release\app-release.aab`).

**20047** / 1.0.39 — IPA (TestFlight) — 2026-10-13 — commit `6f1e64f`, GitHub
Actions run 38407709463 (#47), `ios-testflight.yml` on `Ahmad/dev`, green
first try (~25 min including submit). Backend: **production**. Same source as
Android AAB 26101317 above: iOS recorder AAC fix (the "Scoring failed" bug),
lesson fixes, map speed work, loading screen, Progress screen, offline banner.
Release notes 1.0.39 approved by the user 2026-10-13. Not yet verified on an
iPhone; recitation is the key thing to check.

**20048** / 1.0.39 — IPA (TestFlight) — 2026-10-13 — commit `c9ed857`, GitHub
Actions run 38424464387 (#48), `ios-testflight.yml` on `Ahmad/dev`, green.
Backend: **production**. 20047 + the iOS recorder fix: 20047's AAC 16kHz
mono + default 128kbps made iOS refuse to start recording ("Could not start
recording"); now AAC mono 44.1kHz 64kbps with two AAC fallbacks. Also carries
the efficiency pass and device_model in usage sessions. Not yet verified on
an iPhone. Map reload star loader (dfc4415) is NOT in this build.
