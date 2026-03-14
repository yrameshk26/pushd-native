import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Passkey from 'react-native-passkeys';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

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

  const isSupported = Platform.OS !== 'web' && Passkey.isSupported();

  const loginWithPasskey = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data: options } = await api.post('/api/auth/passkey/login/options', {});
      const { sessionId, ...authOptions } = options as { sessionId: string; [k: string]: unknown };

      const credential = await Passkey.get(authOptions as Parameters<typeof Passkey.get>[0]);
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
      const { data: options } = await api.post('/api/auth/passkey/native/register/options', {});

      const credential = await Passkey.create(options as Parameters<typeof Passkey.create>[0]);
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
