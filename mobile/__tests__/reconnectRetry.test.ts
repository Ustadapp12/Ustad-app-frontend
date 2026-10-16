/**
 * Regression cover for "lose signal mid-use, come back, logged out".
 *
 * Sequence this is pinning down: the app tries to refresh, the server rotates
 * the token, but the RESPONSE never arrives (dropped signal). The client is
 * left holding the now-superseded token but never wiped it (status-0 paths
 * never did). Previously nothing picked that back up until the user noticed
 * and reopened the app, by which point the backend's own grace window may
 * have run out too. retryRefreshIfOwed() — fired from the reconnect listener
 * in services/connectivity.ts — closes that gap by retrying automatically the
 * instant the device comes back online.
 */
jest.mock('../src/utils/storage', () => ({
  getTokens: jest.fn(),
  getTokensStrict: jest.fn(),
  setTokens: jest.fn(() => Promise.resolve()),
  TokenStoreUnavailableError: class TokenStoreUnavailableError extends Error {},
}));

jest.mock('../src/navigation/navigationRef', () => ({
  redirectToVerifyEmail: jest.fn(),
}));

import { api, retryRefreshIfOwed } from '../src/api/client';
import * as storage from '../src/utils/storage';

const mockStorage = storage as jest.Mocked<typeof storage>;
const TOKENS = { access_token: 'stale-access', refresh_token: 'refresh-1' };

function jsonResponse(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
  };
}

const realFetch = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockStorage.getTokens.mockResolvedValue(TOKENS);
  mockStorage.getTokensStrict.mockResolvedValue(TOKENS);
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(() => {
  global.fetch = realFetch;
});

/** Drives a call that's parked on setTimeout-based backoff to completion. */
async function flushBackoff() {
  for (let i = 0; i < 3; i++) {
    await jest.advanceTimersByTimeAsync(5_000);
  }
}

describe('nothing to retry', () => {
  it('does nothing if no refresh was ever left owed', async () => {
    global.fetch = jest.fn() as any;

    await retryRefreshIfOwed();

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('a lost response gets retried on reconnect', () => {
  async function loseAResponse() {
    // Drive one API call through a 401 -> refresh attempt that never gets a
    // response at all, which is what marks a refresh as "owed".
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(401)) // the original request
      .mockRejectedValueOnce(new TypeError('Network request failed')) as any; // /auth/refresh
    await expect(api('/learning/me')).rejects.toMatchObject({ status: 0 });
  }

  it('checks a session is genuinely there before retrying', async () => {
    await loseAResponse();
    mockStorage.getTokens.mockResolvedValue(null); // signed out since the outage

    await retryRefreshIfOwed();

    // Only the one /auth/refresh call from loseAResponse() — no second attempt.
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('succeeds on the first retry with no extra delay', async () => {
    await loseAResponse();
    const pair = { access_token: 'fresh-access', refresh_token: 'refresh-2' };
    global.fetch = jest.fn().mockResolvedValueOnce(jsonResponse(200, pair)) as any;

    await retryRefreshIfOwed();

    expect(mockStorage.setTokens).toHaveBeenCalledWith(pair);
  });

  it('backs off between attempts instead of hammering the server', async () => {
    await loseAResponse();
    const pair = { access_token: 'fresh-access', refresh_token: 'refresh-2' };
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(jsonResponse(200, pair)) as any;

    const done = retryRefreshIfOwed();
    await flushBackoff();
    await done;

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(mockStorage.setTokens).toHaveBeenCalledWith(pair);
  });

  it('gives up after exhausting every attempt, leaving the retry owed for next time', async () => {
    await loseAResponse();
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as any;

    const done = retryRefreshIfOwed();
    await flushBackoff();
    await done;

    expect(mockStorage.setTokens).not.toHaveBeenCalled();

    // Still owed: calling again (e.g. the next reconnect) tries once more.
    jest.clearAllMocks();
    mockStorage.getTokens.mockResolvedValue(TOKENS);
    const pair = { access_token: 'fresh-access', refresh_token: 'refresh-2' };
    global.fetch = jest.fn().mockResolvedValueOnce(jsonResponse(200, pair)) as any;

    await retryRefreshIfOwed();

    expect(mockStorage.setTokens).toHaveBeenCalledWith(pair);
  });

  it('stops retrying once the server gives a genuine rejection', async () => {
    await loseAResponse();
    global.fetch = jest.fn().mockResolvedValueOnce(jsonResponse(401)) as any;

    await retryRefreshIfOwed();

    expect(mockStorage.setTokens).toHaveBeenCalledWith(null); // signed out, correctly

    // Nothing left owed — a later reconnect must not fire /auth/refresh again.
    jest.clearAllMocks();
    global.fetch = jest.fn() as any;
    await retryRefreshIfOwed();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('keeps retrying across a 5xx — the server still has not adjudicated the token', async () => {
    await loseAResponse();
    const pair = { access_token: 'fresh-access', refresh_token: 'refresh-2' };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(200, pair)) as any;

    const done = retryRefreshIfOwed();
    await flushBackoff();
    await done;

    expect(mockStorage.setTokens).toHaveBeenCalledWith(pair);
  });
});
