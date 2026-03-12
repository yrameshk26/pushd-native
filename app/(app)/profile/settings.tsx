import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/auth';

interface UserProfile {
  displayName: string;
  username: string;
  bio: string;
  email: string;
  weightUnit: 'KG' | 'LBS';
  workoutReminderEnabled: boolean;
}

function useProfile() {
  return useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: async () => (await api.get('/api/user/profile')).data,
  });
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function RowSeparator() {
  return <View style={styles.separator} />;
}

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useProfile();
  const logout = useAuthStore((s) => s.logout);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [weightUnit, setWeightUnit] = useState<'KG' | 'LBS'>('KG');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (data && !initialized) {
    setDisplayName(data.displayName ?? '');
    setUsername(data.username ?? '');
    setBio(data.bio ?? '');
    setWeightUnit(data.weightUnit ?? 'KG');
    setReminderEnabled(data.workoutReminderEnabled ?? false);
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch('/api/user/profile', {
        displayName: displayName.trim() || undefined,
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
        weightUnit,
        workoutReminderEnabled: reminderEnabled,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      Alert.alert('Saved', 'Your profile has been updated.');
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            <View style={styles.toggleLabelGroup}>
              <Text style={styles.toggleLabel}>Weight Unit</Text>
            </View>
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
          <View style={styles.fieldRow}>
            <View style={styles.toggleLabelGroup}>
              <Text style={styles.toggleLabel}>Workout Reminder</Text>
              <Text style={styles.toggleSub}>Daily reminder to stay consistent</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: '#2a2a2a', true: '#6C63FF' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Account Section */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() =>
              Alert.alert('Change Email', 'Email change is handled via the web app settings.')
            }
          >
            <Ionicons name="mail-outline" size={20} color="#6C63FF" style={styles.actionIcon} />
            <Text style={styles.actionLabel}>Change Email</Text>
            <Ionicons name="chevron-forward" size={18} color="#444" />
          </TouchableOpacity>
          <RowSeparator />
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/(auth)/reset-password' as never)}
          >
            <Ionicons name="lock-closed-outline" size={20} color="#6C63FF" style={styles.actionIcon} />
            <Text style={styles.actionLabel}>Change Password</Text>
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
  charCount: {
    fontSize: 11,
    color: '#555',
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingBottom: 10,
    marginTop: -8,
  },

  toggleLabelGroup: { flex: 1 },
  toggleLabel: { fontSize: 15, color: '#fff' },
  toggleSub: { fontSize: 12, color: '#555', marginTop: 2 },

  segmentControl: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  segmentOption: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  segmentOptionActive: { backgroundColor: '#6C63FF' },
  segmentText: { fontSize: 13, fontWeight: '600', color: '#666' },
  segmentTextActive: { color: '#fff' },

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
