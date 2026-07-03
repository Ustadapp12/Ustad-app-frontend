module.exports = {
  assets: ['./assets/fonts/'],
  dependencies: {
    // Exclude Expo packages — this is a bare RN project; expo is installed only for
    // babel-preset-expo but must not be auto-linked (it requires the Expo Gradle plugin).
    expo: { platforms: { android: null, ios: null } },
    'expo-dev-client': { platforms: { android: null, ios: null } },
    'babel-preset-expo': { platforms: { android: null, ios: null } },
    '@expo/ngrok': { platforms: { android: null, ios: null } },
  },
};
