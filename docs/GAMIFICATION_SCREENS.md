# Gamification & Rewards UI — Build Spec

Duolingo reference: lesson complete, streak, streak goal, quests.  
UstadApp theme + `POST .../complete` + `GET /learning/me`.

---

## G01 — Lesson complete

| Property | Spec |
|----------|------|
| Route | `app/lesson/[groupId]/complete.tsx` |
| Trigger | After `POST /learning/sessions/{id}/complete` |

### Layout

| Element | Duolingo ref | UstadApp |
|---------|--------------|----------|
| Title | Yellow “Lesson Complete!” | `#E9C468` or `primary` — **your** copy e.g. “Level complete!” |
| Illustration | Characters + confetti | Subtle confetti + mascot (respectful tone) |
| Stat card 1 | TOTAL XP | `#E9C468` header — show `xp_awarded` from API |
| Stat card 2 | AMAZING 100% | `#05966A` header — show `score_pct` + stars `stars` |
| CTA | Green CONTINUE | `primary` → back to journey or G02 streak |

### Extra (UstadApp)

| Card | Source |
|------|--------|
| Gems earned | +5 on first complete — show if `completion_saved` |
| Hearts left | `hearts_remaining` |

---

## G02 — Streak celebration

| Property | Spec |
|----------|------|
| Route | Modal `app/modals/streak.tsx` |
| When | `current_streak` increased after complete |

| Element | UstadApp |
|---------|----------|
| Big number | `current_streak` — `#E9C468` |
| Label | “day streak!” — Nunito 900 |
| Week calendar | M T W T F S S — checkmarks `#05966A`, today `#E9C468` ring |
| Warning | Your copy about practicing tomorrow |
| CTA | `primary` Continue |

---

## G03 — Pick streak goal

See also [PATH_PLACEMENT_SCREENS.md](PATH_PLACEMENT_SCREENS.md) P03.

| Element | UstadApp |
|---------|----------|
| Options | 3 / 7 / 14 / 30 days |
| Selected | `#E9C468` border |
| Tip bubble | 5× more likely… — **rewrite** for Quran habit |
| Skip + CTA | Skip grey; CTA `primary` |

---

## G04 — Quests (post-MVP)

Duolingo: Monthly quest, Friends quest, Daily XP.

| Quest type | UstadApp future |
|------------|-----------------|
| Monthly | “Ramadan quest” / memorization challenge |
| Friends | High-five friend (FRD) |
| Daily | Earn X XP — tie to `/learning/me` |

**MVP:** Skip tab or show static “Coming soon”.

Use `ash` cards + `primary` progress bars — **no hot pink** from reference.

---

## Modals summary

| Modal | Priority |
|-------|----------|
| XP gained | MVP |
| Streak | MVP |
| Hearts empty | MVP — offer wait or review |
| Achievement badge | Post-MVP |
| Gem reward | MVP on first complete |

---

## API mapping

| UI | API field |
|----|-----------|
| XP card | `xp_awarded` |
| Accuracy | `score_pct` |
| Stars | `stars` |
| Streak screen | refresh `current_streak` |
| Gems | `gem_balance` delta +5 |
