jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

jest.mock('@react-native-firebase/crashlytics', () => () => ({
  setCrashlyticsCollectionEnabled: jest.fn(),
  setAttributes: jest.fn(),
  setUserId: jest.fn(),
  recordError: jest.fn(),
  log: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: View,
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    FlatList: require('react-native').FlatList,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
  };
});

jest.mock('react-native-screens', () => {
  const { View } = require('react-native');
  return {
    ScreenStack: View,
    ScreenStackItem: View,
    ScreenFooter: View,
    compatibilityFlags: {
      isNewBackTitleImplementation: true,
      usesHeaderFlexboxImplementation: true,
      usesNewAndroidHeaderHeightImplementation: true,
      usesStableTabsApi: true,
    },
    isSearchBarAvailableForCurrentPlatform: false,
    ScreenStackHeaderBackButtonImage: View,
    ScreenStackHeaderCenterView: View,
    ScreenStackHeaderLeftView: View,
    ScreenStackHeaderRightView: View,
    ScreenStackHeaderSearchBarView: View,
    SearchBar: View,
  };
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  NavigationContainer: ({ children }) => children,
}));

jest.mock('@react-native-firebase/analytics', () => () => ({
  setAnalyticsCollectionEnabled: jest.fn(),
  logEvent: jest.fn(),
  logScreenView: jest.fn(),
  setUserId: jest.fn(),
}));

// Native module, so it can't load under Jest. services/googleAuth.ts already
// degrades gracefully when the require fails, but mocking it keeps the failure
// out of the test output and lets tests drive the sign-in flow.
// Same reasoning for Sign in with Apple. services/appleAuth.ts returns early
// off iOS anyway, but tests can set Platform.OS = 'ios' and drive it.
jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: {
    isSupported: true,
    performRequest: jest.fn().mockResolvedValue({
      identityToken: 'test-apple-token',
      nonce: 'test-nonce',
      authorizationCode: 'test-code',
      fullName: { givenName: 'Test', familyName: 'User' },
      email: null,
      user: 'test-apple-user',
    }),
    Operation: { LOGIN: 1 },
    Scope: { EMAIL: 0, FULL_NAME: 1 },
    Error: { CANCELED: '1001' },
  },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({ type: 'success', data: { idToken: 'test-id-token' } }),
    signOut: jest.fn().mockResolvedValue(undefined),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

// netinfo is a native module: without this, anything importing
// services/connectivity.ts (transitively App.tsx) fails to load under jest.
// Defaults to a healthy wifi connection so tests see an online device, which
// is what every existing test assumed back when connectivity was a plain
// `isOffline: false` default on authStore.
jest.mock('@react-native-community/netinfo', () => {
  const state = {
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: { strength: 99, isConnectionExpensive: false },
  };
  return {
    __esModule: true,
    default: {
      configure: jest.fn(),
      fetch: jest.fn(() => Promise.resolve(state)),
      refresh: jest.fn(() => Promise.resolve(state)),
      // Hand the listener the initial state the way the real module does,
      // then return the unsubscribe function callers store.
      addEventListener: jest.fn(listener => {
        listener(state);
        return jest.fn();
      }),
    },
  };
});
