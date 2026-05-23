# Startup Screens — Build Spec

From provided mockups (430×932). Implement as first vertical slice.

---

## S01 — Loading screen (`loading_screen`)

**Purpose:** Brand moment while app initializes fonts, restores auth token, optional health check.

| Element | Spec |
|---------|------|
| Background | `#FFFFFF` |
| Title | “Ustad App” — Nunito 900, `primary` `#05966A`, centered vertical + horizontal |
| Status bar | Light content on white (dark icons) |
| Duration | Show 1–1.5s minimum; navigate when fonts + auth check done |
| Logic | If token valid → `(tabs)`; else → S02 |

**No API call required** on splash (optional `GET /health` in dev).

---

## S02 — Getting started (`getting_started`)

| Element | Spec |
|---------|------|
| Logo | Rounded square ~96px, `primary` fill OR `LogoMark` image when asset provided |
| Title | “Ustad App” — Nunito 900, `primary`, below logo |
| Tagline | “Master Quran memorization through interactive lessons, streaks, and smart revision” — `charcoal` or `dark`, centered, ~16–18px, max width ~320 |
| Primary CTA | “Get Started” — full width, `primary` bg, white text, radius 14, height ~52 |
| Secondary CTA | “I already have an account” — full width, `#E5E7EB` bg, `dark` text |

**Actions:**

- Get Started → `onboarding/intro` or first onboarding slide
- I already have an account → `(auth)/login`

---

## S03 — Personalization intro (`getting_started_101`)

| Element | Spec |
|---------|------|
| Speech bubble | White fill, 1px `grey` border, radius 16, padding 16–20; tail pointing down (SVG or border trick) |
| Copy | “Before the lesson, let's start with some questions to personalize your learning experience!” — centered, `charcoal`, body size |
| Illustration | Large rounded square ~140px, `primary` (mascot/illustration later) |
| CTA | “Continue” — same as primary button on S02 |

**Actions:**

- Continue → [O01 Motivation](ONBOARDING_SCREENS.md) (Duolingo-style questionnaire)

**API:** None yet; answers stored locally until profile API exists.

---

## Shared layout

```
SafeAreaView (flex 1, white)
  flex 1 center content (logo, titles)
  bottom: paddingHorizontal 24, paddingBottom safe + 16, stacked buttons gap 12
```

---

## Assets needed

| Asset | Format | Status |
|-------|--------|--------|
| App logo | SVG + PNG @1x/@2x/@3x | **Needed** |
| Mascot / illustration for S03 | PNG/SVG | **Needed** |
| App icon + splash native | Expo config | **Needed** |

See [DATA_NEEDED.md](DATA_NEEDED.md).

---

## Acceptance criteria

- [ ] Matches colors and typography tokens
- [ ] Safe area on notched devices
- [ ] Navigation wired per table above
- [ ] No layout overflow on small phones (SE) and large (Pro Max)
