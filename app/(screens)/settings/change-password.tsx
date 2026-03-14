import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../src/api/client';

function StrengthRow({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={styles.strengthRow}>
      <Ionicons name={met ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={met ? '#3B82F6' : '#4A6080'} style={{ marginRight: 6 }} />
      <Text style={[styles.strengthLabel, met && styles.strengthLabelMet]}>{label}</Text>
    </View>
  );
}

export default function ChangePasswordScreen() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nextRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const strength = {
    hasMinLength: next.length >= 8,
    hasUppercase: /[A-Z]/.test(next),
    hasLowercase: /[a-z]/.test(next),
    hasNumber: /[0-9]/.test(next),
    hasSpecial: /[^A-Za-z0-9]/.test(next),
  };
  const allRulesMet = Object.values(strength).every(Boolean);
  const score = Object.values(strength).filter(Boolean).length;

  async function handleSave() {
    setError('');
    if (!current) { setError('Enter your current password.'); return; }
    if (!allRulesMet) { setError('New password does not meet all requirements.'); return; }
    if (next !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword: current, newPassword: next });
      Alert.alert('Password changed', 'Your password has been updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Current password */}
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputFlex}
              placeholder="••••••••"
              placeholderTextColor="#4A6080"
              secureTextEntry={!showCurrent}
              value={current}
              onChangeText={setCurrent}
              autoComplete="current-password"
              returnKeyType="next"
              onSubmitEditing={() => nextRef.current?.focus()}
            />
            <TouchableOpacity onPress={() => setShowCurrent(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color="#4A6080" />
            </TouchableOpacity>
          </View>

          {/* New password */}
          <Text style={[styles.label, { marginTop: 16 }]}>New Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              ref={nextRef}
              style={styles.inputFlex}
              placeholder="••••••••"
              placeholderTextColor="#4A6080"
              secureTextEntry={!showNext}
              value={next}
              onChangeText={setNext}
              autoComplete="new-password"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <TouchableOpacity onPress={() => setShowNext(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showNext ? 'eye-off-outline' : 'eye-outline'} size={20} color="#4A6080" />
            </TouchableOpacity>
          </View>

          {/* Strength indicator */}
          {next.length > 0 && (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthBars}>
                {[0,1,2,3,4].map(i => (
                  <View key={i} style={[
                    styles.strengthSeg,
                    i < score && styles.strengthSegFilled,
                    i < score && score <= 2 && styles.segWeak,
                    i < score && score === 3 && styles.segFair,
                    i < score && score === 4 && styles.segGood,
                  ]} />
                ))}
              </View>
              <StrengthRow met={strength.hasMinLength} label="8+ characters" />
              <StrengthRow met={strength.hasUppercase} label="Uppercase letter" />
              <StrengthRow met={strength.hasLowercase} label="Lowercase letter" />
              <StrengthRow met={strength.hasNumber} label="Number" />
              <StrengthRow met={strength.hasSpecial} label="Special character" />
            </View>
          )}

          {/* Confirm password */}
          <Text style={[styles.label, { marginTop: 16 }]}>Confirm New Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              ref={confirmRef}
              style={styles.inputFlex}
              placeholder="••••••••"
              placeholderTextColor="#4A6080"
              secureTextEntry={!showConfirm}
              value={confirm}
              onChangeText={setConfirm}
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#4A6080" />
            </TouchableOpacity>
          </View>
          {confirm.length > 0 && next !== confirm && (
            <Text style={styles.matchError}>Passwords do not match</Text>
          )}

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#f87171" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, (loading || !allRulesMet || !current) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={loading || !allRulesMet || !current}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>Update Password</Text>}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#0B1326',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#fff', fontFamily: 'BarlowCondensed-Bold' },

  content: { paddingHorizontal: 20, paddingTop: 24 },

  label: { fontSize: 13, fontWeight: '600', color: '#A8BDD4', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0B1326', borderRadius: 12,
    borderWidth: 1, borderColor: '#162540',
  },
  inputFlex: { flex: 1, color: '#fff', paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: 'DMSans-Regular' },
  eyeBtn: { paddingHorizontal: 14 },

  strengthWrap: { marginTop: 10, marginBottom: 4 },
  strengthBars: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  strengthSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#162540' },
  strengthSegFilled: { backgroundColor: '#3B82F6' },
  segWeak: { backgroundColor: '#f87171' },
  segFair: { backgroundColor: '#fb923c' },
  segGood: { backgroundColor: '#4ade80' },
  strengthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  strengthLabel: { fontSize: 13, color: '#4A6080' },
  strengthLabelMet: { color: '#A8BDD4' },

  matchError: { color: '#f87171', fontSize: 13, marginTop: 6 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    padding: 12, marginTop: 16,
  },
  errorText: { color: '#f87171', fontSize: 13, flex: 1 },

  saveBtn: {
    backgroundColor: '#3B82F6', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 28,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'DMSans-Bold' },
});
