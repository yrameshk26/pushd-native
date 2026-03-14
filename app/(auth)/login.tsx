import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';
import { useGoogleAuth } from '../../src/hooks/useGoogleAuth';
import { useAppleAuth } from '../../src/hooks/useAppleAuth';
import { useBiometricStore } from '../../src/store/biometric';
import { usePasskeyAuth } from '../../src/hooks/usePasskeyAuth';
import { storage } from '../../src/utils/storage';
import { REFRESH_TOKEN_STORAGE_KEY } from '../../src/constants/config';

export default function LoginScreen() {
  const { message } = useLocalSearchParams<{ message?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasStoredSession, setHasStoredSession] = useState(false);

  const sendOtp = useAuthStore((s) => s.sendOtp);
  const loginWithBiometric = useAuthStore((s) => s.loginWithBiometric);
  const { promptAsync, loading: googleLoading, error: googleError } = useGoogleAuth();
  const { isSupported: appleSupported, loading: appleLoading, signInWithApple } = useAppleAuth();

  const { isAvailable, isEnabled, hasBeenPrompted, biometricType, hydrate, enable, markPrompted, authenticate } = useBiometricStore();
  const { loginWithPasskey, loading: passkeyLoading, error: passkeyError, isSupported: passkeySupported } = usePasskeyAuth();

  useEffect(() => {
    hydrate();
    storage.getItemAsync(REFRESH_TOKEN_STORAGE_KEY).then((t) => setHasStoredSession(!!t));
  }, []);

  // Show if device has biometrics + a previous session exists + user opted in
  const showBiometricButton = isAvailable && isEnabled && hasStoredSession;

  const promptBiometricSetup = () => {
    if (!isAvailable || hasBeenPrompted) return;
    const label = biometricType === 'face' ? 'Face ID' : 'Fingerprint';
    Alert.alert(
      `Enable ${label}?`,
      `Use ${label} to sign in faster next time.`,
      [
        { text: 'Not Now', style: 'cancel', onPress: markPrompted },
        { text: `Enable ${label}`, onPress: enable },
      ],
    );
  };

  const handleBiometricLogin = async () => {
    try {
      const label = biometricType === 'face' ? 'Face ID' : 'Touch ID / Fingerprint';
      const success = await authenticate(`Sign in with ${label}`);
      if (!success) return;

      await loginWithBiometric();
      router.replace('/(app)/dashboard');
    } catch (e: any) {
      Alert.alert('Biometric Login Failed', e?.message ?? 'Please sign in with your password.');
    }
  };

  const handlePasskeyLogin = async () => {
    try {
      await loginWithPasskey();
    } catch {
      // error is set in hook state — show if needed
    }
    if (passkeyError) {
      Alert.alert('Passkey Login Failed', passkeyError);
    }
  };

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) return;
    setLoading(true);
    try {
      const result = await sendOtp(trimmed, password);

      if (result.next === 'dashboard') {
        promptBiometricSetup();
        router.replace('/(app)/dashboard');
      } else if (result.next === 'verify-email') {
        router.push(`/(auth)/verify-email?email=${encodeURIComponent(trimmed)}&sessionId=${result.sessionId}`);
      } else {
        router.push('/(auth)/verify-otp');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Invalid email or password. Please try again.';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleError === 'Google sign-in not available') {
      Alert.alert(
        'Package Required',
        'Install expo-auth-session to enable Google sign-in:\n\nnpx expo install expo-auth-session expo-web-browser expo-crypto',
      );
      return;
    }
    await promptAsync();
    if (googleError) {
      Alert.alert('Google Sign-In Failed', googleError);
    }
  };

  const biometricIcon = biometricType === 'face' ? 'scan-outline' : 'finger-print-outline';
  const biometricLabel = biometricType === 'face' ? 'Sign in with Face ID' : 'Sign in with Touch ID';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Pushd</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {message ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{message}</Text>
          </View>
        ) : null}

        {/* Biometric login — shown when device has biometrics + stored session */}
        {showBiometricButton && (
          <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricLogin}>
            <Ionicons name={biometricIcon as any} size={22} color="#3B82F6" />
            <Text style={styles.biometricButtonText}>{biometricLabel}</Text>
          </TouchableOpacity>
        )}

        {/* Passkey login — shown when device supports passkeys */}
        {passkeySupported && (
          <TouchableOpacity
            style={[styles.passkeyButton, passkeyLoading && { opacity: 0.6 }]}
            onPress={handlePasskeyLogin}
            disabled={passkeyLoading}
          >
            {passkeyLoading ? (
              <ActivityIndicator size="small" color="#A78BFA" />
            ) : (
              <>
                <Ionicons name="key-outline" size={20} color="#A78BFA" />
                <Text style={styles.passkeyButtonText}>Sign in with Passkey</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {(showBiometricButton || passkeySupported) && (
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign in with password</Text>
            <View style={styles.dividerLine} />
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#4A6080"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
        />

        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#4A6080"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleSend}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#4A6080" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSend} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <View style={styles.googleIconCircle}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {appleSupported && (
          <TouchableOpacity
            style={[styles.appleButton, appleLoading && styles.googleButtonDisabled]}
            onPress={signInWithApple}
            disabled={appleLoading}
          >
            {appleLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={() => router.push('/(auth)/forgot-password')}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>{"Don't have an account? "}</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontSize: 40, fontWeight: '800', color: '#fff', marginBottom: 8, fontFamily: 'BarlowCondensed-ExtraBold' },
  subtitle: { fontSize: 16, color: '#718FAF', marginBottom: 32, fontFamily: 'DMSans-Regular' },
  successBanner: {
    backgroundColor: 'rgba(81,207,102,0.12)', borderRadius: 10,
    padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(81,207,102,0.3)',
  },
  successText: { color: '#51CF66', fontSize: 14, fontWeight: '500', fontFamily: 'DMSans-Medium' },

  biometricButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 14,
    paddingVertical: 18, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
    marginBottom: 12,
  },
  biometricButtonText: { color: '#3B82F6', fontSize: 16, fontWeight: '700', fontFamily: 'DMSans-Bold' },

  passkeyButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: 'rgba(167,139,250,0.1)', borderRadius: 14,
    paddingVertical: 18, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
    marginBottom: 20,
  },
  passkeyButtonText: { color: '#A78BFA', fontSize: 16, fontWeight: '700', fontFamily: 'DMSans-Bold' },

  input: {
    backgroundColor: '#0B1326', color: '#fff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#162540', marginBottom: 16,
    fontFamily: 'DMSans-Regular',
  },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0B1326', borderRadius: 12,
    borderWidth: 1, borderColor: '#162540', marginBottom: 16,
  },
  passwordInput: {
    flex: 1, color: '#fff',
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    fontFamily: 'DMSans-Regular',
  },
  eyeBtn: { paddingHorizontal: 14 },
  button: {
    backgroundColor: '#3B82F6', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#162540' },
  dividerText: { color: '#718FAF', fontSize: 13, marginHorizontal: 12, fontFamily: 'DMSans-Regular' },
  googleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0B1326', borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: '#162540', marginBottom: 4,
  },
  googleButtonDisabled: { opacity: 0.6 },
  googleIconCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  googleIconText: { color: '#4285F4', fontSize: 14, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  googleButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', fontFamily: 'DMSans-Medium' },
  appleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14,
    marginTop: 10, marginBottom: 4,
  },
  appleButtonText: { color: '#000', fontSize: 16, fontWeight: '600', fontFamily: 'DMSans-Medium' },
  forgotButton: { alignItems: 'center', marginTop: 20 },
  forgotText: { color: '#718FAF', fontSize: 15, fontFamily: 'DMSans-Regular' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  registerText: { color: '#718FAF', fontSize: 15, fontFamily: 'DMSans-Regular' },
  registerLink: { color: '#3B82F6', fontSize: 15, fontWeight: '600', fontFamily: 'DMSans-Medium' },
});
