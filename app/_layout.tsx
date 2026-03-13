import { useEffect, useRef } from 'react';
import { Stack, router, usePathname } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Platform, View } from 'react-native';
import { useAuthStore } from '../src/store/auth';
import TabBar from '../src/components/TabBar';
import { setupNotificationHandler, registerForPushNotificationsAsync } from '../src/lib/notifications';
import { api } from '../src/api/client';

// Lazy-import expo-notifications for the response listener — the lib guard is
// already inside notifications.ts; here we only need the subscription type.
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // expo-notifications not yet installed
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 },
    mutations: { throwOnError: false },
  },
});

// Set up foreground notification handler immediately at module load time so it
// is registered before any notification can arrive.
setupNotificationHandler();

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith('/(auth)') || pathname === '/';
  const showTabBar = isAuthenticated && !isAuthRoute;

  // Hold a reference to the notification-response subscription so we can
  // remove it on unmount.
  const responseSubscriptionRef = useRef<{ remove(): void } | null>(null);

  useEffect(() => {
    hydrate();
  }, []);

  // Register push token with the backend whenever the user is authenticated.
  useEffect(() => {
    if (!isAuthenticated) return;

    async function registerPushToken() {
      try {
        const token = await registerForPushNotificationsAsync();
        if (!token) return;

        const platform = Platform.OS === 'ios' ? 'ios' : 'android';
        await api.post('/api/users/push-token', { token, platform });
      } catch (err) {
        // Non-fatal — the app works fine without push token registration.
        console.warn('[notifications] Failed to register push token with backend:', err);
      }
    }

    registerPushToken();
  }, [isAuthenticated]);

  // Set up notification-response listener (user taps a notification).
  useEffect(() => {
    if (!Notifications) return;

    responseSubscriptionRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        const type = data?.type;

        if (type === 'workout-reminder') {
          // Navigate to the workouts tab when the user taps a workout reminder.
          router.push('/(screens)/workout');
        }
      });

    return () => {
      responseSubscriptionRef.current?.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
        {showTabBar && <TabBar />}
      </View>
    </QueryClientProvider>
  );
}
