import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert('Missing field', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email: trimmed });
      setSubmitted(true);
    } catch {
      // Always show success to prevent email enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(auth)/login')}>
          <Ionicons name="arrow-back" size={24} color="#888" />
        </TouchableOpacity>

        <View style={styles.inner}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#6C63FF" />
          </View>
          <Text style={styles.title}>Check your inbox</Text>
          <Text style={styles.subtitle}>
            If an account exists for{' '}
            <Text style={styles.emailHighlight}>{email.trim().toLowerCase()}</Text>
            , you will receive a password reset link shortly.
          </Text>

          <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#888" />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed-outline" size={40} color="#6C63FF" />
        </View>

        <Text style={styles.title}>Forgot password?</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </Text>

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
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/(auth)/login')}>
          <Ionicons name="arrow-back" size={16} color="#888" style={{ marginRight: 4 }} />
          <Text style={styles.backLinkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  backButton: { position: 'absolute', top: 60, left: 24, width: 40, zIndex: 10 },
  iconContainer: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#1a1a1a',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 32, lineHeight: 22 },
  emailHighlight: { color: '#fff', fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#333', marginBottom: 16,
  },
  button: {
    backgroundColor: '#6C63FF', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  backLinkText: { color: '#888', fontSize: 15 },
});
