# UstadApp — React Native (Mobile)

Gamified Quran memorization (Hifz) app for iOS and Android, built with **Expo** + **TypeScript**. Backend API is implemented separately (FastAPI); this repo is the mobile client.

## Team design (starting point)

Interactive Figma export: [`Review app design file/`](Review%20app%20design%20file/)  
→ [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) (screen map + tokens + build order)

```bash
cd "Review app design file" && npm i && npm run dev   # preview in browser
```

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/PLAN.md](docs/PLAN.md) | Phased action plan, milestones, priorities |
| [docs/MVP_SCOPE.md](docs/MVP_SCOPE.md) | Launch scope vs post-MVP |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Colors, typography, components |
| [docs/NAVIGATION.md](docs/NAVIGATION.md) | Routes, flows, screen map |
| [docs/SCREEN_INVENTORY.md](docs/SCREEN_INVENTORY.md) | Every screen + build status |
| [docs/STARTUP_SCREENS.md](docs/STARTUP_SCREENS.md) | Splash, Get Started, Personalization intro |
| [docs/ONBOARDING_SCREENS.md](docs/ONBOARDING_SCREENS.md) | Duolingo-style questionnaire flow |
| [docs/ONBOARDING_COPY.md](docs/ONBOARDING_COPY.md) | Your onboarding copy (fill in) |
| [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) | **Team Figma prototype → RN map** |
| [docs/REFERENCE_SCREENS.md](docs/REFERENCE_SCREENS.md) | Duolingo-style refs → UstadApp map |
| [docs/LESSON_UI_SCREENS.md](docs/LESSON_UI_SCREENS.md) | Exercise layouts + lesson chrome |
| [docs/JOURNEY_MAP_SCREENS.md](docs/JOURNEY_MAP_SCREENS.md) | Path map, tabs, surah banners |
| [docs/GAMIFICATION_SCREENS.md](docs/GAMIFICATION_SCREENS.md) | Complete, streak, quests |
| [docs/PATH_PLACEMENT_SCREENS.md](docs/PATH_PLACEMENT_SCREENS.md) | Choose path + placement |
| [docs/APP_COPY.md](docs/APP_COPY.md) | Copy for lessons, journey, rewards |
| [docs/EXERCISES.md](docs/EXERCISES.md) | Lesson exercise types (client-owned) |
| [docs/DATA_MODELS.md](docs/DATA_MODELS.md) | API shapes, local state, caching |
| [docs/DATA_NEEDED.md](docs/DATA_NEEDED.md) | Assets & inputs required from you / design |
| [docs/BACKEND_INTEGRATION.md](docs/BACKEND_INTEGRATION.md) | API usage, auth, flows |
| [docs/BACKEND_GAPS.md](docs/BACKEND_GAPS.md) | FRD vs what API provides today |
| [docs/USER_PERSONAS.md](docs/USER_PERSONAS.md) | Target users (dev reference) |
| [docs/FRD.md](docs/FRD.md) | Functional requirements (product truth) |

## Mobile app (React Native bare)

```bash
cd mobile
npm install
cd ios && pod install && cd ..
npm start
# npm run ios   # or npm run android
```

See [mobile/README.md](mobile/README.md). API host: [docs/BACKEND_INTEGRATION.md](docs/BACKEND_INTEGRATION.md).

## How we build screens

You provide Figma frames or screenshots **one screen at a time**. We implement against [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) and wire API where endpoints exist (see [docs/BACKEND_GAPS.md](docs/BACKEND_GAPS.md)).

**First batch (ready to build):** [docs/STARTUP_SCREENS.md](docs/STARTUP_SCREENS.md) — Loading, Getting Started, Personalization intro.

## Backend repo

Keep backend in its own repository. Mobile consumes `http://127.0.0.1:8000/api/v1` locally (see integration doc).
