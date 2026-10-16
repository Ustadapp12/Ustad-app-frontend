import { addBreadcrumb, captureError } from '../services/crashReporter';
import { API_BASE, API_PREFIX } from '../config';
import { getTokens, getTokensStrict, setTokens, TokenStoreUnavailableError } from '../utils/storage';
import { messageForStatus } from './formatError';
import { redirectToVerifyEmail } from '../navigation/navigationRef';
import { connectivity } from '../store/connectivityStore';
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

/**
 * The only way this module reports "no HTTP response arrived at all" — DNS
 * failure, TLS failure, connection refused, or our own timeout. Status 0 is
 * reserved for exactly that, and is distinct from a real server response
 * carrying a real status.
 *
 * Centralised so the connectivityStore write can never drift out of sync with
 * the throw: a future status-0 site that forgets to flag reachability is not
 * possible if every one of them goes through here.
 *
 * Note this says nothing about whether the DEVICE has a network — that is
 * services/connectivity.ts's job, answered by the OS. This is only ever "our
 * backend did not answer", which is a different sentence to show the user.
 */
function throwUnreachable(isAbort: boolean): never {
  connectivity.setServerUnreachable(true);
  throw new ApiError(
    isAbort
      ? 'Request timed out: check your connection.'
      : 'Cannot reach server: check your internet connection.',
    0,
    null,
  );
}

/**
 * An HTTP response arrived, so the backend is reachable by definition —
 * whatever status it carries. A 500 is a server problem, not a connectivity
 * one, and must clear the flag rather than raise a connectivity banner.
 */
function markReachable(): void {
  connectivity.setServerUnreachable(false);
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

// Set only when a refresh attempt failed WITHOUT a definitive answer — either
// no response arrived at all, or the server returned something other than a
// clean 400/401/403 (a 5xx, a 429, a timeout). In both cases the token on this
// device might still be good; we just couldn't confirm it. Cleared the moment
// a refresh succeeds, or the server gives a real rejection (nothing left to
// retry either way). Read by retryRefreshIfOwed(), fired from
// services/connectivity.ts the instant the device reconnects, so a session
// that only ever failed because the network dropped recovers on its own
// instead of waiting for the user to notice and reopen the app.
let refreshOwed = false;

async function refreshAccess(): Promise<string> {
  let tokens: Tokens | null;
  try {
    tokens = await getTokensStrict();
  } catch (err) {
    if (!(err instanceof TokenStoreUnavailableError)) throw err;
    // The Keychain couldn't be read (e.g. the device is locked). That is NOT
    // the server rejecting the session, and nothing has been wiped, so it must
    // not surface as 401. Status 0 = "couldn't ask", same as a network failure:
    // callers keep the session. Deliberately not throwUnreachable() — the
    // backend is fine, so no "can't reach server" banner.
    throw new ApiError('Secure storage is unavailable: try again in a moment.', 0, null);
  }
  if (!tokens?.refresh_token) {
    throw new ApiError('Session expired', 401, null);
  }
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE}${API_PREFIX}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });
  } catch (err) {
    // Couldn't even reach /auth/refresh (no connectivity, DNS/TLS blip, our
    // own timeout) — NOT the same as the server rejecting the refresh token.
    // Must surface as status 0, distinct from the real-rejection 401 thrown
    // below, so callers (authStore.hydrateInner's isRealAuthRejection check,
    // and this function's own caller just below) don't mistake a network
    // hiccup during refresh for an actual invalid session and log the user
    // out over it.
    //
    // A response never arrived, so we don't actually know whether the token
    // on the server has already moved past this one — mark a refresh as
    // "owed" so retryRefreshIfOwed() (fired from connectivity.ts the instant
    // the device reconnects) picks it back up without waiting for the user to
    // notice and reopen the app. See that function for why this is safe.
    refreshOwed = true;
    throwUnreachable(err instanceof Error && err.name === 'AbortError');
  }
  markReachable();
  if (!res.ok) {
    // Only the server saying "this refresh token is no good" ends the session.
    // Anything else — a 500/502/503 from a cold-starting serverless instance or
    // a database hiccup, a 429, a 408 — means the server couldn't answer right
    // now, not that the session is invalid. Wiping the tokens on those used to
    // turn one bad response into a permanent logout. Keep them; the next
    // request retries the refresh. A non-401 status here also keeps hydrate()
    // from treating it as a real rejection (it only wipes on 401).
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      refreshOwed = false; // a definitive rejection — nothing left to retry
      await setTokens(null);
      throw new ApiError('Session expired', 401, null);
    }
    refreshOwed = true; // the server couldn't adjudicate the token either way
    throw new ApiError('Could not refresh your session: please try again in a moment.', res.status, null);
  }
  refreshOwed = false;
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

// Spaced (doubling) delays between reconnect-triggered retry attempts — NOT
// instant repeats. If the server (or the connection) is still shaky right when
// we reconnect, hammering it back-to-back helps nobody; waiting longer each
// time gives a cold start or a flaky link a chance to actually clear before
// the next attempt.
const RECONNECT_RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

