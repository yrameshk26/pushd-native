import { useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useAuthStore } from '../store/auth';
import {
  exchangeGoogleToken,
  GOOGLE_CLIENT_ID_IOS,
  GOOGLE_CLIENT_ID_ANDROID,
  GOOGLE_CLIENT_ID_WEB,
} from '../lib/googleAuth';
import { TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY } from '../constants/config';

// Attempt to import expo-auth-session/providers/google gracefully
let useAuthRequest:
  | typeof import('expo-auth-session').useAuthRequest
  | null = null;
let GoogleProvider: typeof import('expo-auth-session/providers/google') | null =
  null;

try {
  GoogleProvider = require('expo-auth-session/providers/google');
  useAuthRequest = require('expo-auth-session').useAuthRequest;
} catch {
  // expo-auth-session not installed
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseGoogleAuthReturn {
  promptAsync: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Hook implementation when expo-auth-session IS available
// ---------------------------------------------------------------------------

function useGoogleAuthWithPackage(): UseGoogleAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setGoogleUser = useAuthStore((s) => s.setGoogleUser);

  // useAuthRequest is always defined inside this branch
  const [, response, promptAsyncInternal] =
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    GoogleProvider!.useAuthRequest({
      iosClientId: GOOGLE_CLIENT_ID_IOS,
      androidClientId: GOOGLE_CLIENT_ID_ANDROID,
      webClientId: GOOGLE_CLIENT_ID_WEB,
    });

  const promptAsync = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await promptAsyncInternal();

      if (result.type === 'success') {
        const idToken = result.params?.id_token;

        if (!idToken) {
          throw new Error('Google did not return an id_token.');
        }

        const authResult = await exchangeGoogleToken(idToken);

        // Persist tokens
        await SecureStore.setItemAsync(
          TOKEN_STORAGE_KEY,
          authResult.accessToken,
        );
        await SecureStore.setItemAsync(
          REFRESH_TOKEN_STORAGE_KEY,
          authResult.refreshToken,
        );

        // Update auth store
        setGoogleUser(
          authResult.user,
          authResult.accessToken,
          authResult.refreshToken,
        );

        // Navigate to main app
        router.replace('/(app)/dashboard');
      } else if (result.type === 'error') {
        const msg =
          result.error?.message ?? 'Google sign-in failed. Please try again.';
        setError(msg);
      }
      // result.type === 'cancel' or 'dismiss' — do nothing
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Google sign-in encountered an unexpected error.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [promptAsyncInternal, setGoogleUser]);

  // Keep loading in sync when expo-auth-session resolves response externally
  // (e.g. deep-link redirect) — response handled above via promptAsync result.
  void response; // included for completeness; result already handled inline

  return { promptAsync, loading, error };
}

// ---------------------------------------------------------------------------
// Fallback hook when expo-auth-session is NOT installed
// ---------------------------------------------------------------------------

function useGoogleAuthFallback(): UseGoogleAuthReturn {
  const promptAsync = useCallback(async () => {
    // Caller is responsible for showing an alert when this error is set.
    // We intentionally do nothing here — the error state drives the UI.
  }, []);

  return {
    promptAsync,
    loading: false,
    error: 'Google sign-in not available',
  };
}

// ---------------------------------------------------------------------------
// Public hook — picks the right implementation at runtime
// ---------------------------------------------------------------------------

export function useGoogleAuth(): UseGoogleAuthReturn {
  if (GoogleProvider && useAuthRequest) {
    // Safe: the conditional is evaluated once at module load, not per render.
    // Both branches call the same number of React hooks, so rules-of-hooks
    // violations are avoided — each branch consistently uses its own hooks.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useGoogleAuthWithPackage();
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useGoogleAuthFallback();
}
