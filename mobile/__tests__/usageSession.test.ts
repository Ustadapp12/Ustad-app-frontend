jest.mock('../src/api', () => ({
  usageApi: {
    startSession: jest.fn(),
    endSession: jest.fn(),
  },
}));

import { usageApi } from '../src/api';
import { startUsageSession, endUsageSession } from '../src/services/usageSession';

const startSession = usageApi.startSession as jest.Mock;
const endSession = usageApi.endSession as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  endSession.mockResolvedValue({ session_id: 'cleanup', duration_s: 0 });
});

// usageSession.ts holds its "active session" state at module scope (by
// design — there's genuinely only one current session for the app's
// lifetime). Without resetting it here, whichever test runs first leaves it
// active for every test after it.
afterEach(async () => {
  await endUsageSession();
});

describe('usageSession', () => {
  it('starts a session and sends platform + app_version', async () => {
    startSession.mockResolvedValue({ session_id: 'sess-1' });

    await startUsageSession();

    expect(startSession).toHaveBeenCalledTimes(1);
    const body = startSession.mock.calls[0][0];
    expect(body.platform).toBe('ios'); // jest-preset mocks Platform.OS as 'ios'
    expect(typeof body.app_version).toBe('string');
  });

  it('does not start a second session while one is already active', async () => {
    startSession.mockResolvedValue({ session_id: 'sess-1' });

    await startUsageSession();
    await startUsageSession();

    expect(startSession).toHaveBeenCalledTimes(1);
  });

  it('ends the active session and clears it so a new one can start', async () => {
    startSession.mockResolvedValue({ session_id: 'sess-1' });
    endSession.mockResolvedValue({ session_id: 'sess-1', duration_s: 42 });

    await startUsageSession();
    await endUsageSession();

    expect(endSession).toHaveBeenCalledWith('sess-1', { last_screen: undefined, previous_screen: undefined });

    startSession.mockResolvedValue({ session_id: 'sess-2' });
    await startUsageSession();
    expect(startSession).toHaveBeenCalledTimes(2);
  });

  it('is a no-op when ending with no active session', async () => {
    await endUsageSession();
    expect(endSession).not.toHaveBeenCalled();
  });

  it('swallows a failed start — analytics must never throw into the caller', async () => {
    startSession.mockRejectedValue(new Error('network down'));

    await expect(startUsageSession()).resolves.toBeUndefined();
  });

  it('swallows a failed end and still clears the session id', async () => {
    startSession.mockResolvedValue({ session_id: 'sess-1' });
    endSession.mockRejectedValueOnce(new Error('network down'));

    await startUsageSession();
    await expect(endUsageSession()).resolves.toBeUndefined();

    // Session id was cleared despite the failure — a stuck id would block
    // every future session forever.
    endSession.mockResolvedValue({ session_id: 'sess-2', duration_s: 1 });
    startSession.mockResolvedValue({ session_id: 'sess-2' });
    await startUsageSession();
    await endUsageSession();
    expect(endSession).toHaveBeenLastCalledWith('sess-2', { last_screen: undefined, previous_screen: undefined });
  });
});
