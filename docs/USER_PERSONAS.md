# User Personas (Dev Reference)

Use for UX decisions: lesson length, copy tone, defaults, and feature priority.

---

## 1. Kid Learner — Ayaan (6)

- **Needs:** Gamified UI, short lessons, stars/sounds, parent visibility (Phase 2).
- **Build:** Large touch targets, child learner mode, celebratory animations, shorter exercise chains (3–4 steps).

---

## 2. Busy Professional — Sana (23)

- **Needs:** 5-minute lessons, reminders, streak, commute-friendly audio.
- **Build:** “Continue last lesson” on home, estimated minutes on levels, background audio.

---

## 3. Hafiz Revision — Usman (28)

- **Needs:** SRS queue, weak areas, recitation check, analytics.
- **Build:** Revision tab first-class; voice exercises; accuracy over gamification fluff.

---

## 4. Revert — Sarah (31)

- **Needs:** Beginner path, audio guidance, translations, gentle onboarding.
- **Build:** Transliteration toggle, English meaning exercises, optional placement skip later.

---

## 5. Corporate Professional — Omar (40)

- **Needs:** Calm premium UI, reminders, milestones, flexible schedule.
- **Build:** Clean dashboard, streak emphasis, no childish copy in adult mode.

---

## 6. Homemaker / Mother — Fatima (35)

- **Needs:** Pause/resume, micro-sessions, family progress (Phase 2).
- **Build:** Session resume, exit without losing progress, short daily goal setting in onboarding.

---

## Mode mapping (app setting)

| `learner_mode` | UI adjustments |
|----------------|----------------|
| `child` | More rewards, simpler copy, mascot |
| `adult` | Default balanced |
| `beginner` | Extra hints, transliteration on, slower pace suggestion |

Stored locally until profile API exists.
