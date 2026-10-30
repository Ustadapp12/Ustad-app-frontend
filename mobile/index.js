/**
 * @format
 */
console.log('[APP] index.js loaded');
import 'react-native-gesture-handler';
import { enableFreeze } from 'react-native-screens';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { initCrashReporting } from './src/services/crashReporter';

initCrashReporting();

// Stops screens that are mounted but off-screen (background tabs, screens
// below the top of a stack) from re-rendering on every state change. Must be
// called before any navigator mounts, hence here rather than in App.tsx.
enableFreeze(true);

AppRegistry.registerComponent(appName, () => App); // bare RN build
AppRegistry.registerComponent('main', () => App); // Expo Go
