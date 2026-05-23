# UstadApp — Functional Requirements Document

Product source of truth for mobile + backend. Implementation status: backend [BACKEND_GAPS.md](BACKEND_GAPS.md); mobile [MVP_SCOPE.md](MVP_SCOPE.md).

---

## 1. Project overview

UstadApp is a gamified Quran memorization (Hifz) app. Users memorize Surahs through structured progression, interactive exercises, revision, and performance tracking.

---

## 2. Core learning structure

| Concept | Maps to |
|---------|---------|
| Journey / World | Juz |
| Chapter | Surah |
| Level | Ayah group (e.g. 1–5) |
| Session | Lesson flow |
| Exercise | Individual activity |

**Example:** Juz Amma → Surah → Ayah 1–2 → Practice session.

---

## 3. User accounts & profiles

- Email login (Google, Apple optional — future)
- Guest mode (future)
- Profile, avatar (future)
- Streak, XP, gems
- Progress dashboard
- Learner modes: child / adult / beginner

---

## 4. Learning experience

- Browse by Juz; all Surahs (MVP subset)
- Search by name
- Progress bars (surah/juz)
- Recommended next lesson
- Sequential unlock; placement test (future); star gates

---

## 5. Lesson session flow

**Exercise types:** Tajweed text, listen, voice repeat, fill blank, reorder, match meaning, difficult letters/words, continue next ayah, MCQ, flashcards, symbol blanks, sequence.

**Completion:** 10 hearts, retry mistakes, summary, XP, gems, subscription discounts (future).

---

## 6. Hifz / memorization

Audio loop, speed, word/verse highlight, hide text, mushaf view, Tajweed, certificates (future).

---

## 7. Revision

SRS, daily queue, weak ayahs, weekly challenges, forgotten ayah reminders.

---

## 8. Gamification

XP, streaks, social encouragement, badges, leaderboards, gems, milestones, certificates.

---

## 9. Progress tracking

Levels completed, memorized surahs, accuracy, time spent, revision score, last active.

---

## 10–12. Phase 2+

Teacher/parent mode, notifications, admin panel.

---

## 13. Content

Accurate Arabic, multi-reciter, transliteration, EN/Urdu translations, metadata.

---

## 14. Non-functional

Responsive UI, fast loads, offline cache (future), secure auth, sync, accessibility, scalable backend.

---

## 15. MVP launch

Login, Juz Amma, 5–10 surahs, basic exercises, XP + streaks, progress save, audio, revision queue.

---

## 16. Success metrics

DAU, lessons/day, 7-day retention, streak rate, surah completion, conversion.

---

*Detailed API mapping: [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md). Screen list: [SCREEN_INVENTORY.md](SCREEN_INVENTORY.md).*
