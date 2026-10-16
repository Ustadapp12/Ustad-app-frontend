/**
 * Regression cover for "one bad refresh response = permanent logout".
 *
 * refreshAccess() used to wipe the stored tokens on ANY non-OK response from
 * /auth/refresh, so a 503 from a cold-starting serverless instance ended the
 * session for good. Now only the server rejecting the refresh token does.
 */
// jest.mock is hoisted above everything, so the factory can't close over
// variables declared here; the mocked module is imported back instead.
jest.mock('../src/utils/storage', () => ({
  getTokens: jest.fn(),
  getTokensStrict: jest.fn(),
  setTokens: jest.fn(() => Promise.resolve()),
  TokenStoreUnavailableError: class TokenStoreUnavailableError extends Error {},
}));

jest.mock('../src/navigation/navigationRef', () => ({
  redirectToVerifyEmail: jest.fn(),
}));

import { api } from '../src/api/client';
import * as storage from '../src/utils/storage';

const mockStorage = storage as jest.Mocked<typeof storage>;

const realFetch = global.fetch;
const TOKENS = { access_token: 'stale-access', refresh_token: 'refresh-1' };

function jsonResponse(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
  };
}

/** First call (the API request) is a 401; the second (/auth/refresh) answers `refreshStatus`. */
function mockFetch(refreshStatus: number, refreshBody: unknown = {}) {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(jsonResponse(401))
    .mockResolvedValueOnce(jsonResponse(refreshStatus, refreshBody)) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.getTokens.mockResolvedValue(TOKENS);
  mockStorage.getTokensStrict.mockResolvedValue(TOKENS);
});

afterAll(() => {
  global.fetch = realFetch;
});

describe('a refresh that fails for reasons other than rejection keeps the session', () => {
  it.each([500, 502, 503, 504, 429, 408])('%i does not wipe the tokens', async status => {
    mockFetch(status);

    await expect(api('/learning/me')).rejects.toMatchObject({ status });

    expect(mockStorage.setTokens).not.toHaveBeenCalled();
  });

  it('a 5xx is not reported as 401, so hydrate() will not sign the user out', async () => {
    mockFetch(503);

    await expect(api('/learning/me')).rejects.not.toMatchObject({ status: 401 });
  });
});

describe('a refresh the server rejects ends the session', () => {
  it.each([400, 401, 403])('%i wipes the tokens and surfaces as 401', async status => {
    mockFetch(status);

    await expect(api('/learning/me')).rejects.toMatchObject({ status: 401 });

    expect(mockStorage.setTokens).toHaveBeenCalledWith(null);
  });
});

describe('a successful refresh', () => {
  it('stores the new pair and retries the original request', async () => {
    const pair = { access_token: 'fresh-access', refresh_token: 'refresh-2' };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200, pair))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true })) as any;

    await expect(api('/learning/me')).resolves.toEqual({ ok: true });

    expect(mockStorage.setTokens).toHaveBeenCalledWith(pair);
  });
});

describe('an unreadable token store is not a rejected session', () => {
  it('surfaces as status 0 and wipes nothing', async () => {
    mockStorage.getTokensStrict.mockRejectedValue(new storage.TokenStoreUnavailableError('locked'));
    global.fetch = jest.fn().mockResolvedValueOnce(jsonResponse(401)) as any;

    await expect(api('/learning/me')).rejects.toMatchObject({ status: 0 });

    expect(mockStorage.setTokens).not.toHaveBeenCalled();
    // /auth/refresh was never even attempted.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
