module.exports = {
  // BARE RN MODE (active)
  presets: ['module:@react-native/babel-preset'],
  // EXPO MODE (inactive) — swap comments above to use Expo preset
  // presets: ['babel-preset-expo'],
  // Inlines process.env.VERSION_NAME (set before release builds — see
  // utils/appVersion.ts) as a literal string at bundle time.
  plugins: ['transform-inline-environment-variables'],
};
