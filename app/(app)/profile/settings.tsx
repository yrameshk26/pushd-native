import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/auth';
import NotificationSettings from '../../../src/components/NotificationSettings';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  displayName: string;
  username: string;
  bio: string;
  email: string;
  weightUnit: 'KG' | 'LBS';
  avatarUrl?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function RowSeparator() {
  return <View style={styles.separator} />;
}

function ToggleRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description?: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={onToggle} activeOpacity={0.7}>
      <View style={styles.toggleLabelGroup}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? <Text style={styles.toggleSub}>{description}</Text> : null}
      </View>
      <View
        style={[styles.togglePill, value && styles.togglePillOn]}
      >
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  const { data, isLoading } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: res } = await api.get('/api/user/profile');
      return res?.data ?? res;
    },
  });

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [weightUnit, setWeightUnit] = useState<'KG' | 'LBS'>('KG');
  const [initialized, setInitialized] = useState(false);

  // Populate fields once data arrives (immutable init pattern)
  useEffect(() => {
    if (data && !initialized) {
      setDisplayName(data.displayName ?? '');
      setUsername(data.username ?? '');
      setBio(data.bio ?? '');
      setWeightUnit(data.weightUnit ?? 'KG');
      setInitialized(true);
    }
  }, [data, initialized]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: res } = await api.patch('/api/user/profile', {
        displayName: displayName.trim() || undefined,
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
        weightUnit,
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      Alert.alert('Saved', 'Your profile has been updated.');
      router.back();
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to save changes. Please try again.';
      Alert.alert('Error', message);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/api/user/profile');
    },
    onSuccess: async () => {
      await logout();
      router.replace('/(auth)/login');
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to delete account. Please try again.';
      Alert.alert('Error', message);
    },
  });

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All your workouts, progress, and stats will be lost forever.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, delete my account',
                  style: 'destructive',
                  onPress: () => deleteAccountMutation.mutate(),
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleChangeAvatar = () => {
    Alert.alert(
      'Change Photo',
      'Avatar upload is available in the web app, or will be available in a future app update.',
      [{ text: 'OK' }],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const initials = getInitials(displayName || data?.username || '?');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saveMutation.isPending && styles.saveBtnDisabled]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <TouchableOpacity onPress={handleChangeAvatar}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <SectionHeader title="Profile" />
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your display name"
              placeholderTextColor="#555"
              maxLength={50}
            />
          </View>
          <RowSeparator />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={styles.fieldInput}
              value={username}
              onChangeText={setUsername}
              placeholder="your_username"
              placeholderTextColor="#555"
              maxLength={30}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <RowSeparator />
          <View style={[styles.fieldRow, styles.fieldRowTop]}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.fieldInput, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell others about your fitness journey..."
              placeholderTextColor="#555"
              maxLength={200}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
          <Text style={styles.charCount}>{bio.length}/200</Text>
        </View>

        {/* Preferences Section */}
        <SectionHeader title="Preferences" />
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Weight Unit</Text>
            <View style={styles.segmentControl}>
              {(['KG', 'LBS'] as const).map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.segmentOption,
                    weightUnit === unit && styles.segmentOptionActive,
                  ]}
                  onPress={() => setWeightUnit(unit)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      weightUnit === unit && styles.segmentTextActive,
                    ]}
                  >
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <RowSeparator />
          <NotificationSettings />
        </View>

        {/* Account Section */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          {data?.email ? (
            <>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Email</Text>
                <Text style={styles.fieldValue} numberOfLines={1}>
                  {data.email}
                </Text>
              </View>
              <RowSeparator />
            </>
          ) : null}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/(auth)/reset-password' as never)}
          >
            <Ionicons name="lock-closed-outline" size={20} color="#6C63FF" style={styles.actionIcon} />
            <Text style={styles.actionLabel}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color="#444" />
          </TouchableOpacity>
          <RowSeparator />
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/(app)/settings/security' as never)}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#6C63FF" style={styles.actionIcon} />
            <Text style={styles.actionLabel}>Security</Text>
            <Ionicons name="chevron-forward" size={18} color="#444" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <SectionHeader title="Danger Zone" />
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleDeleteAccount}
            disabled={deleteAccountMutation.isPending}
          >
            {deleteAccountMutation.isPending ? (
              <ActivityIndicator size="small" color="#ff4444" style={styles.actionIcon} />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#ff4444" style={styles.actionIcon} />
            )}
            <Text style={styles.dangerLabel}>Delete Account</Text>
            <Ionicons name="chevron-forward" size={18} color="#444" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  saveBtn: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 68,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 10,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  changePhotoText: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },

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

  separator: { height: 1, backgroundColor: '#2a2a2a', marginLeft: 16 },

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  fieldRowTop: { alignItems: 'flex-start', paddingTop: 14 },
  fieldLabel: {
    fontSize: 15,
    color: '#fff',
    width: 90,
    flexShrink: 0,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: '#ccc',
    textAlign: 'right',
  },
  bioInput: {
    textAlign: 'left',
    minHeight: 72,
    lineHeight: 22,
  },
  fieldValue: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    textAlign: 'right',
  },
  charCount: {
    fontSize: 11,
    color: '#555',
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingBottom: 10,
    marginTop: -8,
  },

  segmentControl: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  segmentOption: { paddingHorizontal: 18, paddingVertical: 7 },
  segmentOptionActive: { backgroundColor: '#6C63FF' },
  segmentText: { fontSize: 13, fontWeight: '600', color: '#666' },
  segmentTextActive: { color: '#fff' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  toggleLabelGroup: { flex: 1 },
  toggleLabel: { fontSize: 15, color: '#fff' },
  toggleSub: { fontSize: 12, color: '#666', marginTop: 2 },
  togglePill: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  togglePillOn: { backgroundColor: '#6C63FF' },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionIcon: { marginRight: 12 },
  actionLabel: { flex: 1, fontSize: 15, color: '#fff' },
  dangerLabel: { flex: 1, fontSize: 15, color: '#ff4444' },

  bottomPad: { height: 40 },
});
