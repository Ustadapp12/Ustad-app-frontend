# Map / Login-Crash Investigation — Handoff

**Date:** 2026-08-05 · **Branch:** `Ahmad/dev` · **All work below is UNCOMMITTED**

---

## 0. Read this first

**The original reported bug is NOT confirmed fixed.**

The user reports: after login/sign-up the app shows a **dark blue screen (`#0D1B2A`) and freezes**, requiring a force-close. Reopening the app shows the map normally.

That symptom was **never reproduced**. All measurements below come from an Android emulator
(Pixel_5, x86_64, `vm.heapSize=256`, `hw.ramSize=2048`), where the user had already said the app
works — and it did. Real, separate bugs were found and fixed along the way, and map memory is
down ~50%, but **nothing here is proven to be the cause of the blue screen.**

The single highest-value next action is a `logcat` from the physical device at the moment of failure:

```bash
adb logcat -c && adb logcat > crash.txt
# reproduce login -> blue screen, then Ctrl-C
```

---

## 1. Symptoms originally reported

| # | Symptom | Status |
|---|---|---|
| 1 | Dark blue frozen screen after login/sign-up; OK after relaunch | **UNRESOLVED / not reproduced** |
| 2 | Tour overlay background appears fully black on the map | Fixed (two independent causes) |
| 3 | Trees and mosques never visible on the map | Root cause found; decorations removed |
| 4 | "An exception showing" on map open | Fixed — was a leftover debug `Alert` |
| 5 | Faint grey box behind the streak/XP HUD | Fixed (removed blur/gradient) |
| 6 | Map shows blank, then loads | Partly explained (map mount cost) |

---

## 2. Hard measurements

All from a **release** build on the emulator via `adb shell dumpsys meminfo com.ustadapp`.

### Memory

| Build | Native Heap | TOTAL PSS |
|---|---|---|
| Aug-3 APK (pre-fix) | **367,516 KB** | 476,111 KB |
| After all fixes | **155,000–193,000 KB** | ~299,000 KB |

Readings fluctuate with GC timing; treat as a range, not a point.

### The ANR (regression introduced then fixed during this session)

Setting `SVG_BG_TILE_H = 1000` (22 tiles instead of 8) lowered memory to 160 MB but **ANR'd on
fast scroll**:

```
ANR in com.ustadapp
Reason: Input dispatching timed out ... Waited 5114ms for MotionEvent

"main" prio=5 tid=1 Runnable
  at com.horcrux.svg.DefsView.<init>(DefsView.java:21)
  at com.horcrux.svg.VirtualViewManager.createViewInstance(RenderableViewManager.java:522)
  at SurfaceMountingManager.preallocateView(SurfaceMountingManager.kt:1036)
  at MountItemDispatcher.dispatchPreMountItems(MountItemDispatcher.kt:294)
  at FabricUIManager$DispatchUIFrameCallback.doFrameGuarded(FabricUIManager.java:1527)
```

**Key insight: the binding constraint while scrolling is native VIEW CREATION, not bitmap size.**
`react-native-svg` creates a real Android `View` per SVG element, and under Fabric that happens on
the UI thread's frame callback. Smaller tiles = fewer bytes but more mount events = ANR.
Reverted to `3000`. Verified 0 ANRs over 8 aggressive flings.

### Decoration placement is completely broken

From the (now removed) debug dialog, on a real map build:

```
attempts=3468  ok=0  blockedF=2990  roadF=478
```

**Zero decorations have ever been placed.** Every one of 3,468 attempts fails — 2,990 rejected by
`isBlocked` (zone overlap), 478 by `roadClearAcross`. This is why trees/mosques were never visible,
and it also means rocks, birds and lanterns placed via `placeSide` are absent too.
The bug is in `placeSide`'s clearance maths in [`MapScreen.tsx`](../src/screens/home/MapScreen.tsx).

### Tour overlay dim

Measured by sampling grass pixels with/without the tour, solving
`result = (1-a)*base + a*rgb(4,12,9)` per channel:

```
grass L   clean=rgb(191,223,3)  tour=rgb(125,149,5)   alpha=0.346
grass R   clean=rgb(143,195,0)  tour=rgb(94,131,3)    alpha=0.345
grass mid clean=rgb(179,216,0)  tour=rgb(118,145,3)   alpha=0.343
grass low clean=rgb(129,170,1)  tour=rgb(85,115,4)    alpha=0.358
mean = 0.348 (source constant = 0.35)
```

