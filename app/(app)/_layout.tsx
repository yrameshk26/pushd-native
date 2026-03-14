import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { api } from '../../src/api/client';

export default function AppLayout() {
  useEffect(() => {
    api.get('/api/users/me').then(({ data }) => {
      if (!data?.data?.onboardingCompleted) {
        router.replace('/(screens)/onboarding');
      }
    }).catch(() => {
      // Network error — don't block the user
    });
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
