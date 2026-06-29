# Exercise API Contract — Complete Reference

## Phase values (metadata only — any exercise type can carry any phase)

| Phase | Meaning |
|-------|---------|
| `view` | Opening display card, ungraded |
| `main` | Normal lesson queue |
| `remediation` | Drill going down (wrong answer triggered) |
| `remediation_up` | Drill going back up |
| `review` | End-of-session review |
| `mistakes_review` | Replay of exercises answered wrong |

## Base fields on every exercise

```json
{
  "ex_id": "a3f9c12b44",
  "type": "...",
  "phase": "main",
  "surah_no": 108,
  "ayah_no": 1,
  "seg_no": 1,
  "ayah_audio_url": "https://...husary.mp3"
}
```

`ayah_audio_url` is the full Husary recitation for that ayah. Empty string if unavailable.

---

## 1. `ayah_display`

Ungraded. User taps Continue.

```json
{
  "type": "ayah_display",
  "instruction": "Listen and read carefully",
  "ayah_ar": "إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ ۝",
  "ayah_translation": "Indeed, We have granted you Al-Kawthar.",
  "ayah_audio_url": "https://...husary.mp3",
  "tokens": null,
  "options": null,
  "tiles": null,
  "context_before": null,
  "context_after": null,
  "answer_len": null
}
```

- `ayah_ar` — full ayah text, always ends with ۝
- Submit: `user_answer: null`

---

## 2. `fill_blank`

One word blanked. User picks from 4 options.

```json
{
  "type": "fill_blank",
  "instruction": "Tap the missing word",
  "tokens": [
    {"ar": "إِنَّا",        "blank": false},
    {"ar": "؟",            "blank": true},
    {"ar": "الْكَوْثَرَ",  "blank": false}
  ],
  "options": [
    {"ar": "أَعْطَيْنَاكَ", "audio_url": "https://..."},
    {"ar": "فَصَلِّ",       "audio_url": "https://..."},
    {"ar": "وَانْحَرْ",     "audio_url": "https://..."},
    {"ar": "رَبِّكَ",       "audio_url": "https://..."}
  ],
  "segment_audio_urls": ["https://...001.mp3", "https://...002.mp3"],
  "context_before": ["بِسْمِ"],
  "context_after": ["فَصَلِّ"],
  "tiles": null,
  "answer_len": null
}
```

- `tokens` — segment words. Blanked word has `blank: true` and `ar: "؟"`.
- `options` — 4 shuffled choices. Show `ar` text + play button per option.
- `segment_audio_urls` — word clips in order. Only present when segment has ≤3 words. Auto-play at start.
- `context_before` / `context_after` — list[str] or null. Words from the same ayah outside this segment. Show as greyed non-interactive text.
- Submit: `user_answer: "أَعْطَيْنَاكَ"` (string)

---

## 3. `audio_fill`

Identical layout to `fill_blank` but **options show audio only — no text**.

```json
{
  "type": "audio_fill",
  "instruction": "Hear and fill the blank",
  "tokens": [
    {"ar": "إِنَّا", "blank": false},
    {"ar": "؟",     "blank": true}
  ],
  "options": [
    {"ar": "أَعْطَيْنَاكَ", "audio_url": "https://..."},
    {"ar": "فَصَلِّ",       "audio_url": "https://..."},
    {"ar": "وَانْحَرْ",     "audio_url": "https://..."},
    {"ar": "رَبِّكَ",       "audio_url": "https://..."}
  ],
  "segment_audio_urls": ["https://...001.mp3", "https://...002.mp3"],
  "context_before": null,
  "context_after": null,
  "tiles": null,
  "answer_len": null
}
```

- `tokens` — same as `fill_blank`, render identically.
- `options` — `ar` is present but **must NOT be shown**. Show only a play button per option. User hears then selects.
- `segment_audio_urls` — same rule as `fill_blank`.
- Submit: `user_answer: "أَعْطَيْنَاكَ"` (string — same as fill_blank)

---

## 4. `reorder`

All segment words shuffled. User places them in order.

```json
{
  "type": "reorder",
  "instruction": "Put the words in the right order",
  "tiles": [
    {"ar": "الْكَوْثَرَ",   "audio_url": "https://...003.mp3"},
    {"ar": "أَعْطَيْنَاكَ", "audio_url": "https://...002.mp3"},
    {"ar": "إِنَّا",        "audio_url": "https://...001.mp3"}
  ],
  "answer_len": 3,
  "context_before": [],
  "context_after": ["فَصَلِّ"],
  "tokens": null,
  "options": null
}
```

- `tiles` — shuffled word objects. Show `ar` text, play `audio_url` on tap.
- `answer_len` — total tiles (use for slot rendering).
- `context_before` / `context_after` — same as `fill_blank`.
- Submit: `user_answer: ["إِنَّا", "أَعْطَيْنَاكَ", "الْكَوْثَرَ"]` (array of ar strings)

