// Must use expo/metro-config's getDefaultConfig, not @react-native/metro-config's —
// `eas build`'s production JS bundling runs `expo export:embed`, which requires
// the serializer.customSerializer that only Expo's config provides. Without it,
// Metro emits a plain JS bundle instead of Expo's expected wrapped format, and
// expo export:embed fails trying to JSON.parse it ("Unexpected token 'v', \"var
// __BUND\"... is not valid JSON").
const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');

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
