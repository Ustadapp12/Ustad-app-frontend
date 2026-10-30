import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';

const geo = Geolocation as unknown as {
  requestAuthorization: jest.Mock;
  getCurrentPosition: jest.Mock;
};

function loadFresh() {
  let mod: typeof import('../src/utils/location');
  jest.isolateModules(() => { mod = require('../src/utils/location'); });
  return mod!;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  geo.requestAuthorization.mockReset();
  geo.getCurrentPosition.mockReset();
});

describe('saved location', () => {
  it('saves a real fix and loads it on a later cold start', async () => {
    geo.requestAuthorization.mockImplementation(ok => ok());
    geo.getCurrentPosition.mockImplementation(ok => ok({ coords: { latitude: 31.5, longitude: 74.3 } }));
    await loadFresh().getCurrentCoordinates();
    await new Promise(r => setImmediate(r));

    const coldStart = loadFresh();
    expect(coldStart.getLastKnownCoordinates()).toBeNull();
    expect(await coldStart.loadSavedCoordinates()).toEqual({ latitude: 31.5, longitude: 74.3 });
  });

  it('keeps the saved fix when a GPS read merely fails', async () => {
    geo.requestAuthorization.mockImplementation(ok => ok());
    geo.getCurrentPosition.mockImplementationOnce(ok => ok({ coords: { latitude: 1, longitude: 2 } }));
    const loc = loadFresh();
    await loc.getCurrentCoordinates();
    geo.getCurrentPosition.mockImplementationOnce((_ok, fail) => fail(new Error('timeout')));
    expect(await loc.getCurrentCoordinates()).toBeNull();
    expect(loc.getLastKnownCoordinates()).toEqual({ latitude: 1, longitude: 2 });
  });

  it('forgets the saved fix when permission is denied', async () => {
    geo.requestAuthorization.mockImplementationOnce(ok => ok());
    geo.getCurrentPosition.mockImplementationOnce(ok => ok({ coords: { latitude: 1, longitude: 2 } }));
    const loc = loadFresh();
    await loc.getCurrentCoordinates();
    geo.requestAuthorization.mockImplementationOnce((_ok, fail) => fail());
    expect(await loc.getCurrentCoordinates()).toBeNull();
    expect(loc.getLastKnownCoordinates()).toBeNull();
    await new Promise(r => setImmediate(r));
    expect(await loadFresh().loadSavedCoordinates()).toBeNull();
  });
});