/**
 * Picks a refresh back up after the device reconnects, if one was left owed.
 *
 * Call this from a network-reconnect listener, not on a timer — it should
 * fire the instant the device comes back online, not on a poll. Never throws;
 * a caller firing this speculatively on every reconnect must not have to
 * handle a rejection for the common case of "nothing was owed".
 */
export async function retryRefreshIfOwed(): Promise<void> {
  if (!refreshOwed) return;
  // "Was a session genuinely there" — a user who has since logged out, or was
  // never signed in, has no refresh_token to retry with. getTokens() never
  // caches a failed read as "no tokens" (see utils/storage.ts), so this is
  // safe to call speculatively without risking a false negative here.
  const tokens = await getTokens();
  if (!tokens?.refresh_token) {
    refreshOwed = false;
    return;
  }
  for (const delay of RECONNECT_RETRY_DELAYS_MS) {
    try {
      await refreshAccessOnce();
      return; // refreshAccess() already cleared refreshOwed on success
    } catch (err) {
      // A real response arrived and wasn't a network/adjudication failure —
      // refreshAccess() already resolved refreshOwed either way (cleared it
      // on a genuine rejection, left it set on another undecided failure).
      // Nothing more for THIS retry pass to do with a definitive answer.
      if (err instanceof ApiError && err.status !== 0 && !refreshOwed) return;
      await new Promise(res => setTimeout(res, delay));
    }
  }
  // Still undecided after every spaced attempt. Leave refreshOwed set — the
  // next reconnect (or the next ordinary API call hitting a 401) tries again.
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
  { retryOnNetworkError = false }: { retryOnNetworkError?: boolean } = {},
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

  const doFetch = () =>
    fetchWithTimeout(`${API_BASE}${API_PREFIX}${path}`, { ...options, headers });

  let res: Response;
  try {
    res = await doFetch();
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    // The backend is a serverless function that can take 5-15s to open its DB
    // connections on a cold start, and the platform can kill it before that
    // finishes — fetch() then throws with no HTTP response at all, well before
    // our own 30s timeout. By the time that happens the instance is normally
    // warm, so silently retrying once (only for callers that opt in, since a
    // blind retry isn't safe for every endpoint) resolves it without the user
    // needing to notice or tap again.
    if (retryOnNetworkError && !isAbort) {
      addBreadcrumb('network error, retrying once', { path });
      try {
        res = await doFetch();
      } catch (err2) {
        captureError(err2, { path, api_base: API_BASE });
        throwUnreachable(err2 instanceof Error && err2.name === 'AbortError');
      }
    } else {
      if (!isAbort) {
        // fetch() threw before any HTTP response arrived — capture the real
        // underlying error (DNS failure, TLS failure, connection refused, …),
        // since the generic message shown to the user can't say which it was.
        captureError(err, { path, api_base: API_BASE });
      }
      throwUnreachable(isAbort);
    }
  }

  if (res.status === 401 && auth) {
    try {
      const access = await refreshAccessOnce();
      headers.Authorization = `Bearer ${access}`;
      res = await fetchWithTimeout(`${API_BASE}${API_PREFIX}${path}`, {
        ...options,
        headers,
      });
    } catch (err) {
      // Rethrow refreshAccess's own ApiError as-is — it already carries the
      // right status (0 for "couldn't reach /auth/refresh", 401 for "server
      // rejected the refresh token"). Collapsing both into a blanket 401
      // here was exactly what made a network hiccup during refresh
      // indistinguishable from a real invalid session to every caller
      // (authStore.hydrateInner's isRealAuthRejection check in particular),
      // logging people out over connectivity, not an actual rejection. Any
      // other error reaching here (e.g. the retried fetchWithTimeout above
      // failing outright) is a network-shaped failure too, not a rejection.
      if (err instanceof ApiError) throw err;
      throwUnreachable(false);
    }
  }

  // An HTTP response arrived (any status), so the backend is reachable.
  markReachable();

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

  let body: any;
  try {
    body = await res.json();
  } catch (err) {
    captureError(err, { path, status: res.status });
    throw new ApiError('Invalid server response', res.status, null);
  }
  // New-style success envelope on migrated endpoints (currently the 5 auth
  // endpoints): { success: true, message, data: {...} }. Detected by shape
  // rather than by path, so endpoints that haven't migrated yet keep
  // returning their raw body untouched.
  if (body && typeof body === 'object' && (body as any).success === true && 'data' in (body as any)) {
    return (body as any).data as T;
  }
  return body as T;
}

/**
 * Warms the serverless backend as early as possible. That is its only job.
 *
 * It must NOT be read as a connectivity verdict. The 5s fuse is shorter than
 * a Vercel cold start, which is the very condition it exists to paper over,
 * so a `false` here means "the instance was still waking up", not "this
 * device is offline". Treating the two as the same is what used to leave the
 * offline banner stuck on a perfectly working app: this aborted at 5s and
 * reported offline while hydrate(), on its 30s timeout, reached the same
 * backend fine a moment later, and whichever settled last won.
 *
 * The flag write is therefore deliberately one-directional. A success proves
 * the backend is reachable and is worth recording. A timeout proves nothing
 * and records nothing; real API calls, on the real timeout, decide that.
 */
export async function healthCheck(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    if (res.ok) markReachable();
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

