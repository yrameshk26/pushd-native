import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';
import { TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY } from '../constants/config';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  sessionId: string | null; // OTP session in progress
  preAuthToken: string | null;

  // Actions
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  userId: null,
  sessionId: null,
  preAuthToken: null,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
    set({ isAuthenticated: !!token });
  },

  sendOtp: async (email: string) => {
    const { data } = await api.post('/api/auth/login', { email });
    set({ sessionId: data.sessionId });
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
    set({ isAuthenticated: false, userId: null });
  },
}));
