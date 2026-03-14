import { useEffect, useRef } from 'react';
import { Stack, router, usePathname } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Platform, View, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/store/auth';
import TabBar from '../src/components/TabBar';
import { setupNotificationHandler, registerForPushNotificationsAsync } from '../src/lib/notifications';
import { api } from '../src/api/client';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  BarlowCondensed_400Regular,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';

// Suppress Expo Go warning about push notifications not being supported
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

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

  const [fontsLoaded] = useFonts({
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-SemiBold': DMSans_600SemiBold,
    'DMSans-Bold': DMSans_700Bold,
    'BarlowCondensed-Regular': BarlowCondensed_400Regular,
    'BarlowCondensed-SemiBold': BarlowCondensed_600SemiBold,
    'BarlowCondensed-Bold': BarlowCondensed_700Bold,
    'BarlowCondensed-ExtraBold': BarlowCondensed_800ExtraBold,
  });

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

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <View style={{ flex: 1, backgroundColor: '#060C1B' }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#060C1B' } }} />
          {showTabBar && <TabBar />}
        </View>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
