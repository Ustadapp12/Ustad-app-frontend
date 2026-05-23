# Path Selection & Placement — Build Spec

Duolingo reference: “Choose your path” + “Let’s assess your level”.  
UstadApp: Quran learning entry — **start from beginning** vs **check existing memorization**.

---

## P01 — Choose your path

| Property | Spec |
|----------|------|
| Route | `app/onboarding/path.tsx` or `app/path/choose.tsx` |
| When | After O04 (account) or before first journey if logged in |
| Progress | Optional yellow bar (onboarding) or none |

### Layout

| Element | UstadApp |
|---------|----------|
| Title | Nunito 900, `#0F1B2A` — your copy |
| Cards | 2 large white cards, radius 16, shadow sm, padding 20 |
| Card 1 | Illustration (mosque / open mushaf) + title + subtitle |
| Card 2 | Illustration (graduation cap / checklist) + title + subtitle |
| Tap | Whole card navigates |

### UstadApp content (replace in APP_COPY.md)

| Card | Suggested meaning |
|------|-------------------|
| **A — Start fresh** | New to memorization → Juz Amma, first surah, level 1 |
| **B — Check level** | Already memorized some → placement flow P02 |

### Actions

- Card A → `/(tabs)/journey` or first available `lesson_group_id`
- Card B → P02 placement intro

### Theme

- Card border default: `#E5E7EB`
- Card press: border `#05966A`
- No Duolingo green owl — use your mascot or Islamic illustration

---

## P02 — Placement test intro

| Property | Spec |
|----------|------|
| Route | `app/placement/intro.tsx` |
| Layout | Centered mascot + title + body + primary CTA |

| Element | Spec |
|---------|------|
| Mascot | Your character (not Duolingo cube) |
| Title | e.g. “Let’s find your starting point” |
| Body | Short reassurance — test is short |
| CTA | `primary` — “Start the test” |

### Behavior (MVP)

- **Backend:** placement not implemented → run **client-only** mini quiz (3–5 MCQ from sample ayahs) OR skip to manual surah picker
- Store `placementCompleted: true` locally
- Post-MVP: server assigns starting `lesson_group_id`

### Placement exercises

Reuse [LESSON_UI_SCREENS.md](LESSON_UI_SCREENS.md) components (`mcq`, `listen_pick`) with `mode: 'placement'`.

---

## P03 — Streak goal (optional onboarding)

Duolingo: “Pick your streak goal!” (3 / 7 / 14 / 30 days).

| Property | Spec |
|----------|------|
| Route | `app/onboarding/streak-goal.tsx` |
| Can merge | After O02 daily minutes OR as G03 post-lesson |

| Element | UstadApp |
|---------|----------|
| List | 3 / 7 / 14 / 30 days with subtitles |
| Selected | Orange in ref → use `#E9C468` border + checkmark `#05966A` |
| Mascot tip | Speech bubble — your encouraging copy |
| Skip | Text link `#95A3B8` |
| CTA | `primary` — “I can do it!” (your wording) |

Save `streakGoalDays` locally; sync when profile API exists.

---

## Navigation position

```
… → O04 → P01 (path) → [P02 if check level] → Journey home
              ↘ start fresh → Journey
```

Or after first lesson complete → G03 streak goal.
