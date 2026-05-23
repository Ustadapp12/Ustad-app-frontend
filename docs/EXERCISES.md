# Lesson Exercise Types (Client)

The backend **logs** `exercise_type` and does not validate answers. The mobile app owns UI, scoring, and pass/fail before `POST .../complete`.

---

## MVP priority (build first)

| Type key | Name | Input | MVP |
|----------|------|-------|-----|
| `listen` | Listen to recitation | Play audio, tap Continue | Yes |
| `fill_blank` | Missing word | Tap word from bank | Yes |
| `reorder` | Arrange ayah order | Drag chips | Yes |
| `match_meaning` | Arabic → meaning | Multiple choice | Yes |
| `listen_repeat` | Repeat pronunciation | Mic + client score | Yes (basic) |

---

## Phase 2 exercises

| Type key | Name | Notes |
|----------|------|--------|
| `voice_letters` | Difficult letters | STT / on-device |
| `voice_combo` | Combined letters | Listen + repeat |
| `continue_ayah` | Next ayah from memory | Show ayah N, recite N+1 |
| `mcq_meaning` | Meaning test | 4 options |
| `flashcard` | Quick review | Flip card |
| `symbol_blank` | Symbol meanings | Needs content |
| `sequence` | Ayah word sequence | Order words in one ayah |

---

## Shared requirements

- **Tajweed colors:** Render when markup exists; until then plain `arabic` from API.
- **Audio:** `ayah.audio_assets[reciterId].audio_url` or per-word `audio_url`.
- **Hearts:** Increment client `mistakes` on wrong; show remaining = `heartsAtStart - mistakes`.
- **Retry queue:** Collect wrong items; replay at end of session (client-only).
- **Attempt logging:** After each exercise:

```json
{
  "exercise_type": "fill_blank",
  "correct": false,
  "mistake_count": 1,
  "detail": { "ayah_id": "078_001", "word_position": 3 }
}
```

---

## Session scoring (client proposal)

| Rule | Value |
|------|--------|
| Pass threshold | `score_pct >= 70` (confirm with product) |
| Score formula | `(correctExercises / totalExercises) * 100` minus optional penalty |
| `mistakes` sent to API | Total wrong steps (drives hearts on server) |
| `passed` | User finished + score ≥ threshold + optional min hearts |

Server on complete:

- Hearts: `hearts_at_start - mistakes` (min 0)
- Stars: 3 if ≥92, 2 if ≥75, else 1
- XP/gems/streak: first completion only

---

## Exercise runner architecture

```
LessonGroupDetail
  → build ExerciseStep[] from template (config per group or surah)
  → for each step: render component by type
  → on finish: POST complete + navigate to summary
```

**Template example** (local JSON until CMS):

```json
{
  "group_id": "078_group_1",
  "steps": [
    { "type": "listen", "ayah_ids": ["078_001", "078_002"] },
    { "type": "fill_blank", "ayah_id": "078_001" },
    { "type": "reorder", "ayah_ids": ["078_001", "078_002"] },
    { "type": "match_meaning", "ayah_id": "078_001" },
    { "type": "listen_repeat", "ayah_id": "078_002" }
  ]
}
```

Store templates in `assets/lesson-templates/` or fetch from backend when available.

---

## Voice / STT

- **Now:** Stub score (user self-rates) or simple duration check; `POST /progress/voice-attempt` optional.
- **Later:** WebSocket `/ws/lesson` when backend STT exists.

---

## Component map

| Type | Component |
|------|-----------|
| `listen` | `ExerciseListen` |
| `fill_blank` | `ExerciseFillBlank` |
| `reorder` | `ExerciseReorder` |
| `match_meaning` | `ExerciseMatchMeaning` |
| `listen_repeat` | `ExerciseVoiceRepeat` |

Register in `exercises/registry.ts` for extensibility.
