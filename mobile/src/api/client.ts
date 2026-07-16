import { addBreadcrumb } from '../services/crashReporter';
import { API_BASE, API_PREFIX } from '../config';
import { getTokens, setTokens } from '../utils/storage';
import { messageForStatus } from './formatError';
import { redirectToVerifyEmail } from '../navigation/navigationRef';
import type { Tokens } from '../types/api';

export class ApiError extends Error {
  status: number;
  body: unknown;
  code: string | null;

  constructor(message: string, status: number, body: unknown, code: string | null = null) {
    super(message);
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

// New-style structured errors (`AppError` on the backend) respond
// `{ success: false, error: { code, message } }`. Older endpoints not yet
// migrated still respond `{ detail: ... }` (string, array, or `{code,message}`
// for EMAIL_NOT_VERIFIED) — both shapes need to be understood here.
function extractErrorCode(body: any): string | null {
  if (body?.error?.code) return body.error.code as string;
  if (body?.detail?.code) return body.detail.code as string;
  return null;
}

const API_TIMEOUT_MS = 30_000;

function fetchWithTimeout(url: string, opts: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

async function refreshAccess(): Promise<string> {
  const tokens = await getTokens();
  if (!tokens?.refresh_token) {
    throw new ApiError('Session expired', 401, null);
  }
  const res = await fetchWithTimeout(`${API_BASE}${API_PREFIX}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: tokens.refresh_token }),
  });
  if (!res.ok) {
    await setTokens(null);
    throw new ApiError('Session expired', 401, null);
  }
  const pair = (await res.json()) as Tokens;
  await setTokens(pair);
  return pair.access_token;
}

// Dedup concurrent refreshes — the backend rotates refresh tokens (single-use),
// so if N requests 401 at the same moment (e.g. the Map screen's parallel
// per-surah fetches after the app sat backgrounded long enough for the access
// token to expire), each independently calling refreshAccess() would race:
// the first to land wins and rotates the token, every other concurrent call
// gets rejected as using an already-revoked refresh token, and those requests
// fail outright (surfacing as "every level unavailable"). Sharing one in-flight
// promise means N concurrent 401s trigger exactly one real refresh call.
let refreshInFlight: Promise<string> | null = null;
function refreshAccessOnce(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccess().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  // Don't set Content-Type for FormData — fetch will add the correct multipart boundary
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (auth) {
    const tokens = await getTokens();
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`;
    }
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE}${API_PREFIX}${path}`, {
      ...options,
      headers,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    throw new ApiError(
      isAbort
        ? 'Request timed out — check your connection.'
        : 'Cannot reach server — check your network or local API settings.',
      0,
      null,
    );
  }

  if (res.status === 401 && auth) {
    try {
      const access = await refreshAccessOnce();
      headers.Authorization = `Bearer ${access}`;
      res = await fetchWithTimeout(`${API_BASE}${API_PREFIX}${path}`, {
        ...options,
        headers,
      });
    } catch {
      throw new ApiError('Unauthorized', 401, null);
    }
  }

  if (!res.ok) {
    const body: any = await res.json().catch(() => ({ detail: res.statusText }));
    // Safety net: authStore's login/register/hydrate already avoid calling
    // gated endpoints for an unverified user, so this should rarely fire —
    // but if a session goes stale mid-use elsewhere, redirect rather than
    // just surfacing a generic error.
    if (res.status === 403 && auth && body?.detail?.code === 'EMAIL_NOT_VERIFIED') {
      redirectToVerifyEmail();
    }
    const message = messageForStatus(res.status, body);
    addBreadcrumb(`${options.method ?? 'GET'} ${path} → ${res.status}`, { status: res.status, path });
    throw new ApiError(message, res.status, body, extractErrorCode(body));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json();
  // New-style success envelope on migrated endpoints (currently the 5 auth
  // endpoints): { success: true, message, data: {...} }. Detected by shape
  // rather than by path, so endpoints that haven't migrated yet keep
  // returning their raw body untouched.
  if (body && typeof body === 'object' && (body as any).success === true && 'data' in (body as any)) {
    return (body as any).data as T;
  }
  return body as T;
}

export async function healthCheck(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

