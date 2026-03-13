import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';

export default function VerifyOtpScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      await verifyOtp(code);
      router.replace('/(app)/dashboard');
    } catch {
      Alert.alert('Invalid code', 'Please check the code and try again.');
      setCode('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code we sent you</Text>

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="000000"
          placeholderTextColor="#4A6080"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={(v) => { setCode(v); if (v.length === 6) handleVerify(); }}
          autoFocus
        />

        <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading || code.length < 6}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8, fontFamily: 'BarlowCondensed-ExtraBold' },
  subtitle: { fontSize: 16, color: '#718FAF', marginBottom: 40, fontFamily: 'DMSans-Regular' },
  input: {
    backgroundColor: '#0B1326', color: '#fff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 32,
    borderWidth: 1, borderColor: '#162540', marginBottom: 16,
    textAlign: 'center', letterSpacing: 8,
    fontFamily: 'DMSans-Regular',
  },
  button: {
    backgroundColor: '#3B82F6', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  back: { marginTop: 24, alignItems: 'center' },
  backText: { color: '#718FAF', fontSize: 15, fontFamily: 'DMSans-Regular' },
});
