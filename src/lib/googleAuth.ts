// Before using this module, install the required packages:
// npx expo install expo-auth-session expo-web-browser expo-crypto
// Also ensure app.json has scheme: "pushd" (already set)

import { api } from '../api/client';

// Attempt to import expo-web-browser gracefully
let WebBrowser: typeof import('expo-web-browser') | null = null;
try {
  WebBrowser = require('expo-web-browser');
} catch {
  // expo-web-browser not installed — Google sign-in will be unavailable
}

// Complete the auth session (required for expo-web-browser on Android)
if (WebBrowser) {
  WebBrowser.maybeCompleteAuthSession();
}

export const GOOGLE_CLIENT_ID_IOS =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? '';
export const GOOGLE_CLIENT_ID_ANDROID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ?? '';
export const GOOGLE_CLIENT_ID_WEB =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ?? '';

export interface GoogleUser {
  id: string;
  email: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
}

export interface GoogleAuthResult {
  accessToken: string;
  refreshToken: string;
  user: GoogleUser;
}

/**
 * Sends the Google id_token to the backend and receives a native token pair
 * plus user profile.
 */
export async function exchangeGoogleToken(
  idToken: string,
): Promise<GoogleAuthResult> {
  const { data } = await api.post<GoogleAuthResult>(
    '/api/auth/native/google',
    { idToken },
  );
  return data;
}

export { WebBrowser };
