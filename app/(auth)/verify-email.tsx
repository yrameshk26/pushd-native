import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { api } from '../../src/api/client';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const { email = '', sessionId = '' } = useLocalSearchParams<{ email: string; sessionId: string }>();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const verifyEmail = useAuthStore((s) => s.verifyEmail);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleVerify = useCallback(async (codeToVerify: string) => {
    if (codeToVerify.length !== 6) return;
    if (!sessionId) {
      Alert.alert('Error', 'Session expired. Please register again.');
      router.replace('/(auth)/register');
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(sessionId as string, codeToVerify);
      router.replace('/(screens)/onboarding');
    } catch {
      Alert.alert('Invalid code', 'The code entered is incorrect or has expired. Please try again.');
      setCode('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }, [sessionId, verifyEmail]);

  const handleCodeChange = (value: string) => {
    const numeric = value.replace(/[^0-9]/g, '');
    setCode(numeric);
    if (numeric.length === 6) {
      handleVerify(numeric);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setResendLoading(true);
    try {
      await api.post('/api/auth/resend-verification', { email });
      startCooldown();
      Alert.alert('Code sent', `A new verification code was sent to ${email}`);
    } catch {
      Alert.alert('Error', 'Could not resend the code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.max(b.length, 3)) + c)
    : 'your email';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#718FAF" />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={40} color="#3B82F6" />
        </View>

        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.emailHighlight}>{maskedEmail}</Text>
        </Text>

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="000000"
          placeholderTextColor="#4A6080"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={handleCodeChange}
          autoFocus
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, (loading || code.length < 6) && styles.buttonDisabled]}
          onPress={() => handleVerify(code)}
          disabled={loading || code.length < 6}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify Email</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn't receive a code? </Text>
          {cooldown > 0 ? (
            <Text style={styles.cooldownText}>Resend in {cooldown}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
              {resendLoading ? (
                <ActivityIndicator color="#3B82F6" size="small" />
              ) : (
                <Text style={styles.resendLink}>Resend</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  backButton: { position: 'absolute', top: 60, left: 24, width: 40 },
  iconContainer: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#0B1326',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: '#162540',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8, fontFamily: 'BarlowCondensed-ExtraBold' },
  subtitle: { fontSize: 15, color: '#718FAF', marginBottom: 36, lineHeight: 22, fontFamily: 'DMSans-Regular' },
  emailHighlight: { color: '#fff', fontWeight: '600', fontFamily: 'DMSans-Medium' },
  input: {
    backgroundColor: '#0B1326', color: '#fff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 16, fontSize: 36,
    borderWidth: 1, borderColor: '#162540', marginBottom: 16,
    textAlign: 'center', letterSpacing: 10,
    fontFamily: 'DMSans-Regular',
  },
  button: {
    backgroundColor: '#3B82F6', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  resendRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, alignItems: 'center' },
  resendText: { color: '#718FAF', fontSize: 14, fontFamily: 'DMSans-Regular' },
  resendLink: { color: '#3B82F6', fontSize: 14, fontWeight: '600', fontFamily: 'DMSans-Medium' },
  cooldownText: { color: '#4A6080', fontSize: 14, fontWeight: '600', fontFamily: 'DMSans-Medium' },
});
