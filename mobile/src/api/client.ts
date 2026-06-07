import * as Sentry from '@sentry/react-native';
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

async function refreshAccess(): Promise<string> {
  const tokens = await getTokens();
  if (!tokens?.refresh_token) {
    throw new ApiError('Session expired', 401, null);
  }
  const res = await fetch(`${API_BASE}${API_PREFIX}/auth/refresh`, {
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

  let res = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && auth) {
    try {
      const access = await refreshAccess();
      headers.Authorization = `Bearer ${access}`;
      res = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
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
    // Report API errors to Sentry with full context
    Sentry.addBreadcrumb({
      category: 'api',
      message: `${options.method ?? 'GET'} ${path} → ${res.status}`,
      level: res.status >= 500 ? 'error' : 'warning',
      data: { status: res.status, path },
    });
    throw new ApiError(message, res.status, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
