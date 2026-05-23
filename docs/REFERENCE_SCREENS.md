# UI Reference Map — Duolingo-style → UstadApp

You shared reference screenshots for layout and interaction only. **We do not copy Duolingo colors, mascot, or copy.** Everything uses [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) and your text in copy docs.

---

## Global color translation

| Reference (Duolingo) | UstadApp token | Hex |
|----------------------|----------------|-----|
| Bright blue buttons | `primary` | `#05966A` |
| Bright green CHECK / CONTINUE | `primary` | `#05966A` |
| Yellow progress bar | `yellow` | `#E9C468` |
| Orange streak / goals | `yellow` or `primary` | Prefer `#E9C468` for streak flame accent |
| Purple chapter banner | `dark` + `primary` accent | Banner bg `#0F1B2A` or `primary` with white text |
| Light blue selected card | `ash` bg + `primary` border 2px | — |
| Green “Correct!” footer | `successBg` `#E8F5F0` + `primary` text | Add token |
| Red hearts | `heart` | `#E85D5D` (or keep red for lives) |
| Grey disabled CHECK | `buttonSecondaryBg` | `#E5E7EB` |
| Blue audio button | `primary` square | `#05966A` |
| Pink quest cards | **Do not use** | Use `ash` / `primary` / `yellow` instead |

---

## Screen index by product area

| Ref # | Reference pattern | UstadApp doc | UstadApp ID |
|-------|-------------------|--------------|-------------|
| — | Splash / Welcome | [STARTUP_SCREENS.md](STARTUP_SCREENS.md) | S01–S03 |
| — | Onboarding questionnaire | [ONBOARDING_SCREENS.md](ONBOARDING_SCREENS.md) | O01–O04 |
| 1 | Choose your path | [PATH_PLACEMENT_SCREENS.md](PATH_PLACEMENT_SCREENS.md) | P01 |
| 2 | Mascot intro (duplicate) | STARTUP S03 | Skip duplicate |
| 3 | Placement test intro | PATH_PLACEMENT | P02 |
| 4–8 | In-lesson exercises | [LESSON_UI_SCREENS.md](LESSON_UI_SCREENS.md) | L-EX-* |
| 9 | Motivational interstitial | LESSON_UI | L-INT-01 |
| 10 | Lesson complete | [GAMIFICATION_SCREENS.md](GAMIFICATION_SCREENS.md) | G01 |
| 11 | 1-day streak | GAMIFICATION | G02 |
| 12 | Pick streak goal | GAMIFICATION | G03 |
| 13–14 | Journey / level path | [JOURNEY_MAP_SCREENS.md](JOURNEY_MAP_SCREENS.md) | J04 |
| 15 | Quests / friends | GAMIFICATION | G04 (post-MVP) |

---

## Product mapping (FRD hierarchy)

| Reference concept | UstadApp |
|-------------------|----------|
| Language course | **Juz** (MVP: Juz 30 Amma) |
| Chapter banner | **Surah** |
| Path node (circle) | **Lesson group** (ayah range) |
| Lesson session | **Practice flow** (exercises) |
| Placement test | Optional **Hifz check** (post-MVP API) |
| XP / gems header | `GET /learning/me` |
| Hearts | `hearts_remaining` (10 start) |

---

## Copy files

| Area | File |
|------|------|
| Onboarding | [ONBOARDING_COPY.md](ONBOARDING_COPY.md) |
| Path, lessons, journey, rewards | [APP_COPY.md](APP_COPY.md) |

---

## Build priority (MVP)

1. Startup + onboarding (theme proof)
2. Journey map + level nodes (real API levels)
3. Lesson chrome + 5 exercise layouts
4. Lesson complete + streak
5. Path selection + placement (can mock)
6. Quests / social (post-MVP)
