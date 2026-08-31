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
