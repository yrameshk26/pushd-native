import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';

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

export default function ResetPasswordScreen() {
  const { token = '' } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const confirmRef = useRef<TextInput>(null);

  const strength = checkPasswordStrength(password);
  const allRulesMet = Object.values(strength).every(Boolean);

  const handleReset = async () => {
    if (!token) {
      Alert.alert('Invalid link', 'This password reset link is invalid or has expired.');
      router.replace('/(auth)/forgot-password');
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
      await api.post('/api/auth/reset-password', { token, password });
      router.replace({
        pathname: '/(auth)/login',
        params: { message: 'Password reset successfully. Please sign in.' },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Could not reset password. The link may have expired.';
      Alert.alert('Reset failed', message);
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(auth)/login')}>
          <Ionicons name="arrow-back" size={24} color="#888" />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark-outline" size={40} color="#6C63FF" />
        </View>

        <Text style={styles.title}>Set new password</Text>
        <Text style={styles.subtitle}>
          Choose a strong password for your account.
        </Text>

        {/* New Password */}
        <Text style={styles.label}>New Password</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputFlex}
            placeholder="••••••••"
            placeholderTextColor="#555"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            autoComplete="new-password"
            autoFocus
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
            onSubmitEditing={handleReset}
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
          onPress={handleReset}
          disabled={loading || !allRulesMet}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.backLinkText}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  backButton: { marginBottom: 32, width: 40 },
  iconContainer: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#1a1a1a',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 32, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a', borderRadius: 12,
    borderWidth: 1, borderColor: '#333', marginBottom: 8,
  },
  inputFlex: {
    flex: 1, color: '#fff', paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
  },
  eyeButton: { paddingHorizontal: 14, paddingVertical: 14 },
  errorText: { color: '#FF6B6B', fontSize: 13, marginBottom: 12 },
  button: {
    backgroundColor: '#6C63FF', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backLink: { alignItems: 'center', marginTop: 24 },
  backLinkText: { color: '#888', fontSize: 15 },
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
