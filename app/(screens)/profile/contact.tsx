import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { api } from '../../../src/api/client';
import { useQuery } from '@tanstack/react-query';

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECTS = [
  { value: 'general',  label: 'General Enquiry' },
  { value: 'bug',      label: 'Bug Report' },
  { value: 'security', label: 'Security Issue' },
  { value: 'account',  label: 'Account Help' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'other',    label: 'Other' },
] as const;

type SubjectValue = (typeof SUBJECTS)[number]['value'];

const VALID_SUBJECTS = SUBJECTS.map((s) => s.value) as string[];

const QUICK_SUBJECTS: { emoji: string; label: string; value: SubjectValue }[] = [
  { emoji: '🐛', label: 'Bug Report',     value: 'bug' },
  { emoji: '🔒', label: 'Security Issue', value: 'security' },
  { emoji: '💬', label: 'Feedback',       value: 'feedback' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ContactScreen() {
  const { subject: subjectParam } = useLocalSearchParams<{ subject?: string }>();
  const initialSubject: SubjectValue =
    subjectParam && VALID_SUBJECTS.includes(subjectParam)
      ? (subjectParam as SubjectValue)
      : 'general';

  // Pre-fill email from profile
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/api/users/me');
      return data?.data ?? data;
    },
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [subject, setSubject] = useState<SubjectValue>(initialSubject);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Sync email once profile loads
  if (profile?.email && !email) setEmail(profile.email);

  async function handleSubmit() {
    setError('');
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (message.trim().length < 10) { setError('Message must be at least 10 characters.'); return; }

    setIsLoading(true);
    try {
      await api.post('/api/contact', { name: name.trim(), email: email.trim(), subject, message: message.trim() });
      setSuccess(true);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────────────

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Us</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={48} color="#4ade80" />
          </View>
          <Text style={styles.successHeading}>Message sent!</Text>
          <Text style={styles.successBody}>
            We've received your message and will get back to you within 1–2 business days. Check your inbox for a confirmation.
          </Text>
          <TouchableOpacity
            style={styles.anotherBtn}
            onPress={() => { setSuccess(false); setName(''); setMessage(''); setSubject('general'); }}
          >
            <Text style={styles.anotherBtnText}>Send another message</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Back to Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={styles.heroWrap}>
            <View style={styles.heroIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color="#60a5fa" />
            </View>
            <Text style={styles.heroText}>
              Have a question, found a bug, or want to report a security concern? We read every message and respond within 1–2 business days.
            </Text>
          </View>

          {/* Quick subject chips */}
          <View style={styles.quickRow}>
            {QUICK_SUBJECTS.map((q) => (
              <TouchableOpacity
                key={q.value}
                style={[styles.quickChip, subject === q.value && styles.quickChipActive]}
                onPress={() => setSubject(q.value)}
              >
                <Text style={styles.quickEmoji}>{q.emoji}</Text>
                <Text style={[styles.quickLabel, subject === q.value && styles.quickLabelActive]}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Your name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="John Smith"
              placeholderTextColor="#4A6080"
              maxLength={100}
              returnKeyType="next"
            />
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#4A6080"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Subject */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Subject</Text>
            <View style={styles.subjectList}>
              {SUBJECTS.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.subjectOption, subject === s.value && styles.subjectOptionActive]}
                  onPress={() => setSubject(s.value)}
                >
                  <Text style={[styles.subjectOptionText, subject === s.value && styles.subjectOptionTextActive]}>
                    {s.label}
                  </Text>
                  {subject === s.value && <Ionicons name="checkmark" size={14} color="#60a5fa" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Message */}
          <View style={styles.field}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Message</Text>
              <Text style={styles.charCount}>{message.length}/2000</Text>
            </View>
            <TextInput
              style={styles.textarea}
              value={message}
              onChangeText={(t) => setMessage(t.slice(0, 2000))}
              placeholder="Describe your issue or question in detail…"
              placeholderTextColor="#4A6080"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              returnKeyType="default"
            />
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#f87171" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Send Message</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Security note */}
          <Text style={styles.securityNote}>
            For security vulnerabilities, select <Text style={styles.securityNoteHighlight}>Security Issue</Text> above and we'll prioritise it.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#0B1326',
  },
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 18, fontWeight: '700', color: '#fff',
    fontFamily: 'BarlowCondensed-Bold',
  },

  content: { paddingHorizontal: 20, paddingTop: 24 },

  heroWrap: { alignItems: 'center', marginBottom: 24, gap: 12 },
  heroIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroText: { color: '#718FAF', fontSize: 13, lineHeight: 20, textAlign: 'center' },

  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  quickChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 14, borderWidth: 1, borderColor: '#162540',
    backgroundColor: '#0B1326', gap: 4,
  },
  quickChipActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)' },
  quickEmoji: { fontSize: 20 },
  quickLabel: { fontSize: 11, color: '#718FAF', fontWeight: '600', textAlign: 'center' },
  quickLabelActive: { color: '#60a5fa' },

  field: { marginBottom: 18 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#A8BDD4', marginBottom: 8 },
  charCount: { fontSize: 11, color: '#718FAF' },

  input: {
    backgroundColor: '#0B1326', borderRadius: 12,
    borderWidth: 1, borderColor: '#162540',
    paddingHorizontal: 14, paddingVertical: 13,
    color: '#fff', fontSize: 15,
  },
  textarea: {
    backgroundColor: '#0B1326', borderRadius: 12,
    borderWidth: 1, borderColor: '#162540',
    paddingHorizontal: 14, paddingVertical: 13,
    color: '#fff', fontSize: 15, minHeight: 130,
  },

  subjectList: {
    backgroundColor: '#0B1326', borderRadius: 12,
    borderWidth: 1, borderColor: '#162540', overflow: 'hidden',
  },
  subjectOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#162540',
  },
  subjectOptionActive: { backgroundColor: 'rgba(59,130,246,0.08)' },
  subjectOptionText: { fontSize: 15, color: '#718FAF' },
  subjectOptionTextActive: { color: '#fff', fontWeight: '600' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    padding: 12, marginBottom: 16,
  },
  errorText: { color: '#f87171', fontSize: 13, flex: 1 },

  submitBtn: {
    backgroundColor: '#3B82F6', borderRadius: 14,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: 16,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'DMSans-Bold' },

  securityNote: { color: '#4A6080', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  securityNoteHighlight: { color: '#718FAF' },

  // Success
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  successHeading: { color: '#fff', fontSize: 26, fontWeight: '800', fontFamily: 'BarlowCondensed-Bold' },
  successBody: { color: '#718FAF', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  anotherBtn: {
    marginTop: 8, backgroundColor: '#3B82F6', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center',
  },
  anotherBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  backLink: { color: '#4A6080', fontSize: 14, marginTop: 4 },
});