---

## 5. `next_word`

Shows first k words of segment, user picks what comes next.

```json
{
  "type": "next_word",
  "instruction": "Which word comes next?",
  "tokens": [
    {"ar": "إِنَّا", "blank": false},
    {"ar": "؟",     "blank": true}
  ],
  "options": [
    {"ar": "أَعْطَيْنَاكَ", "audio_url": "https://..."},
    {"ar": "فَصَلِّ",       "audio_url": "https://..."},
    {"ar": "وَانْحَرْ",     "audio_url": "https://..."},
    {"ar": "رَبِّكَ",       "audio_url": "https://..."}
  ],
  "segment_audio_urls": ["https://...001.mp3", "https://...002.mp3"],
  "tiles": null,
  "context_before": null,
  "context_after": null,
  "answer_len": null
}
```

- `tokens` — words shown so far, last token always `{"ar": "؟", "blank": true}`.
- `options` — 4 shuffled choices. Show `ar` text + play button.
- `segment_audio_urls` — same ≤3 word rule.
- Submit: `user_answer: "أَعْطَيْنَاكَ"` (string)

---

## 6. `hear_and_select`

Audio plays automatically. User picks which Arabic text matches.

```json
{
  "type": "hear_and_select",
  "instruction": "Hear and select",
  "segment_audio_urls": ["https://...001.mp3", "https://...002.mp3"],
  "options": [
    {"ar": "إِنَّا أَعْطَيْنَاكَ", "audio_url": "https://...001.mp3"},
    {"ar": "فَصَلِّ لِرَبِّكَ",    "audio_url": "https://...002.mp3"},
    {"ar": "وَانْحَرْ إِنَّ",      "audio_url": "https://...003.mp3"},
    {"ar": "شَانِئَكَ هُوَ",       "audio_url": "https://...004.mp3"}
  ],
  "tokens": null,
  "tiles": null,
  "context_before": null,
  "context_after": null,
  "answer_len": null
}
```

- `segment_audio_urls` — the correct segment's audio. Always present. Auto-play at start.
- `options` — 4 choices. Show `ar` text + hold-to-hear button per option.
- Submit: `user_answer: "إِنَّا أَعْطَيْنَاكَ"` (string)

---

## 7. `sequence`

All ayahs from the lesson as shuffled tiles. User orders them.

```json
{
  "type": "sequence",
  "instruction": "Put the ayahs in the right order",
  "tiles": [
    "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ ۝",
    "إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ ۝"
  ],
  "answer_len": 2,
  "tokens": null,
  "options": null,
  "context_before": null,
  "context_after": null
}
```

- `tiles` — plain strings (not objects), shuffled. Each ends with ۝.
- Submit: `user_answer: ["إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ ۝", "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ ۝"]` — array of strings, ۝ must be included, backend matches exactly.

---

## 8. `ayat_then_order`

First ayah shown as header. User orders all words of the second ayah.

```json
{
  "type": "ayat_then_order",
  "instruction": "What comes next?",
  "first_ayah_text": "إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ ۝",
  "first_ayah_audio_url": "https://...husary/ayah1.mp3",
  "tiles": [
    {"ar": "لِرَبِّكَ", "audio_url": "https://...002.mp3"},
    {"ar": "فَصَلِّ",   "audio_url": "https://...001.mp3"},
    {"ar": "وَانْحَرْ", "audio_url": "https://...003.mp3"}
  ],
  "answer_len": 3,
  "tokens": null,
  "options": null,
  "context_before": null,
  "context_after": null
}
```

- `first_ayah_text` — full first ayah, ends with ۝. Show as read-only header with play button for `first_ayah_audio_url`.
- `first_ayah_audio_url` — Husary recitation of first ayah.
- `tiles` — ALL words of the second ayah, shuffled. Each has `ar` + `audio_url`. Same reorder UI as `reorder`.
- Submit: `user_answer: ["فَصَلِّ", "لِرَبِّكَ", "وَانْحَرْ"]` — array of `ar` strings. **No ۝** (tiles are individual words).

---

## XP Rules (frontend)

```
if xp_awarded >= 10 and done  →  show session-complete animation with total xp_awarded
else if xp_awarded > 0        →  show small +N XP pop-up (confetti)
```

- Login: +10 XP
- Correct answer: +2 XP
- Review / remediation_up correct: +10 XP
- Edge case: 1-ayah group, last main exercise correct with no mistakes — `done: true` fires with `xp_awarded: 12` (both +2 and +10 combined). Frontend rule above handles this: `xp_awarded >= 10 && done` → session-complete.

## Unhandled exercise types

Any type not in the handled list is **silently skipped** (`user_answer: null`). User never sees it.
