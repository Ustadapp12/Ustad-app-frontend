module.exports = {
  // EXPO MODE (active) — swap comments below to return to bare RN. Must stay
  // Expo mode for `eas build`'s production JS bundling (expo export:embed) to
  // work — see metro.config.js's own comment for the matching Metro-side
  // requirement. Confirmed broken again 2026-09-05 after a same-session
  // change flipped this to bare RN mode.
  presets: ['babel-preset-expo'],
  // BARE RN MODE (inactive)
  // presets: ['module:@react-native/babel-preset'],
  // Inlines process.env.VERSION_NAME (set before release builds — see
  // utils/appVersion.ts) as a literal string at bundle time.
  plugins: ['transform-inline-environment-variables'],
};
