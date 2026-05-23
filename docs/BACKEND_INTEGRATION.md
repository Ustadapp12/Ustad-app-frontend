# Backend Integration — React Native

Condensed guide for the mobile team. Full OpenAPI: `http://127.0.0.1:8000/docs`.

---

## Base URLs

| Environment | `API_BASE` |
|-------------|------------|
| iOS Simulator | `http://127.0.0.1:8000` |
| Android Emulator | `http://10.0.2.2:8000` |
| Physical device | `http://<LAN_IP>:8000` |

All API routes: `${API_BASE}/api/v1/...`  
Audio: full URLs in JSON (`audio_url`) — same host as `PUBLIC_AUDIO_BASE_URL`.

---

## Auth

- Header: `Authorization: Bearer <access_token>`
- Access TTL ~15 min; refresh ~30 days
- On `401`: `POST /auth/refresh` with `refresh_token`, retry once
- Persist tokens: `expo-secure-store`

**Endpoints:** `POST /auth/register`, `/login`, `/refresh`

---

## Core flows

### 1. After login

```
GET /learning/me
```

### 2. Browse (optional without login)

```
GET /content/surahs?juz=30&mvp_only=true
GET /content/surahs/{n}
GET /content/surahs/{n}/ayahs?from=&to=
GET /content/reciters
```

### 3. Level map (auth)

```
GET /learning/surahs/{n}/levels
```

### 4. Lesson

```
GET /lessons/groups/{group_id}
POST /learning/sessions  { lesson_group_id }
POST /learning/sessions/{id}/attempts  { exercise_type, correct, mistake_count }
POST /learning/sessions/{id}/complete  { passed, score_pct, mistakes }
```

### 5. Revision (auth)

```
GET /revision/next
POST /revision/schedule  { ayah_id, due_at }
```

---

## Error handling

| Status | Action |
|--------|--------|
| 401 | Refresh or → login |
| 409 | Email taken / active session exists |
| 400 | Locked level, session ended |
| 404 | Not in MVP surahs |

---

## Audio playback

Use `expo-av` or `react-native-track-player`:

```typescript
const url = ayah.audio_assets[reciterId]?.audio_url
  ?? ayah.words[0]?.audio_url;
```

No auth on `/media/audio/...`.

---

## What mobile implements alone

- All exercise UIs and templates  
- Tajweed / mushaf presentation  
- Voice scoring UX  
- Pass/fail thresholds before `complete`  
- Onboarding answers (until profile API)  
- Search UI (filter local list until API)  
- Recommended next lesson heuristic  
- Offline file cache  

See [BACKEND_GAPS.md](BACKEND_GAPS.md).

---

## Local backend setup

```bash
cp .env.example .env
pip install -r requirements.txt
docker compose up -d
PYTHONPATH=. python scripts/seed_local.py --force-mongo --import-quran --lesson-groups
python run.py --reload
```

Health: `GET /health`

---

## Type reference

[DATA_MODELS.md](DATA_MODELS.md)
