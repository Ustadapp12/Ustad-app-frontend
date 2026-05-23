# UstadApp Mobile — Action Plan

This plan turns your FRD, UI brief, brand guidelines, and existing FastAPI backend into a shippable React Native MVP. Work is ordered so each phase produces something testable.

---

## Principles

1. **Mobile owns UX** — exercises, Tajweed colors, audio player, voice scoring UI; backend owns progression, hearts, XP, unlock order.
2. **API-first where possible** — use live endpoints; mock only for gaps listed in [BACKEND_GAPS.md](BACKEND_GAPS.md).
3. **Screen-by-screen** — you deliver Figma/screenshots per screen; we implement against [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
4. **MVP = Juz Amma subset** — surahs 78–86 (configurable via backend `MVP_SURAH_NUMBERS`).

---

## Phase 0 — Foundation (Week 1)

| # | Task | Output |
|---|------|--------|
| 0.1 | Scaffold Expo + TypeScript + Expo Router | Runnable app |
| 0.2 | Design tokens (`theme/`) from [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Colors, spacing, Nunito |
| 0.3 | API client + secure token storage | `api/client.ts`, refresh on 401 |
| 0.4 | Env config (`API_BASE` iOS/Android/device) | `.env.example` |
| 0.5 | Core UI primitives | `Button`, `Text`, `Screen`, `SpeechBubble` |
| 0.6 | Startup flow (3 screens) | [STARTUP_SCREENS.md](STARTUP_SCREENS.md) |

**Exit criteria:** App launches → splash → get started → personalization intro; can reach auth placeholders.

---

## Phase 1 — Auth & onboarding (Week 2)

| # | Task | API |
|---|------|-----|
| 1.1 | Sign up / Login / Forgot password UI | `POST /auth/register`, `/login` |
| 1.2 | Token persistence + auto-refresh | `POST /auth/refresh` |
| 1.3 | Onboarding carousel (3–5 screens) — **needs your screenshots** | Local only |
| 1.4 | Learner mode picker (child / adult / beginner) | **Mock** until profile API |
| 1.5 | Post-login: `GET /learning/me` → global store | Hearts, streak, XP, gems |

**Exit criteria:** Register, login, see dashboard shell with real gamification header.

**Deferred:** Google / Apple / guest (backend not ready).

---

## Phase 2 — Content browse & journey (Week 3)

| # | Task | API |
|---|------|-----|
| 2.1 | Tab navigation: Home, Journey, Revision, Profile | — |
| 2.2 | Juz 30 / MVP surah list | `GET /content/surahs?juz=30&mvp_only=true` |
| 2.3 | Surah detail + progress bar (client-computed) | Levels + completions |
| 2.4 | Level map (locked / available / stars) | `GET /learning/surahs/{n}/levels` |
| 2.5 | Reciter picker (settings) | `GET /content/reciters` |
| 2.6 | Surah search | **Mock** or client filter until search API |

**Exit criteria:** Pick surah → see level path → tap available level.

---

## Phase 3 — Lesson session core (Weeks 4–5)

| # | Task | API |
|---|------|-----|
| 3.1 | Load lesson payload | `GET /lessons/groups/{group_id}` |
| 3.2 | Start session | `POST /learning/sessions` |
| 3.3 | Exercise runner (sequential steps) | `POST .../attempts` |
| 3.4 | Hearts UI + mistake tracking | Client; sync on complete |
| 3.5 | Session complete + rewards | `POST .../complete` |
| 3.6 | Summary screen (score, XP, gems, stars) | Refresh `/learning/me` |

**MVP exercise set (implement first):**

1. Listen to recitation  
2. Fill missing word  
3. Arrange ayah order  
4. Match Arabic → meaning (MCQ)  
5. Listen & repeat (voice UI; log attempt, optional `POST /progress/voice-attempt`)

Full list: [EXERCISES.md](EXERCISES.md).

**Exit criteria:** Complete one lesson group end-to-end with real backend rewards.

---

## Phase 4 — Hifz player & revision (Week 6)

| # | Task | API |
|---|------|-----|
| 4.1 | Ayah audio player (`expo-av` or track-player) | `audio_url` from content |
| 4.2 | Word/verse highlight during playback | Client |
| 4.3 | Loop, speed, hide text | Client |
| 4.4 | Revision tab “due now” | `GET /revision/next` + content fetch |
| 4.5 | Reschedule after review | `POST /revision/schedule` |

**Exit criteria:** Revision queue shows next ayah; audio practice works offline-cached (basic).

---

## Phase 5 — Progress, polish, ship prep (Week 7+)

| # | Task | Notes |
|---|------|-------|
| 5.1 | Profile / stats dashboard | Derive from levels + `/learning/me` |
| 5.2 | Streak / XP modals | Match Figma |
| 5.3 | Error & empty states | 401 → login, 409 active session |
| 5.4 | Offline cache (ayah JSON + audio) | AsyncStorage + FileSystem |
| 5.5 | Accessibility pass | Dynamic type, contrast |
| 5.6 | E2E smoke tests | Detox or Maestro (optional) |

**Post-MVP:** Leaderboards, badges, push, teacher mode, OAuth, admin — see [MVP_SCOPE.md](MVP_SCOPE.md).

---

## Parallel tracks (ongoing)

| Track | Owner | Doc |
|-------|--------|-----|
| Design handoff | You / designer | [DATA_NEEDED.md](DATA_NEEDED.md) |
| Content QA (Arabic) | Scholar / content | Backend Mongo import |
| Backend gaps | Backend team | [BACKEND_GAPS.md](BACKEND_GAPS.md) |

---

## Milestones summary

| Milestone | Target | Deliverable |
|-----------|--------|-------------|
| **M0** | Week 1 | Startup screens + theme + API shell |
| **M1** | Week 2 | Auth + onboarding |
| **M2** | Week 3 | Journey / surah / level map |
| **M3** | Week 5 | Full lesson loop + 5 exercise types |
| **M4** | Week 6 | Audio player + revision |
| **M5** | Week 7+ | MVP polish + TestFlight / internal APK |

Timelines assume one focused developer; adjust for team size.

---

## Immediate next steps (for you)

1. Confirm backend URL and that seed data runs (`surahs 78–86`, lesson groups, audio).
2. Provide **logo** (SVG/PNG) to replace green placeholder squares on startup screens.
3. Send next screenshots: **onboarding slides**, then **sign up / login**.
4. Confirm Arabic font license for production (Kidzhood / Mahameru demo vs licensed).
5. Say when to scaffold Expo in this repo (Phase 0.1).

---

## Screen build order (recommended)

See [SCREEN_INVENTORY.md](SCREEN_INVENTORY.md). Order matches user journey:

`Splash → Get Started → Personalization intro → Onboarding → Auth → Home → Juz/Surah → Level map → Lesson start → Exercises → Complete → Profile / Revision`
