# UstadApp

Gamified Quran memorization (Hifz) for iOS and Android. This repo contains the **React Native mobile app** (bare workflow, TypeScript) and product/design docs. The backend is a separate FastAPI service.

## Repository layout

| Path | Purpose |
|------|---------|
| [`mobile/`](mobile/) | React Native app — **start here for development** |
| [`docs/`](docs/) | Product specs, screen inventory, API integration notes |
| [`Review app design file/`](Review%20app%20design%20file/) | Figma-style web prototype (reference only) |

## Quick start (mobile)

```bash
cd mobile
npm install
npm run link:fonts
npm start
# npm run android   # or npm run ios (macOS)
```

Full setup: [mobile/README.md](mobile/README.md) · Windows: [mobile/SETUP_WINDOWS.md](mobile/SETUP_WINDOWS.md)

**API:** production host is configured in `mobile/src/config.ts` ([`https://ustad-app-backend.vercel.app`](https://ustad-app-backend.vercel.app)).

## MVP scope

- **Surahs:** 105–114 (last 10 surahs), via `mvp_only=true` on content APIs
- **Flows:** auth, onboarding, journey/levels, lessons (listen, fill-blank, reorder, MCQ, listen-repeat), hearts/XP/streak, revision (partial)
- **Tabs:** Home, Journey, Revision, Profile

See [docs/MVP_SCOPE.md](docs/MVP_SCOPE.md) and [docs/FRD.md](docs/FRD.md).

## CI/CD (production branch)

Pushing to **`production`** runs [`.github/workflows/firebase-distribution.yml`](.github/workflows/firebase-distribution.yml):

1. `npm ci` → unit tests (`npm run test:ci`)
2. Release APK build (`./gradlew assembleRelease`)
3. Upload to **Firebase App Distribution** → tester group **`testerustadteam`**

```bash
# Deploy (after committing on main or any branch)
git push origin HEAD:production
```

**GitHub Actions secrets** (repo → Settings → Secrets):

| Secret | Purpose |
|--------|---------|
| `FIREBASE_APP_ID` | Firebase Android app ID |
| `FIREBASE_CREDENTIALS` | Service account JSON (App Distribution) |
| `GOOGLE_SERVICES_JSON` | Full `google-services.json` (recommended for Analytics) |

Local release APK (same output path as CI):

```bash
cd mobile && npm run build:apk
# → android/app/build/outputs/apk/release/app-release.apk
```

## Observability

| Tool | Purpose |
|------|---------|
| [Sentry](https://sentry.io) | Crashes, errors, API breadcrumbs → **Slack** (configured in Sentry) |
| Firebase Analytics | Usage events, screen views — [mobile/docs/FIREBASE_ANALYTICS.md](mobile/docs/FIREBASE_ANALYTICS.md) |
| Firebase App Distribution | Tester APK installs |

Sentry release builds tag events as `com.ustadapp@0.0.1+<CI run>` — see [mobile/docs/SENTRY.md](mobile/docs/SENTRY.md).

## Tests

```bash
cd mobile && npm test
```

Runs Jest unit/smoke tests (MVP surah scope, ayah IDs, app mount). CI runs the same suite before every production APK build.

## Documentation index

| Document | Purpose |
|----------|---------|
| [docs/PLAN.md](docs/PLAN.md) | Phased plan and milestones |
| [docs/MVP_SCOPE.md](docs/MVP_SCOPE.md) | Launch vs post-MVP |
| [docs/BACKEND_INTEGRATION.md](docs/BACKEND_INTEGRATION.md) | Auth, API endpoints, flows |
| [docs/DATA_MODELS.md](docs/DATA_MODELS.md) | API types and IDs |
| [docs/EXERCISES.md](docs/EXERCISES.md) | Lesson exercise types |
| [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) | Design → RN screen map |
| [docs/NAVIGATION.md](docs/NAVIGATION.md) | Routes and deep links |
| [docs/SCREEN_INVENTORY.md](docs/SCREEN_INVENTORY.md) | Screen list + status |

Full index: [docs/README.md](docs/README.md).

## Design preview (optional)

```bash
cd "Review app design file" && npm i && npm run dev
```

## Branching

| Branch | Role |
|--------|------|
| `main` | Default development branch |
| `production` | Triggers test + APK build + Firebase distribution |

Work on `main` (or feature branches), merge when ready, then push to `production` for team builds.
