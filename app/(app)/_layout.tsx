import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { api } from '../../src/api/client';
import { useSubscriptionStore } from '../../src/store/subscription';

export default function AppLayout() {
  const fetchTier = useSubscriptionStore((s) => s.fetchTier);

  useEffect(() => {
    api.get('/api/users/me').then(({ data }) => {
      if (!data?.data?.onboardingCompleted) {
        router.replace('/(screens)/onboarding');
      }
    }).catch(() => {});

    // Fetch subscription tier in background
    fetchTier();
  }, [fetchTier]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
