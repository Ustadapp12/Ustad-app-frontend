# Data & Assets Needed From You

Checklist so development is not blocked. Mark items as you provide them.

---

## Design handoff

| Item | Format | Used for | Status |
|------|--------|----------|--------|
| Figma file access (dev mode) | Link | Spacing, components | Pending |
| App logo | SVG + PNG 1024 | Splash, welcome, icon | **Required** |
| Mascot / teacher character | PNG/SVG | Onboarding, personalization | Optional for MVP |
| Onboarding copy (all strings) | Fill [ONBOARDING_COPY.md](ONBOARDING_COPY.md) | Phase 1 | **Required** |
| Onboarding mascot / bell art | PNG/SVG | Notifications screen | Optional |
| Sign up / Login / Forgot password | Screenshots | Phase 1 | Pending |
| Home dashboard | Screenshot | Phase 2 | Pending |
| Journey / level map | Screenshot | Phase 2 | Pending |
| Each exercise type | Screenshot | Phase 3 | Pending |
| Completion / reward modals | Screenshot | Phase 3 | Pending |
| Icon set | Feather or custom | UI | Confirm in Figma |

---

## Copy & content

| Item | Notes | Status |
|------|-------|--------|
| Final app name spelling | “Ustad App” vs “UstadhApp” — align marketing | Confirm |
| Onboarding question copy | Personalization quiz | Pending |
| Error messages (UX) | Friendly strings for 401, 409, locked level | We can draft |
| Placement test questions | Post-MVP | N/A |

---

## Fonts & legal

| Font | License for production | Status |
|------|------------------------|--------|
| Nunito | Google Fonts — OK | OK |
| Kidzhood Arabic | 1001fonts demo — need commercial license | Decide |
| Mahameru Arabic | Same | Decide |
| Tajweed color rules | Scholar-approved markup spec | Backend gap |

---

## Backend / environment

| Item | Example | Status |
|------|---------|--------|
| Backend repo path or URL | Local / staging API | You have FastAPI |
| Staging `API_BASE` | `https://api...` | When deployed |
| `PUBLIC_AUDIO_BASE_URL` for device testing | LAN IP | Per machine |
| MVP surah list confirmation | 78–86 | Default in backend |
| Test accounts | learner@ / password | Create via register |
| Full Quran audio on disk | HF tarball extracted | For real listen exercises |

---

## Product decisions (answer when you can)

1. **Guest mode** for MVP? (Backend not built — would be local-only progress.)
2. **Default reciter** — Husary only for MVP?
3. **Pass threshold** for lessons — 70%? 80%?
4. **Minimum score to “pass”** session when hearts hit 0?
5. **Urdu translation** in MVP or English only?
6. **OAuth** in v1.1 — which provider first?

---

## Per-screen workflow

When you send a screenshot:

1. Name the screen (e.g. “Login”).
2. Note any animation or edge case.
3. We update [SCREEN_INVENTORY.md](SCREEN_INVENTORY.md) and implement.

**Current queue:** Startup ✅ spec’d → **Onboarding slides** → **Auth screens**.
