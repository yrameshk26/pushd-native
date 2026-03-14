import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export function initSentry() {
  const dsn = Constants.expoConfig?.extra?.sentryDsn as string | undefined;

  if (!dsn) return; // Skip in dev if DSN not configured

  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
    // Attach native crash reports
    enableNative: true,
    enableNativeCrashHandling: true,
  });
}

export { Sentry };
