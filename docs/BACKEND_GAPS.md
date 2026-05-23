# Backend Gaps — Frontend Impact

What the FRD asks for vs what the API provides today. Use this to decide **integrate** vs **mock** vs **defer**.

---

## Ready to integrate

- Email auth + JWT refresh  
- Quran catalogue (juz, surahs, ayahs, words, audio URLs)  
- Lesson groups + full group payload  
- Sequential level unlock + stars/score on levels  
- Lesson sessions, attempts, completion rewards  
- Hearts, XP, streak, gems on first completion  
- Revision next + schedule  
- MVP surah gating (78–86)  

---

## Mock on client (MVP)

| Feature | Approach |
|---------|----------|
| Learner mode (child/adult/beginner) | `AsyncStorage` until profile PATCH API |
| Onboarding personalization answers | Local store |
| Surah search | Filter `SurahBrief[]` by name |
| Recommended next lesson | Pick first `available` level across MVP surahs |
| Juz/surah progress % | Count `completed` / total groups client-side |
| Exercise sequence | Local JSON templates per `lesson_group_id` |
| Voice exercise score | Stub or `POST /progress/voice-attempt` |
| Tajweed colors | Plain text until markup in Mongo |
| Daily stats / time spent | Local analytics; optional events later |

---

## Blocked without backend work

| Feature | Needed API / infra |
|---------|-------------------|
| Google / Apple / guest login | OAuth + guest endpoints |
| Leaderboards, badges, friends | Social service |
| Push notifications | FCM/APNs + notification service |
| Teacher/parent mode | New role APIs |
| Admin content CRUD | Admin routes beyond `/admin/ping` |
| Placement test | Assessment endpoints |
| Gem → subscription discount | Billing integration |
| Weak ayah analytics | Mistake aggregation API |
| `GET /learning/stats` | Aggregate endpoint |
| Server-side exercise validation | Exercise engine |
| WebSocket STT | `/ws/lesson` implementation |
| Tajweed markup in content | Schema + import pipeline |

---

## Suggested backend tickets (priority)

1. `GET /content/surahs/search?q=`  
2. `GET /learning/recommended-next`  
3. `PATCH /users/me/profile` (display_name, learner_mode, avatar)  
4. `GET /learning/stats` (accuracy, time, completed count)  
5. OAuth providers  

Mobile can ship MVP without 1–5 using client heuristics above.
