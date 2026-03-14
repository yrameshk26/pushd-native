import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

const BIOMETRIC_ENABLED_KEY = 'pushd_biometric_enabled';
const BIOMETRIC_PROMPTED_KEY = 'pushd_biometric_prompted';

export type BiometricType = 'face' | 'fingerprint' | null;

interface BiometricStore {
  isAvailable: boolean;
  isEnabled: boolean;
  hasBeenPrompted: boolean;
  biometricType: BiometricType;
  hydrate: () => Promise<void>;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  markPrompted: () => Promise<void>;
  authenticate: (promptMessage?: string) => Promise<boolean>;
}

export const useBiometricStore = create<BiometricStore>((set) => ({
  isAvailable: false,
  isEnabled: false,
  hasBeenPrompted: false,
  biometricType: null,

  hydrate: async () => {
    if (Platform.OS === 'web') return;

    const [hasHardware, isEnrolled, types, enabled, prompted] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
      storage.getItemAsync(BIOMETRIC_ENABLED_KEY),
      storage.getItemAsync(BIOMETRIC_PROMPTED_KEY),
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

    // Opt-in model — disabled by default, only enabled if user explicitly opted in
    set({
      isAvailable,
      isEnabled: isAvailable && enabled === 'enabled',
      hasBeenPrompted: prompted === 'yes',
      biometricType,
    });
  },

  enable: async () => {
    await Promise.all([
      storage.setItemAsync(BIOMETRIC_ENABLED_KEY, 'enabled'),
      storage.setItemAsync(BIOMETRIC_PROMPTED_KEY, 'yes'),
    ]);
    set({ isEnabled: true, hasBeenPrompted: true });
  },

  disable: async () => {
    await Promise.all([
      storage.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
      storage.setItemAsync(BIOMETRIC_PROMPTED_KEY, 'yes'),
    ]);
    set({ isEnabled: false, hasBeenPrompted: true });
  },

  markPrompted: async () => {
    await storage.setItemAsync(BIOMETRIC_PROMPTED_KEY, 'yes');
    set({ hasBeenPrompted: true });
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
