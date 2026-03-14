import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api/client';
import { storage } from '../../../src/utils/storage';
import { TOKEN_STORAGE_KEY } from '../../../src/constants/config';
import { useBiometricStore } from '../../../src/store/biometric';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  deviceName: string;
  deviceType: string;
  ip: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

interface Passkey {
  id: string;
  name: string;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  createdAt: string;
}

interface SessionsResponse {
  sessions: Session[];
  lastLoginAt?: string;
  lastLoginIp?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function deviceIcon(type: string): string {
  const t = type?.toLowerCase() ?? '';
  if (t.includes('iphone') || t.includes('android') || t.includes('mobile') || t.includes('phone')) return 'phone-portrait-outline';
  if (t.includes('tablet') || t.includes('ipad')) return 'tablet-portrait-outline';
  return 'laptop-outline';
}

function getDefaultPasskeyName(): string {
  if (Platform.OS === 'ios') return 'iPhone / Face ID';
  if (Platform.OS === 'android') return 'Android Fingerprint';
  if (Platform.OS === 'web') {
    const ua = navigator.userAgent;
    if (/iPhone|iPad/i.test(ua)) return 'iPhone / Face ID';
    if (/Android/i.test(ua)) return 'Android Fingerprint';
    if (/Mac/i.test(ua)) return 'Mac Touch ID';
    if (/Windows/i.test(ua)) return 'Windows Hello';
  }
  return 'Passkey';
}

// ─── Biometric Section ────────────────────────────────────────────────────────

function BiometricSection() {
  const { isAvailable, isEnabled, biometricType, hydrate, enable, disable, authenticate } = useBiometricStore();

  useEffect(() => { hydrate(); }, []);

  if (Platform.OS === 'web' || !isAvailable) return null;

  const label = biometricType === 'face' ? 'Face ID' : 'Touch ID / Fingerprint';
  const icon = biometricType === 'face' ? 'scan-outline' : 'finger-print-outline';

  async function handleToggle() {
    if (isEnabled) {
      Alert.alert(`Disable ${label}?`, `You will need to use your password to sign in.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: () => disable() },
      ]);
    } else {
      const success = await authenticate(`Confirm ${label} to enable`);
      if (success) {
        await enable();
        Alert.alert('Enabled', `${label} login is now active.`);
      }
    }
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.biometricRow} onPress={handleToggle} activeOpacity={0.7}>
        <View style={styles.biometricIconWrap}>
          <Ionicons name={icon as any} size={20} color="#3B82F6" />
        </View>
        <View style={styles.biometricTextGroup}>
          <Text style={styles.biometricLabel}>{label}</Text>
          <Text style={styles.biometricSub}>
            {isEnabled ? 'Tap to disable biometric login' : `Use ${label} to sign in faster`}
          </Text>
        </View>
        <View style={[styles.togglePill, isEnabled && styles.togglePillOn]}>
          <View style={[styles.toggleThumb, isEnabled && styles.toggleThumbOn]} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Sessions Section ────────────────────────────────────────────────────────

function SessionsSection() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<SessionsResponse>({
    queryKey: ['auth-sessions'],
    queryFn: async () => {
      const { data } = await api.get('/api/auth/sessions');
      return data?.data ?? data;
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (sessionId: string) => { await api.delete(`/api/auth/sessions/${sessionId}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth-sessions'] }),
    onError: () => Alert.alert('Error', 'Failed to revoke session.'),
  });

  const revokeAllMutation = useMutation({
    mutationFn: async () => { await api.delete('/api/auth/sessions'); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
      Alert.alert('Done', 'All other sessions have been signed out.');
    },
    onError: () => Alert.alert('Error', 'Failed to sign out other sessions.'),
  });

  function handleRevoke(sessionId: string) {
    Alert.alert('Revoke Session', 'Sign out this session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => revokeMutation.mutate(sessionId) },
    ]);
  }

  function handleRevokeAll() {
    Alert.alert('Sign Out All Other Sessions', 'This will sign you out from all devices except this one.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out All', style: 'destructive', onPress: () => revokeAllMutation.mutate() },
    ]);
  }

  if (isLoading) return <View style={styles.card}><ActivityIndicator color="#3B82F6" style={{ margin: 20 }} /></View>;
  if (isError) return <View style={styles.card}><Text style={styles.errorText}>Failed to load sessions</Text></View>;

  const sessions = data?.sessions ?? [];
  const others = sessions.filter((s) => !s.isCurrent);

  return (
    <>
      <View style={styles.card}>
        {sessions.length === 0 ? (
          <Text style={styles.emptyText}>No active sessions found</Text>
        ) : (
          sessions.map((session, index) => (
            <React.Fragment key={session.id}>
              {index > 0 && <View style={styles.sep} />}
              <View style={styles.sessionRow}>
                <View style={styles.sessionIconWrap}>
                  <Ionicons name={deviceIcon(session.deviceType) as never} size={18} color="#718FAF" />
                </View>
                <View style={styles.sessionInfo}>
                  <View style={styles.sessionNameRow}>
                    <Text style={styles.sessionDevice} numberOfLines={1}>{session.deviceName || 'Unknown Device'}</Text>
                    {session.isCurrent && <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>Current</Text></View>}
                  </View>
                  <Text style={styles.sessionMeta}>{session.ip ? `${session.ip} · ` : ''}{formatDate(session.lastActiveAt)}</Text>
                </View>
                {!session.isCurrent && (
                  <TouchableOpacity
                    style={[styles.revokeBtn, revokeMutation.isPending && styles.revokeBtnDisabled]}
                    onPress={() => handleRevoke(session.id)}
                    disabled={revokeMutation.isPending}
                  >
                    {revokeMutation.isPending
                      ? <ActivityIndicator size="small" color="#ef4444" />
                      : <Text style={styles.revokeBtnText}>Revoke</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </React.Fragment>
          ))
        )}
      </View>

      {others.length > 0 && (
        <TouchableOpacity
          style={[styles.revokeAllBtn, revokeAllMutation.isPending && { opacity: 0.5 }]}
          onPress={handleRevokeAll}
          disabled={revokeAllMutation.isPending}
        >
          {revokeAllMutation.isPending
            ? <ActivityIndicator size="small" color="#ef4444" />
            : <><Ionicons name="log-out-outline" size={16} color="#ef4444" /><Text style={styles.revokeAllBtnText}>Sign out all other sessions</Text></>}
        </TouchableOpacity>
      )}

      {(data?.lastLoginAt || data?.lastLoginIp) && (
        <View style={[styles.card, { marginTop: 10 }]}>
          <View style={styles.activityRow}>
            <Ionicons name="time-outline" size={16} color="#718FAF" style={{ marginRight: 10, marginTop: 2 }} />
            <View>
              <Text style={styles.activityLabel}>Account Activity</Text>
              {data?.lastLoginAt && <Text style={styles.activityValue}>Last login: {formatDate(data.lastLoginAt)}</Text>}
              {data?.lastLoginIp && <Text style={styles.activityValue}>From: {data.lastLoginIp}</Text>}
            </View>
          </View>
        </View>
      )}
    </>
  );
}

// ─── Passkeys Section ─────────────────────────────────────────────────────────

function PasskeysSection() {
  const queryClient = useQueryClient();
  const [showNameInput, setShowNameInput] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: passkeys, isLoading, isError, refetch } = useQuery<Passkey[]>({
    queryKey: ['passkeys'],
    queryFn: async () => {
      const { data } = await api.get('/api/auth/passkey/list');
      return data?.data ?? data ?? [];
    },
  });

  const handleDelete = useCallback(async (id: string, name: string) => {
    Alert.alert('Delete Passkey', `Remove "${name}"? You will no longer be able to use it to sign in.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try {
            await api.delete('/api/auth/passkey/delete', { data: { id } });
            queryClient.invalidateQueries({ queryKey: ['passkeys'] });
          } catch {
            Alert.alert('Error', 'Failed to delete passkey.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  }, [queryClient]);

  async function handleRegister() {
    if (Platform.OS !== 'web') {
      Linking.openURL('https://pushd.fit/profile/settings');
      return;
    }

    setRegistering(true);
    setRegisterError('');
    setRegisterSuccess('');

    try {
      // Get registration options from server
      const optRes = await fetch(`${api.defaults.baseURL}/api/auth/passkey/register/options`, {
        method: 'POST',
        headers: await (async () => {
          const token = await storage.getItemAsync(TOKEN_STORAGE_KEY);
          return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
        })(),
      });
      if (!optRes.ok) { setRegisterError('Failed to start registration'); return; }
      const options = await optRes.json();

      // Dynamically import to avoid bundling on native
      const { startRegistration } = await import('@simplewebauthn/browser');

      let credential;
      try {
        credential = await startRegistration(options);
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        if (msg.includes('excludeCredentials') || msg.includes('already registered')) {
          setRegisterError('This device is already registered');
        } else if (msg.includes('cancelled') || msg.includes('NotAllowedError')) {
          setRegisterError('Setup cancelled');
        } else {
          setRegisterError(msg || 'Biometric setup failed');
        }
        return;
      }

      const name = newKeyName.trim() || getDefaultPasskeyName();
      const verifyRes = await fetch(`${api.defaults.baseURL}/api/auth/passkey/register/verify`, {
        method: 'POST',
        headers: await (async () => {
          const token = await storage.getItemAsync(TOKEN_STORAGE_KEY);
          return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
        })(),
        body: JSON.stringify({ name, credential }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) { setRegisterError(verifyData.error ?? 'Registration failed'); return; }

      setRegisterSuccess(`"${name}" registered successfully!`);
      setNewKeyName('');
      setShowNameInput(false);
      refetch();
    } finally {
      setRegistering(false);
    }
  }

  const keys = passkeys ?? [];

  return (
    <>
      {/* Info card */}
      <View style={styles.infoBanner}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#60a5fa" style={{ marginTop: 1 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoBannerTitle}>Passkeys (Biometrics)</Text>
          <Text style={styles.infoBannerText}>
            Log in with Face ID, Touch ID, or fingerprint — no password needed. Passkeys are phishing-resistant and stored securely on your device.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        {/* Header */}
        <View style={styles.passkeyHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="finger-print-outline" size={18} color="#60a5fa" />
            <Text style={styles.passkeyHeaderTitle}>Registered Passkeys</Text>
          </View>
          <TouchableOpacity onPress={() => { setShowNameInput((v) => !v); setRegisterError(''); setRegisterSuccess(''); }}>
            <View style={styles.addPasskeyBtn}>
              <Ionicons name="add" size={15} color="#60a5fa" />
              <Text style={styles.addPasskeyText}>Add</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Native: show inline notice with link instead of form */}
        {showNameInput && Platform.OS !== 'web' && (
          <>
            <View style={styles.sep} />
            <View style={styles.nativePasskeyNotice}>
              <Ionicons name="information-circle-outline" size={18} color="#60a5fa" style={{ marginTop: 1 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={styles.nativePasskeyNoticeText}>
                  Passkey registration requires your web browser. Tap below to open the web app and register your biometric.
                </Text>
                <TouchableOpacity style={styles.openWebBtn} onPress={() => Linking.openURL('https://pushd.fit/profile/settings')}>
                  <Ionicons name="open-outline" size={14} color="#fff" />
                  <Text style={styles.openWebBtnText}>Open pushd.fit to register</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Add passkey form (web only) */}
        {showNameInput && Platform.OS === 'web' && (
          <>
            <View style={styles.sep} />
            <View style={styles.addPasskeyForm}>
              <TextInput
                style={styles.passkeyNameInput}
                value={newKeyName}
                onChangeText={setNewKeyName}
                placeholder={`Name (e.g. "${getDefaultPasskeyName()}")`}
                placeholderTextColor="#718FAF"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.registerBtn, registering && { opacity: 0.6 }]}
                onPress={handleRegister}
                disabled={registering}
              >
                {registering
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Ionicons name="finger-print-outline" size={16} color="#fff" /><Text style={styles.registerBtnText}>Set Up Biometric Login</Text></>}
              </TouchableOpacity>
              {registerError ? <Text style={styles.registerError}>{registerError}</Text> : null}
              {registerSuccess ? <Text style={styles.registerSuccess}>{registerSuccess}</Text> : null}
            </View>
          </>
        )}

        <View style={styles.sep} />

        {/* Passkey list */}
        {isLoading ? (
          <ActivityIndicator color="#3B82F6" style={{ margin: 20 }} />
        ) : isError ? (
          <Text style={styles.errorText}>Failed to load passkeys</Text>
        ) : keys.length === 0 ? (
          <Text style={styles.emptyText}>
            No passkeys registered yet. Add one to log in with your fingerprint or face.
          </Text>
        ) : (
          keys.map((key, index) => (
            <React.Fragment key={key.id}>
              {index > 0 && <View style={styles.sep} />}
              <View style={styles.passkeyRow}>
                <View style={styles.passkeyIconWrap}>
                  <Ionicons name={key.credentialDeviceType === 'multiDevice' ? 'phone-portrait-outline' : 'laptop-outline'} size={16} color="#718FAF" />
                </View>
                <View style={styles.passkeyInfo}>
                  <Text style={styles.passkeyName}>{key.name}</Text>
                  <Text style={styles.passkeyMeta}>
                    Added {formatDate(key.createdAt)}{key.credentialBackedUp ? ' · Synced' : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(key.id, key.name)} disabled={deletingId === key.id} style={styles.deletePasskeyBtn}>
                  {deletingId === key.id
                    ? <ActivityIndicator size="small" color="#ef4444" />
                    : <Ionicons name="trash-outline" size={17} color="#ef4444" />}
                </TouchableOpacity>
              </View>
            </React.Fragment>
          ))
        )}

        <View style={styles.sep} />
        <Text style={styles.passkeyHint}>
          Passkeys are tied to your device. Remove a passkey if you lose access to that device.
        </Text>
      </View>
    </>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SecurityScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Biometric Login</Text>
        <BiometricSection />

        <Text style={styles.sectionLabel}>Passkeys &amp; Biometrics</Text>
        <PasskeysSection />

        <Text style={styles.sectionLabel}>Active Sessions</Text>
        <SessionsSection />

        <Text style={styles.sectionLabel}>Password</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(screens)/settings/change-password' as never)}>
            <Ionicons name="lock-closed-outline" size={20} color="#60a5fa" style={{ marginRight: 12 }} />
            <Text style={styles.actionLabel}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color="#4A6080" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff',
    fontFamily: 'BarlowCondensed-Bold', textAlign: 'center' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#718FAF', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 20, marginLeft: 2 },

  card: { backgroundColor: '#0B1326', borderRadius: 14, borderWidth: 1, borderColor: '#162540', overflow: 'hidden' },
  sep: { height: 1, backgroundColor: '#162540', marginLeft: 16 },

  errorText: { color: '#ef4444', fontSize: 14, padding: 16, textAlign: 'center' },
  emptyText: { color: '#718FAF', fontSize: 13, padding: 16, textAlign: 'center', lineHeight: 20 },

  // Info banner
  infoBanner: {
    flexDirection: 'row', gap: 12,
    backgroundColor: 'rgba(59,130,246,0.08)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)',
    borderRadius: 14, padding: 14, marginBottom: 10,
  },
  infoBannerTitle: { fontSize: 13, fontWeight: '700', color: '#60a5fa', marginBottom: 4 },
  infoBannerText: { fontSize: 12, color: '#718FAF', lineHeight: 17 },

  // Sessions
  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  sessionIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#162540', alignItems: 'center', justifyContent: 'center' },
  sessionInfo: { flex: 1, minWidth: 0 },
  sessionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  sessionDevice: { color: '#fff', fontSize: 14, fontWeight: '600',
    fontFamily: 'DMSans-SemiBold', flex: 1 },
  sessionMeta: { color: '#718FAF', fontSize: 12 },
  currentBadge: { backgroundColor: 'rgba(59,130,246,0.15)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  currentBadgeText: { color: '#60a5fa', fontSize: 10, fontWeight: '700' },
  revokeBtn: { borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 64, alignItems: 'center' },
  revokeBtnDisabled: { opacity: 0.5 },
  revokeBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  revokeAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, paddingVertical: 14, backgroundColor: '#0B1326', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  revokeAllBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 16 },
  activityLabel: { color: '#718FAF', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  activityValue: { color: '#718FAF', fontSize: 12, lineHeight: 18 },

  // Passkeys
  passkeyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  passkeyHeaderTitle: { color: '#fff', fontSize: 15, fontWeight: '700',
    fontFamily: 'DMSans-Bold' },
  addPasskeyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addPasskeyText: { color: '#60a5fa', fontSize: 13, fontWeight: '600' },
  addPasskeyForm: { padding: 16, gap: 10 },
  passkeyNameInput: { backgroundColor: '#0B1326', borderRadius: 10, borderWidth: 1, borderColor: '#162540', paddingHorizontal: 14, paddingVertical: 11, color: '#fff', fontSize: 14 },
  registerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 12 },
  registerBtnText: { color: '#fff', fontSize: 14, fontWeight: '700',
    fontFamily: 'DMSans-Bold' },
  registerError: { color: '#ef4444', fontSize: 12, textAlign: 'center' },
  registerSuccess: { color: '#4ade80', fontSize: 12, textAlign: 'center' },
  passkeyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  passkeyIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#162540', alignItems: 'center', justifyContent: 'center' },
  passkeyInfo: { flex: 1 },
  passkeyName: { color: '#fff', fontSize: 14, fontWeight: '600',
    fontFamily: 'DMSans-SemiBold', marginBottom: 2 },
  passkeyMeta: { color: '#718FAF', fontSize: 12 },
  deletePasskeyBtn: { padding: 6 },
  passkeyHint: { color: '#4A6080', fontSize: 12, padding: 14, lineHeight: 18 },
  nativePasskeyNotice: { flexDirection: 'row', gap: 10, padding: 16, alignItems: 'flex-start' },
  nativePasskeyNoticeText: { color: '#718FAF', fontSize: 13, lineHeight: 19 },
  openWebBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#3B82F6', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start',
  },
  openWebBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Password
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  actionLabel: { flex: 1, fontSize: 15, color: '#fff' },

  // Biometric toggle
  biometricRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  biometricIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.12)', alignItems: 'center', justifyContent: 'center' },
  biometricTextGroup: { flex: 1 },
  biometricLabel: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  biometricSub: { color: '#718FAF', fontSize: 12, marginTop: 2, fontFamily: 'DMSans-Regular' },
  togglePill: { width: 46, height: 26, borderRadius: 13, backgroundColor: '#1e3a5f', justifyContent: 'center', paddingHorizontal: 3 },
  togglePillOn: { backgroundColor: '#3B82F6' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#718FAF' },
  toggleThumbOn: { backgroundColor: '#fff', marginLeft: 20 },
});
