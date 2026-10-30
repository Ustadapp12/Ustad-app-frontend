/**
 * Regression cover for "state isn't persistent": users getting logged out.
 *
 * Two silent failures in the token store, both now pinned:
 *
 *  1. A failed Keychain READ (iOS refuses reads while the device is locked) was
 *     flattened into "no tokens" AND cached, so every request went out
 *     unauthenticated until the app was force-closed.
 *  2. A failed Keychain WRITE was swallowed after the memory cache had already
 *     been updated. The server had rotated the refresh token, so a relaunch read
 *     the OLD (revoked) pair from the Keychain and logged the user out.
 */
const PARKED_KEY = '@ustadapp/tokens';

const OLD = { access_token: 'old-access', refresh_token: 'old-refresh' };
const NEW = { access_token: 'new-access', refresh_token: 'new-refresh' };

// One in-memory "disk" shared by every load() below. jest.resetModules() would
// otherwise hand storage.ts a brand-new AsyncStorage mock each time, and a
// simulated relaunch would see an empty disk instead of what the last run left.
const disk = new Map<string, string>();
const AsyncStorage = {
  getItem: jest.fn(async (k: string) => (disk.has(k) ? (disk.get(k) as string) : null)),
  setItem: jest.fn(async (k: string, v: string) => void disk.set(k, v)),
  removeItem: jest.fn(async (k: string) => void disk.delete(k)),
};

// Fresh module state per test: storage.ts keeps its token cache at module level,
// and "app relaunch" in these tests means re-requiring it.
function load() {
  jest.resetModules();
  const secure = {
    getSecureTokens: jest.fn(),
    setSecureTokens: jest.fn(),
  };
  jest.doMock('../src/services/secureTokens', () => secure);
  jest.doMock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: AsyncStorage,
  }));
  const storage = require('../src/utils/storage');
  return { secure, storage };
}

beforeEach(() => {
  disk.clear();
});

describe('reading', () => {
  it('does not cache a failed read: the next call looks again', async () => {
    const { secure, storage } = load();
    secure.getSecureTokens
      .mockRejectedValueOnce(new Error('keychain locked'))
      .mockResolvedValueOnce(OLD);

    expect(await storage.getTokens()).toBeNull();
    expect(await storage.getTokens()).toEqual(OLD);
  });

  it('getTokensStrict throws a typed error instead of reporting "signed out"', async () => {
    const { secure, storage } = load();
    secure.getSecureTokens.mockRejectedValue(new Error('keychain locked'));

    await expect(storage.getTokensStrict()).rejects.toBeInstanceOf(storage.TokenStoreUnavailableError);
  });

  it('an empty Keychain is a real "no tokens" answer, and is cached', async () => {
    const { secure, storage } = load();
    secure.getSecureTokens.mockResolvedValue(null);

    expect(await storage.getTokensStrict()).toBeNull();
    expect(await storage.getTokensStrict()).toBeNull();
    expect(secure.getSecureTokens).toHaveBeenCalledTimes(1);
  });
});

describe('writing', () => {
  it('stores in the Keychain and leaves nothing parked when that works', async () => {
    const { secure, storage } = load();
    secure.setSecureTokens.mockResolvedValue(true);
    await AsyncStorage.setItem(PARKED_KEY, JSON.stringify(OLD)); // stale leftover

    await storage.setTokens(NEW);

    expect(secure.setSecureTokens).toHaveBeenCalledWith(NEW);
    expect(await AsyncStorage.getItem(PARKED_KEY)).toBeNull();
  });

  it('retries the Keychain once before giving up', async () => {
    const { secure, storage } = load();
    secure.setSecureTokens.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await storage.setTokens(NEW);

    expect(secure.setSecureTokens).toHaveBeenCalledTimes(2);
    expect(await AsyncStorage.getItem(PARKED_KEY)).toBeNull();
  });

  it('parks the new pair when the Keychain refuses, and a relaunch uses it, not the stale Keychain copy', async () => {
    const first = load();
    first.secure.setSecureTokens.mockResolvedValue(false); // Keychain write fails every time
    await first.storage.setTokens(NEW);
    expect(JSON.parse((await AsyncStorage.getItem(PARKED_KEY)) as string)).toEqual(NEW);

    // Relaunch: the Keychain still holds the OLD, now-revoked pair.
    const second = load();
    second.secure.getSecureTokens.mockResolvedValue(OLD);
    second.secure.setSecureTokens.mockResolvedValue(true); // Keychain recovered

    expect(await second.storage.getTokensStrict()).toEqual(NEW);
    // ...and it was moved home, so nothing stays parked.
    expect(second.secure.setSecureTokens).toHaveBeenCalledWith(NEW);
    expect(await AsyncStorage.getItem(PARKED_KEY)).toBeNull();
  });

  it('keeps the parked pair while the Keychain still refuses it', async () => {
    const { secure, storage } = load();
    await AsyncStorage.setItem(PARKED_KEY, JSON.stringify(NEW));
    secure.getSecureTokens.mockResolvedValue(OLD);
    secure.setSecureTokens.mockResolvedValue(false);

    expect(await storage.getTokensStrict()).toEqual(NEW);
    expect(JSON.parse((await AsyncStorage.getItem(PARKED_KEY)) as string)).toEqual(NEW);
  });

  it('signing out clears a parked pair even if the Keychain reset fails', async () => {
    const { secure, storage } = load();
    secure.setSecureTokens.mockResolvedValue(false);
    await AsyncStorage.setItem(PARKED_KEY, JSON.stringify(NEW));

    await storage.setTokens(null);

    expect(await AsyncStorage.getItem(PARKED_KEY)).toBeNull();
  });

  it('drops an unparseable parked value instead of crashing', async () => {
    const { secure, storage } = load();
    await AsyncStorage.setItem(PARKED_KEY, '{"access_tok'); // truncated mid-write
    secure.getSecureTokens.mockResolvedValue(OLD);

    expect(await storage.getTokensStrict()).toEqual(OLD);
    expect(await AsyncStorage.getItem(PARKED_KEY)).toBeNull();
  });
});
