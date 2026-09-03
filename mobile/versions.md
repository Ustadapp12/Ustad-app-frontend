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

Output: `C:\BuildProjects\ustadapp-mobile\android\app\build\outputs\bundle\release\app-release.aab`
