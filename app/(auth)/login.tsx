import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';
import { useGoogleAuth } from '../../src/hooks/useGoogleAuth';

export default function LoginScreen() {
  const { message } = useLocalSearchParams<{ message?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const { promptAsync, loading: googleLoading, error: googleError } = useGoogleAuth();

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) return;
    setLoading(true);
    try {
      await sendOtp(trimmed, password);
      router.push('/(auth)/verify-otp');
    } catch {
      Alert.alert('Error', 'Invalid email or password. Please try again.');
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

        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleSend}
          returnKeyType="done"
        />

        <TouchableOpacity style={styles.button} onPress={handleSend} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Sign-In */}
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

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={() => router.push('/(auth)/forgot-password')}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontSize: 40, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#888', marginBottom: 32 },
  successBanner: {
    backgroundColor: 'rgba(81,207,102,0.12)', borderRadius: 10,
    padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(81,207,102,0.3)',
  },
  successText: { color: '#51CF66', fontSize: 14, fontWeight: '500' },
  input: {
    backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#333', marginBottom: 16,
  },
  button: {
    backgroundColor: '#6C63FF', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#333' },
  dividerText: { color: '#555', fontSize: 14, marginHorizontal: 12 },
  googleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1a1a1a', borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: '#333', marginBottom: 4,
  },
  googleButtonDisabled: { opacity: 0.6 },
  googleIconCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  googleIconText: { color: '#4285F4', fontSize: 14, fontWeight: '700' },
  googleButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  forgotButton: { alignItems: 'center', marginTop: 20 },
  forgotText: { color: '#888', fontSize: 15 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  registerText: { color: '#888', fontSize: 15 },
  registerLink: { color: '#6C63FF', fontSize: 15, fontWeight: '600' },
});
