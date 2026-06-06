/**
 * @format
 */
import 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import sentryConfig from './sentry.config';

Sentry.init({
  dsn: 'https://374bfaa46733ff117de43dd3803fa0e6@o4511506682544128.ingest.us.sentry.io/4511506700173312',
  release: sentryConfig.release,
  dist: sentryConfig.dist,
  tracesSampleRate: 1.0,
  // debug: true triggers NativeEventEmitter.addListener which crashes on Android
  // with "addListener of NativeEventEmitter can't be used on Android" — keep false
  debug: false,
  environment: __DEV__ ? 'development' : 'production',
});

AppRegistry.registerComponent(appName, () => Sentry.wrap(App));