### Asset sizes

| Asset | Dimensions | Decoded RAM |
|---|---|---|
| `s1`–`s3.png` | 186 × 326 | 0.2 MB each |
| `s4`–`s7.png` (before) | **2261 × 4096** | **35.3 MB each** |
| `s4`–`s7.png` (after) | 400 × 725 | 1.1 MB each |

Displayed at `SEASON_GATE_W` ≈ 100 dp. Resizing saved **~30 MB runtime** (NOT the 141 MB
originally predicted — see §5) and ~6.6 MB APK.

---

## 3. Root causes confirmed

### 3.1 Leftover debug `Alert` on every map mount
`MapScreen.tsx` had a `useEffect` firing `Alert.alert('TEMPDBG decor', ...)` on every mount, with
`dbgStats` instrumentation threaded through `buildMapModel`. This is what the user meant by
"an exception showing". Confirmed by screenshot. **Removed.**

### 3.2 Tour card rendered at opacity 0
`TourOverlay.tsx` animated the card's opacity with `useNativeDriver: true`. With
`newArchEnabled=true` (Fabric), the native driver cannot hand the animated node to a view inside a
`<Modal>`, so the value animated in JS while the real view stayed at its initial `0`.

Proven with `uiautomator`: the card was fully present and on-screen —
`"1 of 19"`, `"I'm Lumo…"`, `"Skip"`, `"Next"`, bounds `[222,1585][859,2120]` on a 1080×2340
screen — while the screenshot showed nothing there. **Fixed** by switching to
`useNativeDriver: false` plus a cleanup that leaves the card visible if interrupted.

### 3.3 Tour dim too dark over the map
`rgba(4,12,9,0.86)` over the map's dark green composites to `rgb(9,30,20)` — visually black. The
same overlay over the lesson screen's near-white background gives `rgb(37,45,42)`, which reads as
merely "dull". That is exactly the difference the user described. **Changed to `0.35`.**

Note 3.2 and 3.3 are independent; both had to be fixed.

### 3.4 Map memory
The background is a single scroll canvas `MAP_H` ≈ 21,800 dp ≈ **57,000 physical px** tall
(21 surahs → 116 nodes, including interleaved review nodes). Tiled into 8 `<Svg>` elements, all
mounted unconditionally. Tiling dodged Android's ~100 MB *per-bitmap* Canvas ceiling but not the
*total*: `MAP_W × MAP_H × 4` ≈ 236 MB of bitmap, measured as 367 MB native heap overall.
**Fixed** by virtualizing tiles to the viewport.

### 3.5 Partial `lib/x86_64` — crashes on any x86_64 device
The APK shipped **17** x86_64 libs but **19** arm64 — `libgesturehandler.so` missing for x86_64.
Android's PackageManager picks the best ABI *present*, selects x86_64 on an emulator, then dies:

```
SoLoaderDSONotFoundError: couldn't find DSO to load: libgesturehandler.so
```

Removing x86_64 entirely does **not** help — SoLoader resolves against `Build.SUPPORTED_ABIS[0]`
and won't fall back:

```
SoLoaderDSONotFoundError: couldn't find DSO to load: libreactnative.so
```

Only a **complete** x86_64 set works. `abiFilters` in `app/build.gradle` does **not** control this —
`reactNativeArchitectures` in `gradle.properties` does. Real phones are arm64 (complete set), so
this only ever affects emulators. Documented in `build.gradle`; behaviour unchanged.

---

## 4. Changes made (all uncommitted)

### `src/screens/home/MapScreen.tsx`
- Removed the `TEMPDBG` `Alert` + all `dbgStats` plumbing (type, init, counters, return field).
- Removed `console.time`/`timeEnd` around `buildMapModel`.
- **Removed trees and mosques entirely** — render blocks, all 6 placement passes
  (3 mosque + 3 tree), `DecorMosque`/`DecorTree` types, `TREE_SVG_SRC`/`MOSQUE_SVG_SRC`,
  `TREE_W/H`, `MOSQUE_W/H`, `Ellipse` import. They never rendered (`ok=0`).
