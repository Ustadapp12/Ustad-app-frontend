/**
 * @format
 */
import 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

Sentry.init({
  // Replace with your Sentry DSN from sentry.io → Settings → Projects → DSN
  dsn: 'https://374bfaa46733ff117de43dd3803fa0e6@o4511506682544128.ingest.us.sentry.io/4511506700173312',

  // Set tracesSampleRate to 1.0 for full performance monitoring in dev
  // Lower to 0.2 in production to reduce costs
  tracesSampleRate: 1.0,

  // Shows full stack traces (disable in production for performance)
  debug: __DEV__,

  // Environment tag — shows "development" vs "production" in Sentry dashboard
  environment: __DEV__ ? 'development' : 'production',
});

AppRegistry.registerComponent(appName, () => Sentry.wrap(App));
