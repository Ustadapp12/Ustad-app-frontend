# Design Handoff — Team Figma → React Native

**Source of truth (interactive prototype):**  
`/Review app design file/` — Figma export ([Figma link](https://www.figma.com/design/JyGYLY86s2icqUrxhU5Opk/Review-app-design-file))

**Run prototype locally:**
```bash
cd "Review app design file"
npm i && npm run dev
```

**Mobile app:** `mobile/` — implement screens to match prototype + wire FastAPI.

---

## Brand tokens (from `App.tsx` / `theme.css`)

| Token | Hex | Usage |
|-------|-----|--------|
| `G` primary | `#05966A` | Buttons, progress, chapter banners |
| `Y` accent | `#E9C468` | Streak, XP, logo Arabic, highlights |
| `B` dark | `#0F1B2A` | Splash/welcome bg, home bg |
| `C` charcoal | `#5A5D68` | Body secondary |
| `GR` grey | `#95A3B8` | Borders, muted text |
| `AS` ash | `#F5F7FA` | Form screens bg |

**Logo:** Arabic `أُسْتَاذ` (Amiri) + subtitle `USTAD · HIFZ` (Nunito)  
**Mascot:** `src/imports/arab-man_9193916.png` → copied to `mobile/assets/images/mascot.png`

---

## Screen flow (design order)

| # | Design `Screen` id | RN route (target) | Status |
|---|-------------------|-------------------|--------|
| 1 | `splash` | `Splash` | **Updating** — dark + mascot + logo |
| 2 | `welcome` | `Welcome` | **Updating** — dark + feature chips |
| 3 | `signup` | `AuthRegister` | Partial — match form UI |
| 4 | `verify` | `AuthVerify` | **New** — OTP / email verify |
| 5 | `purpose` | `OnboardingPurpose` | **New** — 6 purpose options |
| 6 | `script` | `OnboardingScript` | **New** — Uthmani / Nastaliq / Simple |
| 7 | `intro` | `Intro` | Partial — speech bubble |
| 8 | `path` | `PathChoose` | Partial — beginner / advanced cards |
| 9 | `test-intro` | `PlacementIntro` | Partial |
| 10–13 | `test-1` … `test-4` | `PlacementTest` | **New** — 4 exercise types |
| 14 | `test-results` | `PlacementResults` | **New** |
| 15 | `celebrate` | `LessonComplete` / celebrate | Partial |
| 16 | `streak` | `StreakModal` | Partial |
| 17 | `goal` | `OnboardingStreakGoal` | Partial |
| 18 | `home` | `MainTabs` → Journey path | **New UI** — winding path, chapters |
| 19 | `level-intro` | `LessonStart` | Partial |

**Bottom tabs (design home):** Home · Stats · Profile (not Journey/Revision split on home — path is main home content)

---

## Key UI patterns to port

| Pattern | Design reference | RN component |
|---------|------------------|--------------|
| `IrabBg` | Arabic watermark background | `IrabBackground.tsx` (optional) |
| `Logo` | Amiri + Nunito subtitle | `Logo.tsx` |
| `Mascot` | Bouncing PNG | `Mascot.tsx` |
| `StepDots` | Onboarding progress | `StepDots.tsx` |
| `BackButton` | Circle chevron | `BackButton.tsx` |
| Chapter banner | Green/grey surah card | `SurahBanner.tsx` |
| Level nodes | left/center/right zigzag | `LevelPath.tsx` |
| Top bar | Streak · Logo · XP · Hearts | `HomeHeader.tsx` |
| Achievement toast | Yellow border popup | `AchievementToast.tsx` |

---

## Onboarding copy (from design — use in `copy.ts`)

- Welcome tagline: *"The gamified way to memorise the Holy Quran"*
- CTA primary: *"Get Started — it's free"*
- CTA secondary: *"I already have an account"* (yellow outline on dark)
- Splash loading: *"Preparing your journey…"*

**Purpose options:** Hifz, School, Recitation, Re-memorisation, Friends & Family, Other

**Path:** Beginner vs Advanced (placement test)

---

## Assets in design bundle

| File | Use |
|------|-----|
| `src/imports/arab-man_9193916.png` | Mascot |
| `Asset 3.png` | Brand / marketing |
| `src/imports/*_Light_*.png` | Screen reference PNGs |
| `src/imports/Duolingo_*.png` | Reference only — do not copy UX literally |

---

## API mapping (unchanged)

Design is UI-only. Progress, sessions, hearts, XP still from FastAPI — see [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md).

| Design UI | API |
|-----------|-----|
| Home level nodes | `GET /learning/surahs/{n}/levels` |
| Chapter list | `GET /content/surahs?juz=30&mvp_only=true` |
| Sign up | `POST /auth/register` |
| Script preference | Local until `PATCH /users/me/profile` |

---

## Implementation priority

1. **P0** — Splash, Welcome, Logo, Mascot, colors (this PR)
2. **P1** — Sign up / Login / Verify matching design forms
3. **P2** — Purpose, Script, Path onboarding
4. **P3** — Home path map (zigzag nodes + chapter banners)
5. **P4** — Placement test screens
6. **P5** — Lesson exercises styled like design test screens

---

## Figma

https://www.figma.com/design/JyGYLY86s2icqUrxhU5Opk/Review-app-design-file

When design updates, re-export to `Review app design file/` and diff `App.tsx` screen list.
