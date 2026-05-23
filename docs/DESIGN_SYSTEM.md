# UstadApp — Design System (Mobile)

Source: UI/UX brief + brand guidelines. Implement as React Native theme tokens; do not hardcode colors in screens.

---

## Brand personality

Trustworthy · Peaceful · Motivating · Gamified · Premium but simple · Modern Islamic EdTech

**Inspiration:** Duolingo (progression), Calm/Headspace (calm UI), modern SaaS clarity.

---

## Color palette

| Token | Hex | Usage |
|-------|-----|--------|
| `primary` | `#05966A` | Primary buttons, logo text, key CTAs |
| `primaryBright` | `#37874A` | Optional accents, success states |
| `yellow` | `#E9C468` | Rewards, streaks, highlights |
| `dark` | `#0F1B2A` | Headings, primary text (alias `#0D1B2A`) |
| `charcoal` | `#5A5D68` | Secondary body text |
| `grey` | `#95A3B8` | Placeholders, borders, disabled |
| `ash` | `#F5F7FA` | Screen backgrounds (alt to pure white) |
| `white` | `#FFFFFF` | Default screen background |
| `buttonSecondaryBg` | `#E5E7EB` | Secondary button fill (Getting Started) |
| `error` | `#E85D5D` | Wrong answers, hearts |
| `success` | `#05966A` | Correct answer text |
| `successBg` | `#E8F5F0` | Correct feedback bar |
| `errorBg` | `#FDECEC` | Wrong feedback bar |
| `heart` | `#E85D5D` | Lives remaining in lesson header |
| `progressTrack` | `#E5E7EB` | Lesson/onboarding progress track |
| `progressFill` | `#E9C468` | Progress bar fill |
| `chapterBanner` | `#0F1B2A` | Surah section banner on journey path |
| `audioButton` | `#05966A` | Square play button in listen exercises |
| `cardSelectedBorder` | `#05966A` | MCQ / option selected state |

```typescript
// theme/colors.ts (reference)
export const colors = {
  primary: '#05966A',
  primaryBright: '#37874A',
  yellow: '#E9C468',
  dark: '#0F1B2A',
  charcoal: '#5A5D68',
  grey: '#95A3B8',
  ash: '#F5F7FA',
  white: '#FFFFFF',
  buttonSecondaryBg: '#E5E7EB',
  successBg: '#E8F5F0',
  errorBg: '#FDECEC',
  heart: '#E85D5D',
  progressTrack: '#E5E7EB',
  progressFill: '#E9C468',
  chapterBanner: '#0F1B2A',
} as const;
```

---

## Typography

| Role | Font | Weight | Notes |
|------|------|--------|--------|
| Headings | **Nunito** | 900 | Do not match logo size with headline |
| Body | **Nunito** | 400–600 | Accessible line height ≥ 1.4 |
| Arabic (Quran) | **Kidzhood Arabic** or **Mahameru Arabic** | — | License for production; demo fonts OK for dev |
| UI icons | Feather (or Expo vector icons) | — | Do not mix Feather Bold with DIN in same sentence per brand rules |

**Do not:**

- Use Feather Bold in multiple secondary colors or neutral “eel” gray for emphasis.
- Set Feather Bold in sentence/title case (brand uses specific casing rules).
- Combine DIN Next Rounded + Feather Bold in one line.

Load Nunito via `@expo-google-fonts/nunito`.

---

## Spacing & layout

| Token | Value | Notes |
|-------|-------|--------|
| `screenPaddingHorizontal` | 24 | Startup / forms |
| `screenPaddingVertical` | 16 | Safe area extra |
| `sectionGap` | 24–32 | Between logo, title, buttons |
| `buttonHeight` | 52–56 | Full-width CTAs |
| `buttonRadius` | 12–16 | Rounded rectangles |
| `logoPlaceholderSize` | 80–120 | Square, `borderRadius: 16` |
| `speechBubbleRadius` | 16 | Personalization intro |

**Frame reference:** 430 × 932 (iPhone 14 Pro logical) — use flex + safe areas, not fixed pixel heights everywhere.

---

## Components (build once, reuse)

| Component | Variants |
|-----------|----------|
| `Screen` | default bg white, optional `ash` |
| `AppText` | heading / body / caption / arabic |
| `PrimaryButton` | green fill, white label |
| `SecondaryButton` | grey fill, dark label |
| `SpeechBubble` | bordered white, tail optional |
| `LogoMark` | image or placeholder |
| `ProgressBar` | surah / juz / lesson step progress |
| `HeartBar` | 10 hearts (lesson header) |
| `StreakBadge` | flame + count |
| `XPGemRow` | header stats |
| `LessonShell` | X + progress + hearts wrapper |
| `OptionCard` | MCQ grid card |
| `WordChip` | fill-blank / reorder bank |
| `FeedbackBar` | correct / wrong footer |
| `PathNode` | journey map circle |
| `SurahBanner` | chapter divider on path |
| `StatCard` | lesson complete XP / accuracy |

---

## Motion

- Splash: optional fade-in logo (300ms).
- Screen transitions: Expo Router default or subtle slide.
- Lesson correct/wrong: short scale or color flash (Duolingo-like, restrained).

---

## Accessibility

- Minimum touch target 44×44.
- Support Dynamic Type (scale Nunito with `maxFontSizeMultiplier`).
- Sufficient contrast: dark text on white; white text on `#05966A`.
- Reduce motion respect `AccessibilityInfo`.

---

## Dark mode

Optional post-MVP; tokens should be structured for future `dark` theme object.
