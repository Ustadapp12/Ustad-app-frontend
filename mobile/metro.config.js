// Using bare RN metro config — babel-preset-expo handles Expo Go compatibility
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// inlineRequires makes every require()/import lazy by default (deferred
// until the code that uses it actually runs), not just the handful of
// screens manually wrapped in React.lazy in RootNavigator — this is what
// keeps a big module tree from all being evaluated up front on cold start.
module.exports = mergeConfig(getDefaultConfig(__dirname), {
  transformer: {
    getTransformOptions: async () => ({
      transform: { inlineRequires: true },
    }),
  },
});
