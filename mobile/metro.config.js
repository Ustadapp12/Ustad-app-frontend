// Using bare RN metro config — babel-preset-expo handles Expo Go compatibility
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
module.exports = mergeConfig(getDefaultConfig(__dirname), {});
