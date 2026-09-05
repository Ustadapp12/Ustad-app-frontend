/**
 * @format
 */
console.log('[APP] index.js loaded');
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { initCrashReporting } from './src/services/crashReporter';

initCrashReporting();

AppRegistry.registerComponent(appName, () => App); // bare RN build
AppRegistry.registerComponent('main', () => App); // Expo Go
