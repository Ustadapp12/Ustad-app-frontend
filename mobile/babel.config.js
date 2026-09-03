module.exports = {
  // EXPO MODE (active) — swap comments below to return to bare RN
  presets: ['babel-preset-expo'],
  // BARE RN MODE (inactive)
  // presets: ['module:@react-native/babel-preset'],
  // Inlines process.env.VERSION_NAME (set before release builds — see
  // utils/appVersion.ts) as a literal string at bundle time.
  plugins: ['transform-inline-environment-variables'],
};
