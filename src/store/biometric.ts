import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

const BIOMETRIC_ENABLED_KEY = 'pushd_biometric_enabled';

export type BiometricType = 'face' | 'fingerprint' | null;

interface BiometricStore {
  isAvailable: boolean;
  isEnabled: boolean;
  biometricType: BiometricType;
  hydrate: () => Promise<void>;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  authenticate: (promptMessage?: string) => Promise<boolean>;
}

export const useBiometricStore = create<BiometricStore>((set) => ({
  isAvailable: false,
  isEnabled: false,
  biometricType: null,

  hydrate: async () => {
    if (Platform.OS === 'web') return;

    const [hasHardware, isEnrolled, types, disabled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
      // Key stores "disabled" — absence means enabled (opt-out model)
      storage.getItemAsync(BIOMETRIC_ENABLED_KEY),
    ]);

    const isAvailable = hasHardware && isEnrolled;

    let biometricType: BiometricType = null;
    if (isAvailable) {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'face';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'fingerprint';
      }
    }

    // Enabled by default — only disabled if user explicitly turned it off (stored 'disabled')
    set({ isAvailable, isEnabled: isAvailable && disabled !== 'disabled', biometricType });
  },

  enable: async () => {
    await storage.deleteItemAsync(BIOMETRIC_ENABLED_KEY); // remove 'disabled' flag
    set({ isEnabled: true });
  },

  disable: async () => {
    await storage.setItemAsync(BIOMETRIC_ENABLED_KEY, 'disabled');
    set({ isEnabled: false });
  },

  authenticate: async (promptMessage = 'Sign in to Pushd') => {
    if (Platform.OS === 'web') return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use Password',
      disableDeviceFallback: false,
    });
    return result.success;
  },
}));
