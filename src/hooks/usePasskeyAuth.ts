import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

// Attempt to load react-native-passkeys gracefully — requires a dev build.
// In Expo Go the native module is missing, so we fall back to unavailable.
type PasskeyModule = typeof import('react-native-passkeys');
let PasskeyLib: PasskeyModule | null = null;
try {
  PasskeyLib = require('react-native-passkeys');
} catch {
  // native module not available (Expo Go or old build)
}

export interface UsePasskeyAuthReturn {
  loginWithPasskey: () => Promise<void>;
  registerPasskey: (name?: string) => Promise<{ id: string; name: string }>;
  loading: boolean;
  error: string | null;
  isSupported: boolean;
}

export function usePasskeyAuth(): UsePasskeyAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginWithPasskeyStore = useAuthStore((s) => s.loginWithPasskey);

  const isSupported = Platform.OS !== 'web' && !!PasskeyLib && PasskeyLib.isSupported();

  const loginWithPasskey = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (!PasskeyLib) throw new Error('Passkeys require a development build.');

      const { data: options } = await api.post('/api/auth/passkey/login/options', {});
      const { sessionId, ...authOptions } = options as { sessionId: string; [k: string]: unknown };

      const credential = await PasskeyLib.get(authOptions as Parameters<typeof PasskeyLib.get>[0]);
      if (!credential) throw new Error('Passkey authentication was cancelled.');

      const { data } = await api.post('/api/auth/passkey/native/login/verify', {
        sessionId,
        credential,
      });

      await loginWithPasskeyStore(data.access_token, data.refresh_token);
      router.replace('/(app)/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err instanceof Error ? err.message : 'Passkey login failed.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loginWithPasskeyStore]);

  const registerPasskey = useCallback(async (name?: string) => {
    setError(null);
    setLoading(true);
    try {
      if (!PasskeyLib) throw new Error('Passkeys require a development build.');

      const { data: options } = await api.post('/api/auth/passkey/native/register/options', {});

      const credential = await PasskeyLib.create(options as Parameters<typeof PasskeyLib.create>[0]);
      if (!credential) throw new Error('Passkey registration was cancelled.');

      const deviceName = name ?? (Platform.OS === 'ios' ? 'iPhone / Face ID' : 'Android Fingerprint');
      const { data } = await api.post('/api/auth/passkey/native/register/verify', {
        name: deviceName,
        credential,
      });

      return data as { id: string; name: string };
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err instanceof Error ? err.message : 'Passkey registration failed.');
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loginWithPasskey, registerPasskey, loading, error, isSupported };
}