- **Tile virtualization**: new `tileWindow` state, updated from a `listener` on the existing
  scroll `Animated.event`; only tiles within ±1 screen are mounted. Seeded on auto-scroll.
- `SVG_BG_TILE_H` promoted to a module constant, value **3000** (see ANR above).

### `src/navigation/RootNavigator.tsx`
- Replaced all `React.lazy` + `<Suspense fallback={null}>` screens with **static imports**.
  `metro.config.js` already sets `inlineRequires: true`, which defers module evaluation anyway, so
  the lazy layer bought nothing and added a screen that could render `null` (painting the
  navigator's `#0D1B2A`). **This was not the blue-screen cause** (see §5.2) but is a real cleanup.

### `src/components/tour/TourOverlay.tsx`
- `DIM` `rgba(4,12,9,0.86)` → `rgba(4,12,9,0.35)`.
- Card fade: `useNativeDriver: true` → `false`, plus cleanup setting opacity to 1 on unmount.

### `android/app/build.gradle`
- Comment only — documents `abiFilters` vs `reactNativeArchitectures` and the partial-ABI trap.
  **No behavioural change**; `abiFilters` is back to `"arm64-v8a", "armeabi-v7a"`.

### `assets/map/s4.png` … `s7.png`
- Resized 2261×4096 → 400×725. **Originals preserved in `assets/map/_originals/`.**

---

## 5. Wrong theories — do not re-investigate

Recorded so the next person doesn't repeat them. Each was disproven by evidence.

**5.1 "The debug `Alert` causes the blue screen."**
Plausible (a Dialog during a native-stack transition), but the user confirmed the blue screen
predated that code. The alert was real and is removed, but it is not the cause.

**5.2 "`babel-preset-expo` + bare Metro config makes `import()` never settle."**
Disproven by decompiling the release bundle. Metro's asyncRequire falls back to a **synchronous**
`importAll` when no `__loadBundleAsync` loader is registered:
```js
var u = g[`${__METRO_GLOBAL_PREFIX__}__loadBundleAsync`];
...
return null != l ? l.then(f) : f();   // no loader -> f() = r.importAll(n), synchronous
```
Also confirmed Babel leaves `import()` untouched. Dynamic imports resolve fine in release.

**5.3 "`s4`–`s7.png` cost 141 MB."**
Arithmetic was right (35.3 MB × 4) but wrong in practice — Fresco evicts. Actual saving from
resizing: **~30 MB**.

**5.4 "Smaller tiles are strictly better."**
False. 1000 dp lowered memory to 160 MB but caused a 5.1-second ANR. View creation dominates.

**5.5 "Tour black background = map failed to render."**
Disproven by the user: the map renders fine on relaunch yet the tour was still black. Actual
causes are 3.2 + 3.3.

**5.6 "The app isn't processing input" (dialog wouldn't dismiss).**
Wrong — bad `adb input tap` coordinates. The app was responsive.

**5.7 "The 503 on `/` is the app's API call."**
No. The app only calls `{BASE}/api/v1/*` and `{BASE}/health`. The Vercel log showed
`/favicon.ico` + `/favicon.png` requests — that's a **browser**. The 503 was a cold start
(`Runtime dependencies installed in 2.29s`), and the next request 0.3 s later returned 200.
Also: an API failure cannot freeze the app — `api()` throws `ApiError`, and login/map callers
catch it and show an error.

---

## 6. Open issues — NOT fixed

| Priority | Issue | Notes |
|---|---|---|
| **P0** | Blue screen after login on device | Not reproduced. Needs device `logcat`. |
| **P1** | `placeSide` places nothing (`ok=0`) | 3,468/3,468 attempts fail. All `placeSide` decorations absent. |
| **P2** | Nodes/pills/labels not virtualized | ~250+ view subtrees mounted across the full 57,000 px canvas. Only SVG tiles are windowed. |
| **P2** | Grass could be a native repeating `<Image>` | `GRASS_EDGE_D` is jagged only at the top, then a plain rect. Would delete the grass `<Pattern>`/`<Defs>` from every tile — the exact ANR source. |
| **P3** | Consider `@shopify/react-native-skia` | Immediate-mode canvas ⇒ memory O(screen) not O(map). Removes tiling entirely. Right long-term answer if the map keeps growing. |
| **P3** | Dead code | 9 eslint errors: `PredictedProgressBar`, `MAP_LOAD_ESTIMATE_MS`, `pickEvenly`, `TOP_MARGIN`, `mapLoadDurationMs` + 4 exhaustive-deps. |
| **P3** | Unused heavy assets | `Grasses.jpg` (2.2 MB), `mosque.png`/`new_mosque.png` (835 KB each), `tree2/tree3.png`. No longer bundled but still in the repo. |
| **P3** | `clouds.png` 1988×1290 (9.8 MB decoded) | Next-largest oversized asset. |
| — | `src/config.ts` points at the **testing** backend | Confirm before any device test or release. |

---

## 7. Build & test — traps to know

**Never build from the OneDrive path.** Sync to `C:\BuildProjects\ustadapp-mobile\` and build there.

### Gradle silently caches image assets — this produced a false measurement
`./gradlew assembleRelease` reports the RN asset task up-to-date and keeps **old** copies in
`build/generated/res/react/`. A build after resizing `s4`–`s7` still shipped the originals
(visible as ~1.77 MB entries `res/D_.png`, `qS.png`, `r7.png`, `zN.png` — AAPT2 obfuscates names),
and memory appeared unchanged at 254 MB. **Whenever art changes:**

```bash
rm -rf android/app/build/generated/res/react android/app/build/generated/assets/react
```

Verify the APK actually contains what you think:
```bash
unzip -l app-release.apk | awk '$1>1000000 && /\.png/ {print $1,$4}'
```

### Release build (ship this)
```bash
cd C:/BuildProjects/ustadapp-mobile/android
./gradlew assembleRelease          # arm only, per gradle.properties
```

### Emulator build (x86_64 AVD only)
```bash
./gradlew assembleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86_64
```
Without the override the app **crashes at startup on any x86_64 emulator** (§3.5).
Do **not** ship this variant — it adds ~30 MB.

### Useful commands
```bash
adb shell dumpsys meminfo com.ustadapp | grep -E "Native Heap|TOTAL PSS"
adb shell uiautomator dump /sdcard/ui.xml && adb shell cat /sdcard/ui.xml   # find invisible views
adb shell cat /data/anr/anr_*        # ANR stacks (needs root on emulator)
adb logcat -d | grep -A8 "FATAL EXCEPTION"
```
Note: PowerShell `>` redirection corrupts binary output (adds a BOM) — use Git Bash for
`adb exec-out screencap -p > file.png`. Git Bash mangles device paths — use PowerShell or
`MSYS_NO_PATHCONV=1` for `adb shell ... /sdcard/...`.

---

## 8. Suggested order of work

1. **Build for the device and test login → map.** Everything else is secondary until the P0 is
   either reproduced or confirmed gone. Capture `logcat` if it still fails.
2. **Commit.** All work is uncommitted on `Ahmad/dev`; the APK the user tests does not match git.
3. Fix `placeSide` (P1) — or delete the remaining decoration passes if they aren't wanted.
4. Grass → native repeating `<Image>` (P2), and measure whether it moves the number before
   committing to any larger rewrite.
5. Add a regression guard: a Jest test computing `MAP_W × MAP_H × 4` from `SECTIONS_DEF` and
   failing above a budget. Both the 7→21 surah expansion and the review-node interleaving would
   have been caught at CI instead of on a phone.

---

## 9. Useful context

- **Regression origin.** `bfb5912` (7 surahs) → `d54d8f6` "added tour basic" (21 surahs) took the
  map from 18 to 75 nodes, 46 MB → 156 MB, and introduced `SVG_BG_TILE_H` tiling to dodge the
  per-bitmap crash. The **uncommitted** review-node interleaving then took it to 116 nodes /
  236 MB. Neither change looked like a memory change.
- **Node maths.** `buildLevelsWithReviews` inserts a review node after every 2 groups plus a
  trailing solo — that is what turned 75 nodes into 116 (+55% map height).
- **`#0D1B2A` appears in three places:** the navigator's `contentStyle`, `SplashScreen`'s
  background, and `ErrorBoundary`'s background. A frozen `#0D1B2A` screen with no text is *not*
  ErrorBoundary (which renders "Something went wrong" + a button), which is why a native/OOM
  failure was suspected — those produce no JS exception to catch.
