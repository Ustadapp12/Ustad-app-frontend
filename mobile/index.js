/**
 * @format
 */
import 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import sentryConfig from './sentry.config';

let sentryReady = false;
try {
  Sentry.init({
    dsn: 'https://374bfaa46733ff117de43dd3803fa0e6@o4511506682544128.ingest.us.sentry.io/4511506700173312',
    release: sentryConfig.release,
    dist: sentryConfig.dist,
    tracesSampleRate: 1.0,
    // Auto-performance instrumentation (app-start/native-frames/stall
    // tracking) adds native-bridge overhead at startup for data nothing in
    // this app reads (no startTransaction/startSpan calls anywhere) — off,
    // but error/crash reporting above is unaffected.
    enableAutoPerformanceTracing: false,
    enableAppStartTracking: false,
    enableNativeFramesTracking: false,
    enableStallTracking: false,
    // debug: true triggers NativeEventEmitter.addListener which crashes on Android
    // with "addListener of NativeEventEmitter can't be used on Android" — keep false
    debug: false,
    environment: __DEV__ ? 'development' : 'production',
  });
  sentryReady = true;
} catch { /* Sentry native module not available (e.g. Expo Go) */ }

const wrap = C => { try { return sentryReady ? Sentry.wrap(C) : C; } catch { return C; } };
AppRegistry.registerComponent(appName, () => wrap(App)); // bare RN build
AppRegistry.registerComponent('main', () => wrap(App)); // Expo Go
