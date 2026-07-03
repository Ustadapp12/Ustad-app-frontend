import { addBreadcrumb } from '../services/crashReporter';
import { API_BASE, API_PREFIX } from '../config';
import { getTokens, setTokens } from '../utils/storage';
import { messageForStatus } from './formatError';
import type { Tokens } from '../types/api';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const API_TIMEOUT_MS = 15_000;

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
      const access = await refreshAccess();
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
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const message = messageForStatus(res.status, body);
    addBreadcrumb(`${options.method ?? 'GET'} ${path} → ${res.status}`, { status: res.status, path });
    throw new ApiError(message, res.status, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
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

