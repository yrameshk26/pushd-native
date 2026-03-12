import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api/client';

// ─── Types ─────────────────────────────────────────────────────────────────

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

// ─── Hooks ─────────────────────────────────────────────────────────────────

function useSessions() {
  return useQuery<SessionsResponse>({
    queryKey: ['auth-sessions'],
    queryFn: async () => {
      const { data } = await api.get('/api/auth/sessions');
      return data?.data ?? data;
    },
  });
}

function usePasskeys() {
  return useQuery<Passkey[]>({
    queryKey: ['passkeys'],
    queryFn: async () => {
      const { data } = await api.get('/api/auth/passkey/list');
      return data?.data ?? data ?? [];
    },
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function deviceIcon(type: string): string {
  const t = type?.toLowerCase() ?? '';
  if (t.includes('iphone') || t.includes('android') || t.includes('mobile') || t.includes('phone')) {
    return 'phone-portrait-outline';
  }
  if (t.includes('tablet') || t.includes('ipad')) return 'tablet-portrait-outline';
  return 'laptop-outline';
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function RowSeparator() {
  return <View style={styles.separator} />;
}

// ─── Sessions section ──────────────────────────────────────────────────────

function SessionsSection() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useSessions();

  const revokeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await api.delete(`/api/auth/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to revoke session. Please try again.');
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/api/auth/sessions');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
      Alert.alert('Done', 'All other sessions have been signed out.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to sign out other sessions. Please try again.');
    },
  });

  function handleRevoke(sessionId: string) {
    Alert.alert('Revoke Session', 'Are you sure you want to sign out this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: () => revokeMutation.mutate(sessionId),
      },
    ]);
  }

  function handleRevokeAll() {
    Alert.alert(
      'Sign Out All Other Sessions',
      'This will sign you out from all devices except this one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out All',
          style: 'destructive',
          onPress: () => revokeAllMutation.mutate(),
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color="#6C63FF" style={{ margin: 20 }} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>Failed to load sessions</Text>
      </View>
    );
  }

  const sessions = data?.sessions ?? [];
  const lastLoginAt = data?.lastLoginAt;
  const lastLoginIp = data?.lastLoginIp;

  return (
    <>
      <View style={styles.card}>
        {sessions.length === 0 ? (
          <Text style={styles.emptyText}>No active sessions found</Text>
        ) : (
          sessions.map((session, index) => (
            <React.Fragment key={session.id}>
              {index > 0 && <RowSeparator />}
              <View style={styles.sessionRow}>
                <View style={styles.sessionIconWrap}>
                  <Ionicons name={deviceIcon(session.deviceType) as any} size={18} color="#888" />
                </View>
                <View style={styles.sessionInfo}>
                  <View style={styles.sessionNameRow}>
                    <Text style={styles.sessionDevice} numberOfLines={1}>
                      {session.deviceName || 'Unknown Device'}
                    </Text>
                    {session.isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.sessionMeta}>
                    {session.ip ? `${session.ip} · ` : ''}
                    {formatDate(session.lastActiveAt)}
                  </Text>
                </View>
                {!session.isCurrent && (
                  <TouchableOpacity
                    style={[
                      styles.revokeBtn,
                      revokeMutation.isPending && styles.revokeBtnDisabled,
                    ]}
                    onPress={() => handleRevoke(session.id)}
                    disabled={revokeMutation.isPending}
                    activeOpacity={0.7}
                  >
                    {revokeMutation.isPending ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <Text style={styles.revokeBtnText}>Revoke</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </React.Fragment>
          ))
        )}
      </View>

      {sessions.filter((s) => !s.isCurrent).length > 0 && (
        <TouchableOpacity
          style={[styles.revokeAllBtn, revokeAllMutation.isPending && styles.revokeAllBtnDisabled]}
          onPress={handleRevokeAll}
          disabled={revokeAllMutation.isPending}
          activeOpacity={0.8}
        >
          {revokeAllMutation.isPending ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={16} color="#ef4444" />
              <Text style={styles.revokeAllBtnText}>Sign out all other sessions</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Account activity */}
      {(lastLoginAt || lastLoginIp) && (
        <View style={[styles.card, { marginTop: 12 }]}>
          <View style={styles.activityRow}>
            <Ionicons name="time-outline" size={16} color="#555" style={styles.activityIcon} />
            <View>
              <Text style={styles.activityLabel}>Account Activity</Text>
              {lastLoginAt && (
                <Text style={styles.activityValue}>Last login: {formatDate(lastLoginAt)}</Text>
              )}
              {lastLoginIp && (
                <Text style={styles.activityValue}>From: {lastLoginIp}</Text>
              )}
            </View>
          </View>
        </View>
      )}
    </>
  );
}

// ─── Passkeys section ──────────────────────────────────────────────────────

function PasskeysSection() {
  const queryClient = useQueryClient();
  const { data: passkeys, isLoading, isError } = usePasskeys();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddName, setShowAddName] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      await api.delete('/api/auth/passkey/delete', { data: { id } });
    },
    onSuccess: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['passkeys'] });
    },
    onError: () => {
      setDeletingId(null);
      Alert.alert('Error', 'Failed to delete passkey. Please try again.');
    },
  });

  function handleDelete(id: string, name: string) {
    Alert.alert('Delete Passkey', `Remove "${name}"? You will no longer be able to use it to sign in.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  }

  function handleAddPasskey() {
    // Native passkey registration requires platform-specific APIs.
    // Open the web app's security settings for passkey registration.
    Alert.alert(
      'Add Passkey',
      'Passkey registration is available on the web app. Would you like to open it?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Web App',
          onPress: () => {
            Linking.openURL('https://app.pushdapp.com/settings/security').catch(() =>
              Alert.alert('Error', 'Could not open the web app.')
            );
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color="#6C63FF" style={{ margin: 20 }} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>Failed to load passkeys</Text>
      </View>
    );
  }

  const keys = passkeys ?? [];

  return (
    <View style={styles.card}>
      <View style={styles.passkeyHeader}>
        <View style={styles.passkeyHeaderLeft}>
          <Ionicons name="finger-print-outline" size={18} color="#6C63FF" />
          <Text style={styles.passkeyHeaderTitle}>Passkeys</Text>
        </View>
        <TouchableOpacity onPress={handleAddPasskey} activeOpacity={0.7}>
          <View style={styles.addPasskeyBtn}>
            <Ionicons name="add" size={16} color="#6C63FF" />
            <Text style={styles.addPasskeyText}>Add</Text>
          </View>
        </TouchableOpacity>
      </View>

      <RowSeparator />

      {keys.length === 0 ? (
        <Text style={styles.emptyText}>
          No passkeys registered. Add one to sign in with Face ID or fingerprint.
        </Text>
      ) : (
        keys.map((key, index) => (
          <React.Fragment key={key.id}>
            {index > 0 && <RowSeparator />}
            <View style={styles.passkeyRow}>
              <View style={styles.passkeyIconWrap}>
                <Ionicons
                  name={key.credentialDeviceType === 'multiDevice' ? 'phone-portrait-outline' : 'laptop-outline'}
                  size={16}
                  color="#888"
                />
              </View>
              <View style={styles.passkeyInfo}>
                <Text style={styles.passkeyName}>{key.name}</Text>
                <Text style={styles.passkeyMeta}>
                  Added {formatDate(key.createdAt)}
                  {key.credentialBackedUp ? ' · Synced' : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(key.id, key.name)}
                disabled={deletingId === key.id}
                style={styles.deletePasskeyBtn}
                activeOpacity={0.7}
              >
                {deletingId === key.id ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Ionicons name="trash-outline" size={17} color="#ef4444" />
                )}
              </TouchableOpacity>
            </View>
          </React.Fragment>
        ))
      )}

      <RowSeparator />
      <Text style={styles.passkeyHint}>
        Passkeys are tied to your device. Remove a passkey if you lose access to that device.
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────

export default function SecurityScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active sessions */}
        <SectionHeader title="Active Sessions" />
        <SessionsSection />

        {/* Passkeys */}
        <SectionHeader title="Passkeys & Biometrics" />
        <PasskeysSection />

        {/* Password */}
        <SectionHeader title="Password" />
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/(auth)/reset-password' as never)}
            activeOpacity={0.7}
          >
            <Ionicons name="lock-closed-outline" size={20} color="#6C63FF" style={styles.actionIcon} />
            <Text style={styles.actionLabel}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color="#444" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 24,
    marginLeft: 4,
  },

  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },

  separator: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginLeft: 16,
  },

  errorText: {
    color: '#ef4444',
    fontSize: 14,
    padding: 16,
    textAlign: 'center',
  },

  emptyText: {
    color: '#555',
    fontSize: 13,
    padding: 16,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Sessions
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  sessionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: { flex: 1, minWidth: 0 },
  sessionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  sessionDevice: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  sessionMeta: { color: '#555', fontSize: 12 },
  currentBadge: {
    backgroundColor: 'rgba(108,99,255,0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  currentBadgeText: { color: '#6C63FF', fontSize: 10, fontWeight: '700' },
  revokeBtn: {
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 64,
    alignItems: 'center',
  },
  revokeBtnDisabled: { opacity: 0.5 },
  revokeBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },

  revokeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 14,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  revokeAllBtnDisabled: { opacity: 0.5 },
  revokeAllBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 10,
  },
  activityIcon: { marginTop: 2 },
  activityLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  activityValue: { color: '#555', fontSize: 12, lineHeight: 18 },

  // Passkeys
  passkeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  passkeyHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  passkeyHeaderTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  addPasskeyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addPasskeyText: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },
  passkeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  passkeyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passkeyInfo: { flex: 1 },
  passkeyName: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  passkeyMeta: { color: '#555', fontSize: 12 },
  deletePasskeyBtn: { padding: 6 },
  passkeyHint: {
    color: '#444',
    fontSize: 12,
    padding: 14,
    lineHeight: 18,
  },

  // Password / generic action row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionIcon: { marginRight: 12 },
  actionLabel: { flex: 1, fontSize: 15, color: '#fff' },

  bottomPad: { height: 40 },
});
