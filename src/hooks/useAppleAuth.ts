import { Platform } from 'react-native';
import { useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';
import { storage } from '../utils/storage';
import { TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY } from '../constants/config';
import { router } from 'expo-router';

// Lazy-load so the module doesn't crash in Expo Go
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AppleAuthentication = require('expo-apple-authentication');
} catch {
  // Not available in Expo Go
}

interface UseAppleAuthReturn {
  isSupported: boolean;
  loading: boolean;
  error: string | null;
  signInWithApple: () => Promise<void>;
}

export function useAppleAuth(): UseAppleAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuthenticated = useAuthStore((s) => s.loginWithPasskey); // reuse token-store helper

  const isSupported =
    Platform.OS === 'ios' &&
    !!AppleAuthentication &&
    typeof AppleAuthentication.isAvailableAsync === 'function';

  const signInWithApple = async () => {
    if (!AppleAuthentication || !isSupported) {
      setError('Apple Sign-In is not available on this device.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, fullName } = credential;
      if (!identityToken) throw new Error('No identity token returned from Apple.');

      const displayName =
        fullName?.givenName && fullName?.familyName
          ? `${fullName.givenName} ${fullName.familyName}`
          : fullName?.givenName ?? null;

      const { data } = await api.post('/api/auth/native/apple', {
        identityToken,
        displayName,
      });

      await storage.setItemAsync(TOKEN_STORAGE_KEY, data.accessToken);
      await storage.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, data.refreshToken);
      await setAuthenticated(data.accessToken, data.refreshToken);
      router.replace('/(app)/dashboard');
    } catch (e: any) {
      // ERR_CANCELED means the user dismissed the sheet — not an error
      if (e?.code === 'ERR_CANCELED') {
        setLoading(false);
        return;
      }
      const msg = e?.response?.data?.error ?? e?.message ?? 'Apple Sign-In failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return { isSupported, loading, error, signInWithApple };
}
