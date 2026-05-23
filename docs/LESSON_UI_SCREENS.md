# In-Lesson UI — Build Spec

Duolingo reference: exercise chrome, MCQ, listen, fill-blank, match pairs, word bank, feedback bar.  
Mapped to UstadApp **Hifz exercises** + API session flow.

---

## Shared lesson chrome (`LessonShell`)

Every exercise screen uses the same header/footer.

### Header

| Element | UstadApp spec |
|---------|----------------|
| Close (X) | Left — confirm exit dialog (lose session progress warning) |
| Progress | Center — `#E9C468` fill on `#E5E7EB` track; `currentStep / totalSteps` |
| Hearts | Right — red heart icon + count from `heartsAtStart - mistakes` (not ∞ in MVP) |
| Streak chip | Optional “2 in a row” — `#E9C468` text above bar (post-MVP) |

### Footer states

| State | Button |
|-------|--------|
| No selection | `CHECK` disabled — `#E5E7EB` bg, `#95A3B8` text |
| Selected, not checked | `CHECK` enabled — `#05966A` |
| Correct | Green feedback bar + `CONTINUE` |
| Wrong | Red/pink feedback bar + `TRY AGAIN` or auto-retry queue |

### Feedback bar (correct)

| Token | Value |
|-------|--------|
| Background | `#E8F5F0` (successBg) |
| Title | “Excellent!” / “Correct!” — `primary`, Nunito 800 |
| Button | `primary` fill, “Continue” |

### Feedback bar (wrong)

| Token | Value |
|-------|--------|
| Background | `#FDECEC` |
| Title | “Not quite” + show correct answer for Quran learning |
| Button | Retry or Continue to mistake review |

### API per step

```typescript
POST /learning/sessions/{id}/attempts
{ exercise_type, correct, mistake_count, detail }
```

---

## L-EX-01 — Multiple choice (image or text)

**Ref:** “Which one is …?” / “How do you say cat?”

**UstadApp uses:**

| Variant | Prompt | Options |
|---------|--------|---------|
| `mcq_word` | Which word means …? | 3–4 Arabic or English cards |
| `mcq_meaning` | Match this ayah | Meanings from `translation_en` |

| Element | Spec |
|---------|------|
| Prompt | Nunito 900, 22px, `#0F1B2A` |
| Grid | 2 cols for 4 options; cards white, radius 16 |
| Selected | `ash` bg, 2px `primary` border |
| Arabic options | Use Arabic font from design system |

**Data:** `AyahOut.words`, `translation_en`.

---

## L-EX-02 — Listen & pick (`listen_mcq`)

**Ref:** “What do you hear?” + blue speaker

| Element | UstadApp |
|---------|----------|
| Audio button | 72×72, `primary` bg, white speaker icon |
| Slow play | Smaller button — 0.75× speed (client) |
| Options | Same as L-EX-01 |
| Skip link | “Can’t listen now” → text-only fallback MCQ |

**Data:** `audio_assets[reciterId].audio_url`

---

## L-EX-03 — Fill in the blank

**Ref:** Sentence with blank + word bank pills

**UstadApp:**

| Element | Spec |
|---------|------|
| Prompt | “Complete the ayah” |
| Ayah line | Arabic with `____` for missing word — Tajweed when available |
| Word bank | Horizontal scroll chips — `ash` bg, radius 20 |
| Optional image | Surah/ayah illustration — optional |

**Data:** Pick one `words[]` position to hide.

---

## L-EX-04 — Word bank / arrange (`reorder`, `sequence`)

**Ref:** “Write this in English” / tap what you hear

**UstadApp:**

| Element | Spec |
|---------|------|
| Prompt | “Put the words in order” (Arabic ayah) |
| Answer slots | Dashed line row; filled chips `primary` outline |
| Bank | Shuffled word chips from `ayah.words` |
| Listen variant | Speaker + bank (hear ayah, build order) |

Maps to `exercise_type: 'reorder'`.

---

## L-EX-05 — Match pairs

**Ref:** Two columns tap to match

**UstadApp:**

| Left column | Right column |
|-------------|--------------|
| Arabic word | English meaning |
| Or ayah fragment | Surah name |

| State | Style |
|-------|--------|
| Selected | `primary` border |
| Matched | `successBg`, fade out or checkmark |
| Wrong pair | Brief shake + red flash |

---

## L-EX-06 — Listen & repeat (`listen_repeat`)

**Ref:** (not in all screenshots) — mic flow

| Element | Spec |
|---------|------|
| Ayah display | Large Arabic, optional transliteration |
| Play | Full ayah audio |
| Record | Mic button `primary` |
| Continue | After self-check or stub score |

Optional: `POST /progress/voice-attempt`

---

## L-INT-01 — Motivational interstitial

**Ref:** Owl + “Your hard work is paying off!”

| Element | UstadApp |
|---------|----------|
| Mascot | Your character peeking from side |
| Bubble | Encouraging copy (Islamic tone, not cheesy) |
| CTA | `primary` Continue — no scoring |

Show every N exercises (e.g. after 3rd step).

---

## Session flow (technical)

```
GET /lessons/groups/{id}     → ayahs
POST /learning/sessions      → session_id
For each step in template:
  render LessonShell + exercise component
  on check → POST .../attempts
POST .../complete              → navigate G01
```

Templates: [EXERCISES.md](EXERCISES.md).

---

## What we do NOT copy

- Duolingo owl / blue cube mascot
- Blue `#1CB0F6` / lime `#58CC02` palette
- “CAN’T LISTEN NOW” exact copy — write your own
- Infinity hearts (use real 10 hearts from API)
