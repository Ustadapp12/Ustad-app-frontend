/** Live backend — all API calls use this host. Mobile release builds always
 * hit production; unlike the Expo dev app, there is no local-API toggle. */
// export const PRODUCTION_API_BASE = 'https://ustad-app-backend-six.vercel.app';
// // for testing:
export const PRODUCTION_API_BASE = 'https://ustad-app-backend-testing.vercel.app';

export const API_BASE = PRODUCTION_API_BASE;

/** MVP: 21 surahs 93–114 (excluding 96) from API (`mvp_only=true`). Set true for full Juz 30. */
export const FULL_JUZ_AMMA = false;

export const API_PREFIX = '/api/v1';


