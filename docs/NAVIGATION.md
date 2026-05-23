# Navigation & User Flows

**Router:** Expo Router (file-based). Route names below are suggested paths.

---

## Auth stack (unauthenticated)

```
(splash)          → app/index.tsx              # Loading / splash
(welcome)         → app/welcome.tsx            # Get Started
(personalize)     → app/onboarding/intro.tsx   # Speech bubble + Continue
(onboarding)      → app/onboarding/motivation.tsx
                  → app/onboarding/daily-goal.tsx
                  → app/onboarding/notifications.tsx
                  → app/onboarding/account-prompt.tsx
                  → app/onboarding/learner-mode.tsx  # optional
(auth)            → app/(auth)/login.tsx
                  → app/(auth)/register.tsx
                  → app/(auth)/forgot-password.tsx
```

**Flow:**

```
Splash (auto 1.5s) → Welcome → Personalization intro → Onboarding → Register OR Login → (tabs)
```

“Get Started” → onboarding path. “I already have an account” → login.

---

## Main app (authenticated) — tabs

```
app/(tabs)/
  index.tsx       # Home dashboard
  journey.tsx     # Juz / surah browse
  revision.tsx      # SRS queue
  profile.tsx       # Progress & settings
```

---

## Journey stack

```
app/journey/
  index.tsx                    # Juz 30 (MVP)
  surah/[surahNumber].tsx      # Surah detail + progress
  levels/[surahNumber].tsx     # Level map (lesson groups)
  lesson/[groupId]/index.tsx   # Lesson start
  lesson/[groupId]/session.tsx # Exercise runner
  lesson/[groupId]/complete.tsx# Rewards summary
```

---

## Modals / overlays

```
app/modals/
  streak-reward.tsx
  xp-gained.tsx
  hearts-empty.tsx
  reciter-picker.tsx
```

Present with Expo Router `presentation: 'modal'`.

---

## Deep linking (future)

| Path | Screen |
|------|--------|
| `ustadapp://revision` | Revision tab |
| `ustadapp://surah/78` | Surah 78 |
| `ustadapp://lesson/078_group_1` | Start lesson |

---

## State-driven routing rules

| Condition | Route |
|-----------|--------|
| No tokens | `(auth)` or welcome |
| Valid tokens | `(tabs)` |
| `GET /learning/me` 401 after refresh fail | login |
| Active session (`409` on new session) | resume `lesson/.../session` or prompt abandon |

---

## Data loading per screen

| Screen | Prefetch |
|--------|----------|
| Home | `GET /learning/me`, optional `GET /revision/next` |
| Journey | `GET /content/surahs?juz=30&mvp_only=true` |
| Surah | `GET /content/surahs/{n}`, `GET /learning/surahs/{n}/levels` |
| Lesson | `GET /lessons/groups/{id}` then `POST /learning/sessions` |
| Revision | `GET /revision/next` → fetch ayah |

See [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md).
