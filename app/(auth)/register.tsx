import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { useGoogleAuth } from '../../src/hooks/useGoogleAuth';

interface PasswordStrength {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

function checkPasswordStrength(password: string): PasswordStrength {
  return {
    hasMinLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

function StrengthRow({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={strengthStyles.row}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={14}
        color={met ? '#6C63FF' : '#555'}
        style={{ marginRight: 6 }}
      />
      <Text style={[strengthStyles.label, met && strengthStyles.labelMet]}>{label}</Text>
    </View>
  );
}

function StrengthBar({ strength }: { strength: PasswordStrength }) {
  const rules = Object.values(strength);
  const score = rules.filter(Boolean).length;

  return (
    <View style={strengthStyles.container}>
      <View style={strengthStyles.bars}>
        {rules.map((_, i) => (
          <View
            key={i}
            style={[
              strengthStyles.segment,
              i < score && strengthStyles.segmentFilled,
              i < score && score <= 2 && strengthStyles.segmentWeak,
              i < score && score === 3 && strengthStyles.segmentFair,
              i < score && score === 4 && strengthStyles.segmentGood,
            ]}
          />
        ))}
      </View>
      <StrengthRow met={strength.hasMinLength} label="8+ characters" />
      <StrengthRow met={strength.hasUppercase} label="Uppercase letter" />
      <StrengthRow met={strength.hasLowercase} label="Lowercase letter" />
      <StrengthRow met={strength.hasNumber} label="Number" />
      <StrengthRow met={strength.hasSpecial} label="Special character" />
    </View>
  );
}

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const displayNameRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const register = useAuthStore((s) => s.register);
  const { promptAsync, loading: googleLoading, error: googleError } = useGoogleAuth();
  const strength = checkPasswordStrength(password);
  const allRulesMet = Object.values(strength).every(Boolean);

  const handleGoogleSignUp = async () => {
    if (googleError === 'Google sign-in not available') {
      Alert.alert(
        'Package Required',
        'Install expo-auth-session to enable Google sign-up:\n\nnpx expo install expo-auth-session expo-web-browser expo-crypto',
      );
      return;
    }
    await promptAsync();
    if (googleError) {
      Alert.alert('Google Sign-Up Failed', googleError);
    }
  };

  const handleRegister = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = displayName.trim();
    const trimmedUsername = username.trim().toLowerCase();

    if (!trimmedEmail || !trimmedName || !trimmedUsername) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      Alert.alert('Invalid username', 'Username can only contain letters, numbers and underscores.');
      return;
    }
    if (!allRulesMet) {
      Alert.alert('Weak password', 'Your password does not meet all requirements.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please make sure both passwords are the same.');
      return;
    }

    setLoading(true);
    try {
      const sessionId = await register(trimmedEmail, password, trimmedUsername, trimmedName);
      router.push({ pathname: '/(auth)/verify-email', params: { email: trimmedEmail, sessionId } });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Registration failed. Please try again.';
      Alert.alert('Registration failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#888" />
        </TouchableOpacity>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Sign up to start training smarter</Text>

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#555"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
          onSubmitEditing={() => displayNameRef.current?.focus()}
        />

        {/* Display Name */}
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          ref={displayNameRef}
          style={styles.input}
          placeholder="John Doe"
          placeholderTextColor="#555"
          autoCapitalize="words"
          value={displayName}
          onChangeText={setDisplayName}
          returnKeyType="next"
          onSubmitEditing={() => usernameRef.current?.focus()}
        />

        {/* Username */}
        <Text style={styles.label}>Username</Text>
        <TextInput
          ref={usernameRef}
          style={styles.input}
          placeholder="johndoe"
          placeholderTextColor="#555"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputRow}>
          <TextInput
            ref={passwordRef}
            style={styles.inputFlex}
            placeholder="••••••••"
            placeholderTextColor="#555"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            autoComplete="new-password"
          />
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#555" />
          </TouchableOpacity>
        </View>

        {password.length > 0 && <StrengthBar strength={strength} />}

        {/* Confirm Password */}
        <Text style={[styles.label, { marginTop: 16 }]}>Confirm Password</Text>
        <View style={styles.inputRow}>
          <TextInput
            ref={confirmRef}
            style={styles.inputFlex}
            placeholder="••••••••"
            placeholderTextColor="#555"
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
            autoComplete="new-password"
          />
          <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} style={styles.eyeButton}>
            <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color="#555" />
          </TouchableOpacity>
        </View>
        {confirmPassword.length > 0 && password !== confirmPassword && (
          <Text style={styles.errorText}>Passwords do not match</Text>
        )}

        <TouchableOpacity
          style={[styles.button, (!allRulesMet || loading) && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading || !allRulesMet}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Sign-Up */}
        <TouchableOpacity
          style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
          onPress={handleGoogleSignUp}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <View style={styles.googleIconCircle}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Sign up with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.loginLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  backButton: { marginBottom: 32, width: 40 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#888', marginBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#333', marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a', borderRadius: 12,
    borderWidth: 1, borderColor: '#333', marginBottom: 8,
  },
  inputFlex: {
    flex: 1, color: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16,
  },
  eyeButton: { paddingHorizontal: 14, paddingVertical: 14 },
  errorText: { color: '#FF6B6B', fontSize: 13, marginBottom: 12 },
  button: {
    backgroundColor: '#6C63FF', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  buttonDisabled: { opacity: 0.5 },
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
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText: { color: '#888', fontSize: 15 },
  loginLink: { color: '#6C63FF', fontSize: 15, fontWeight: '600' },
});

const strengthStyles = StyleSheet.create({
  container: { marginBottom: 4 },
  bars: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  segment: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: '#2a2a2a',
  },
  segmentFilled: { backgroundColor: '#6C63FF' },
  segmentWeak: { backgroundColor: '#FF6B6B' },
  segmentFair: { backgroundColor: '#FFB347' },
  segmentGood: { backgroundColor: '#51CF66' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 13, color: '#555' },
  labelMet: { color: '#aaa' },
});
