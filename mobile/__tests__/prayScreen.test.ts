jest.mock('../src/utils/location', () => ({
  getCurrentCoordinates: jest.fn(),
}));

jest.mock('../src/api', () => ({
  usersApi: { updateLocation: jest.fn() },
}));

// react-native-compass-heading (imported by the QiblaCompass sibling this
// file also pulls in) is mocked globally in jest.setup.js.

import { getCurrentCoordinates } from '../src/utils/location';
import { usersApi } from '../src/api';
import { loadPrayerData } from '../src/screens/pray/prayerData';

const currentCoordinates = getCurrentCoordinates as jest.Mock;
const updateLocation = usersApi.updateLocation as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  updateLocation.mockResolvedValue({ latitude: 0, longitude: 0 });
});

describe('loadPrayerData', () => {
  it('sends the fix to usersApi.updateLocation on a successful resolve', async () => {
    currentCoordinates.mockResolvedValue({ latitude: 31.5, longitude: 74.3 });

    await loadPrayerData();

    expect(updateLocation).toHaveBeenCalledTimes(1);
    expect(updateLocation).toHaveBeenCalledWith(31.5, 74.3);
  });

  it('returns the resolved coords plus a real next prayer and qibla bearing', async () => {
    currentCoordinates.mockResolvedValue({ latitude: 31.5, longitude: 74.3 });

    const result = await loadPrayerData();

    expect(result.coords).toEqual({ latitude: 31.5, longitude: 74.3 });
    expect(result.next).not.toBeNull();
    expect(typeof result.current).toBe('string');
    expect(typeof result.qibla).toBe('number');
  });

  it('does not call usersApi.updateLocation on a denied/null resolve', async () => {
    currentCoordinates.mockResolvedValue(null);

    const result = await loadPrayerData();

    expect(updateLocation).not.toHaveBeenCalled();
    expect(result).toEqual({ coords: null, next: null, current: null, qibla: null });
  });

  it('a failed updateLocation never rejects loadPrayerData — best-effort only', async () => {
    currentCoordinates.mockResolvedValue({ latitude: 31.5, longitude: 74.3 });
    updateLocation.mockRejectedValue(new Error('network down'));

    await expect(loadPrayerData()).resolves.toMatchObject({});
  });
});
