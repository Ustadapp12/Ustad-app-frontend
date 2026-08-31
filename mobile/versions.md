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
