# MVP Scope — Mobile App

Aligned with FRD §15 and current backend capabilities.

---

## In scope (launch)

| Area | Feature | Backend |
|------|---------|---------|
| Auth | Email register / login / refresh | Yes |
| Content | Juz 30, MVP surahs 78–86 | Yes |
| Browse | Surah list, detail, ayah text + audio | Yes |
| Progression | Level map, lock/unlock, stars | Yes |
| Lessons | Session start, attempts, complete | Yes |
| Gamification | Hearts, XP, streak, gems (first complete) | Yes |
| Exercises | 5 core types (see EXERCISES.md) | Client |
| Audio | Play ayah/word MP3 | Yes (URLs) |
| Revision | Next due + schedule | Partial |
| UI | Startup + onboarding + main tabs | Client |
| Profile | Basic stats from `/learning/me` + levels | Derived |

---

## Out of scope (v1 — track for later)

| Feature | Reason |
|---------|--------|
| Google / Apple / guest auth | No API |
| Teacher / parent mode | Phase 2 |
| Leaderboards, badges, social high-fives | No API |
| Push notifications | No API |
| Tajweed colored text | No markup in content |
| Mushaf page layout | Client feature, post-MVP |
| Placement test | Not built |
| Surah search API | Client filter or future endpoint |
| Subscription / gem discounts | Tables exist, no purchase API |
| Admin CMS | Ping only |
| Offline sync protocol | Client cache only |
| Web landing page | Separate repo |
| Certificates | Future |
| Urdu UI (optional EN-only MVP) | Content fields may exist |

---

## MVP success (mobile)

- [ ] New user can register and complete one lesson group
- [ ] Hearts and XP update on server after session
- [ ] Next level unlocks after completion
- [ ] Revision shows at least one scheduled ayah after first complete
- [ ] Audio plays on iOS simulator and Android emulator
- [ ] App usable on one physical device against LAN API

---

## Definition of “basic exercises”

Minimum set for MVP sign-off:

1. Listen  
2. Fill blank  
3. Reorder  
4. Match meaning  
5. Listen & repeat (simplified scoring)

Add remaining FRD exercise types in v1.1+.
