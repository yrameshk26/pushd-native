import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';
import { TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY } from '../constants/config';

export interface GoogleUserProfile {
  id: string;
  email: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  sessionId: string | null; // OTP session in progress
  preAuthToken: string | null;

  // Actions
  register: (email: string, password: string, username: string, displayName: string) => Promise<string>; // returns sessionId
  verifyEmail: (sessionId: string, code: string) => Promise<void>;
  sendOtp: (email: string, password: string) => Promise<{ next: 'otp' | 'dashboard' | 'verify-email'; sessionId?: string }>;
  verifyOtp: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  /** Authenticate immediately via Google OAuth — persists tokens and sets user state. */
  setGoogleUser: (
    user: GoogleUserProfile,
    accessToken: string,
    refreshToken: string,
  ) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  userId: null,
  email: null,
  displayName: null,
  username: null,
  avatarUrl: null,
  sessionId: null,
  preAuthToken: null,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
    set({ isAuthenticated: !!token });
  },

  register: async (email: string, password: string, username: string, displayName: string) => {
    const { data } = await api.post('/api/auth/register', { email, password, username, displayName });
    // Store sessionId in state so verifyEmail can use it if needed
    set({ sessionId: data.sessionId });
    return data.sessionId as string;
  },

  verifyEmail: async (sessionId: string, code: string) => {
    // Verify email OTP → get preAuthToken
    const { data: verifyData } = await api.post('/api/auth/verify-email', { sessionId, code });

    // Exchange preAuthToken → native token pair
    const { data: tokenData } = await api.post('/api/auth/native/token', {
      preAuthToken: verifyData.preAuthToken,
    });

    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, tokenData.access_token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, tokenData.refresh_token);

    set({ isAuthenticated: true, sessionId: null });
  },

  sendOtp: async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/pre-login', { email, password });

    // Email not verified — need to verify email first
    if (data.emailNotVerified) {
      set({ sessionId: data.sessionId });
      return { next: 'verify-email' as const, sessionId: data.sessionId };
    }

    // OTP skipped — backend issued preAuthToken directly, exchange immediately
    if (data.preAuthToken) {
      const { data: tokenData } = await api.post('/api/auth/native/token', {
        preAuthToken: data.preAuthToken,
      });
      await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, tokenData.access_token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, tokenData.refresh_token);
      set({ isAuthenticated: true, sessionId: null });
      return { next: 'dashboard' as const };
    }

    // OTP required — store sessionId for verifyOtp
    set({ sessionId: data.sessionId });
    return { next: 'otp' as const, sessionId: data.sessionId };
  },

  verifyOtp: async (code: string) => {
    const { sessionId } = get();
    if (!sessionId) throw new Error('No session');

    // Verify OTP → get preAuthToken
    const { data: otpData } = await api.post('/api/auth/verify-otp', { sessionId, code });

    // Exchange preAuthToken → native token pair
    const { data: tokenData } = await api.post('/api/auth/native/token', {
      preAuthToken: otpData.preAuthToken,
    });

    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, tokenData.access_token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, tokenData.refresh_token);

    set({ isAuthenticated: true, sessionId: null });
  },

  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY);
    if (refreshToken) {
      await api.post('/api/auth/native/revoke', { refresh_token: refreshToken }).catch(() => {});
    }
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_STORAGE_KEY);
    set({
      isAuthenticated: false,
      userId: null,
      email: null,
      displayName: null,
      username: null,
      avatarUrl: null,
    });
  },

  setGoogleUser: async (
    user: GoogleUserProfile,
    accessToken: string,
    refreshToken: string,
  ) => {
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    set({
      isAuthenticated: true,
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      sessionId: null,
      preAuthToken: null,
    });
  },
}));
