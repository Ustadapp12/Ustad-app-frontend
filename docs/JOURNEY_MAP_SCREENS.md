# Journey Map (Home Path) — Build Spec

Duolingo reference: vertical winding path, chapter banners, locked/active/completed nodes, bottom tabs, header with streak/gems.

---

## J04 — Journey / level map (main learning home)

| Property | Spec |
|----------|------|
| Route | `app/(tabs)/journey.tsx` + `app/journey/surah/[surahNumber].tsx` |
| API | `GET /learning/surahs/{n}/levels`, `GET /content/surahs` |

### Top header (UstadApp)

| Element | Duolingo ref | UstadApp |
|---------|--------------|----------|
| Left | Flag | **Juz badge** “Juz 30” or surah icon |
| Center | Course name | **Surah name** — `name_en` / `name_ar` |
| Right | Gems/coins | **Gems** + **XP** from `/learning/me` (gem icon + `gem_balance`) |

Use `primary` header bar OR white header with green accents — **prefer white + green** for Calm/Islamic EdTech feel (less loud than Duolingo blue).

### Path nodes

| Status | API `status` | Visual |
|--------|--------------|--------|
| Completed | `completed` | `#E9C468` circle + checkmark (or `primary` + check) |
| Available | `available` | Larger `#05966A` circle + star; “START” bubble |
| In progress | `in_progress` | `primary` ring pulse |
| Locked | `locked` | `#E5E7EB` + lock icon |

| Element | Spec |
|---------|------|
| Path line | SVG or dashed connector `#95A3B8` between nodes |
| Node tap | `available` / `in_progress` → lesson start; `locked` → toast |
| Stars | 1–3 small stars under completed nodes from API |

### Chapter / Surah banner

Duolingo purple “Chapter 3” banner → **Surah section header**

| Element | UstadApp |
|---------|----------|
| Background | `#0F1B2A` or `#05966A` |
| Text | “Surah An-Naba” + ayah count |
| Right | Lock if surah locked (future); MVP all MVP surahs open |
| Progress | Thin bar: completed levels / total groups |

### Mascot decorations

Optional small mascot near hard levels — **your** character, sparse (peaceful, not cluttered).

### Bottom tab bar

| Tab | Icon | Screen |
|-----|------|--------|
| Home | house | Dashboard `/(tabs)/` |
| Journey | map/book | This path |
| Revision | refresh | Revision queue |
| Profile | user | Stats + settings |

Active tab: `primary` icon + label; inactive: `#95A3B8`.

---

## J05 — Home dashboard (optional separate from path)

Duolingo mixes path on home; UstadApp FRD lists **Home dashboard** separately.

| Card | Content |
|------|---------|
| Streak + hearts | From `/learning/me` |
| Continue learning | Next `available` level |
| Revision due | `GET /revision/next` |
| Daily goal ring | Minutes from onboarding |

---

## Data wiring

```typescript
// levels from API
levels.map((level) => ({
  id: level.lesson_group_id,
  status: level.status,
  stars: level.stars,
  label: `Ayah ${level.start_ayah}–${level.end_ayah}`,
}))
```

Navigate to `lesson/[groupId]` on START.

---

## Post-MVP (reference only)

| Ref | UstadApp | When |
|-----|----------|------|
| Quests tab | Daily quests | Phase 2 |
| Friends quest | Family/high-fives | Phase 2 |
| Leaderboard tab | Leaderboards | API needed |
| Dark theme path | Optional dark mode | Later |

See [GAMIFICATION_SCREENS.md](GAMIFICATION_SCREENS.md) for quests.
