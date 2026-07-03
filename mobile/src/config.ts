/** Live backend — all API calls use this host. Mobile release builds always
 * hit production; unlike the Expo dev app, there is no local-API toggle. */
export const PRODUCTION_API_BASE = 'https://ustad-app-backend-git-main-ustadapp.vercel.app';

export const API_BASE = PRODUCTION_API_BASE;

/** MVP: last 10 surahs 105–114 from API (`mvp_only=true`). Set true for full Juz 30. */
export const FULL_JUZ_AMMA = false;

export const API_PREFIX = '/api/v1';

