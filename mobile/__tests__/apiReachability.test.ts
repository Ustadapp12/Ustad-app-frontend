/**
 * Regression cover for the false "You're offline" banner.
 *
 * The original bug: authStore.refreshLearning's catch read
 *   if (!(e instanceof ApiError && e.status === 401)) setOffline(true)
 * so every non-401 error claimed the device was offline. A 503 during a
 * backend deploy showed "You're offline. Changes will sync once you're back
 * online." on a device with perfect WiFi, where all three clauses were false.
 *
 * api/client.ts now owns the verdict, and only status 0 ("no HTTP response
 * arrived at all") counts. These tests pin that boundary.
 */
jest.mock('../src/utils/storage', () => ({
  getTokens: jest.fn(() => Promise.resolve(null)),
  setTokens: jest.fn(() => Promise.resolve()),
}));

jest.mock('../src/navigation/navigationRef', () => ({
  redirectToVerifyEmail: jest.fn(),
}));

import { api, ApiError, healthCheck } from '../src/api/client';
import { useConnectivityStore } from '../src/store/connectivityStore';

const realFetch = global.fetch;

function jsonResponse(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  useConnectivityStore.setState({ isDeviceOffline: false, isServerUnreachable: false });
});

afterAll(() => {
  global.fetch = realFetch;
});

const unreachable = () => useConnectivityStore.getState().isServerUnreachable;

describe('server-unreachable is set only when no response arrives', () => {
  it('flags unreachable when fetch throws outright', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as any;

    await expect(api('/anything', {}, false)).rejects.toMatchObject({ status: 0 });
    expect(unreachable()).toBe(true);
  });

  it('flags unreachable when the request aborts on our own timeout', async () => {
    const abort = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    global.fetch = jest.fn(() => Promise.reject(abort)) as any;

    await expect(api('/anything', {}, false)).rejects.toMatchObject({ status: 0 });
    expect(unreachable()).toBe(true);
  });

  it('does NOT flag unreachable on a 500 — this was the bug', async () => {
    global.fetch = jest.fn(() => Promise.resolve(jsonResponse(500, { detail: 'boom' }))) as any;

    await expect(api('/anything', {}, false)).rejects.toBeInstanceOf(ApiError);
    expect(unreachable()).toBe(false);
  });

  it('does NOT flag unreachable on a 503 mid-deploy', async () => {
    global.fetch = jest.fn(() => Promise.resolve(jsonResponse(503, { detail: 'deploying' }))) as any;

    await expect(api('/anything', {}, false)).rejects.toBeInstanceOf(ApiError);
    expect(unreachable()).toBe(false);
  });

  it('does NOT flag unreachable on a 404', async () => {
    global.fetch = jest.fn(() => Promise.resolve(jsonResponse(404, { detail: 'nope' }))) as any;

    await expect(api('/anything', {}, false)).rejects.toBeInstanceOf(ApiError);
    expect(unreachable()).toBe(false);
  });

  it('clears a previous unreachable verdict as soon as any response arrives', async () => {
    useConnectivityStore.setState({ isServerUnreachable: true });
    // Even an error response proves the backend is reachable.
    global.fetch = jest.fn(() => Promise.resolve(jsonResponse(500, { detail: 'boom' }))) as any;

    await expect(api('/anything', {}, false)).rejects.toBeInstanceOf(ApiError);
    expect(unreachable()).toBe(false);
  });

  it('clears the verdict on a successful call', async () => {
    useConnectivityStore.setState({ isServerUnreachable: true });
    global.fetch = jest.fn(() => Promise.resolve(jsonResponse(200, { ok: true }))) as any;

    await expect(api('/anything', {}, false)).resolves.toEqual({ ok: true });
    expect(unreachable()).toBe(false);
  });

  it('never touches isDeviceOffline — that is the OS\'s answer, not ours', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as any;

    await expect(api('/anything', {}, false)).rejects.toMatchObject({ status: 0 });
    expect(useConnectivityStore.getState().isDeviceOffline).toBe(false);
  });
});

describe('healthCheck is warming only', () => {
  it('records reachability on success', async () => {
    useConnectivityStore.setState({ isServerUnreachable: true });
    global.fetch = jest.fn(() => Promise.resolve(jsonResponse(200))) as any;

    await expect(healthCheck()).resolves.toBe(true);
    expect(unreachable()).toBe(false);
  });

  it('does NOT flag unreachable on its 5s timeout', async () => {
    // The 5s fuse is shorter than the cold start it exists to hide, so a
    // failure here proves nothing. Letting it write the flag is what stuck
    // the banner on every cold launch.
    const abort = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    global.fetch = jest.fn(() => Promise.reject(abort)) as any;

    await expect(healthCheck()).resolves.toBe(false);
    expect(unreachable()).toBe(false);
  });
});
