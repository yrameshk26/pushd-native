import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Me { displayName: string; email: string; username: string }

function useMe() {
  return useQuery<Me>({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/api/users/me')).data,
  });
}

export default function ProfileScreen() {
  const { data, isLoading } = useMe();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/(auth)/login'); },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header row with title and settings button */}
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Profile</Text>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push('/(app)/profile/settings' as never)}
          >
            <Ionicons name="settings-outline" size={22} color="#888" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#6C63FF" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(data?.displayName ?? 'U')[0].toUpperCase()}</Text>
            </View>
            <Text style={styles.name}>{data?.displayName}</Text>
            <Text style={styles.username}>@{data?.username}</Text>
            <Text style={styles.email}>{data?.email}</Text>

            {/* Edit Profile row */}
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => router.push('/(app)/profile/settings' as never)}
            >
              <Ionicons name="pencil-outline" size={16} color="#6C63FF" style={{ marginRight: 6 }} />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { flex: 1, padding: 20, alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 40,
  },
  heading: { flex: 1, fontSize: 28, fontWeight: '800', color: '#fff' },
  settingsBtn: { padding: 6 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  name: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  username: { color: '#6C63FF', fontSize: 15, marginBottom: 4 },
  email: { color: '#888', fontSize: 14, marginBottom: 16 },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#1a1a1a',
  },
  editProfileText: { color: '#6C63FF', fontWeight: '600', fontSize: 14 },
  logoutBtn: {
    marginTop: 'auto', width: '100%', borderWidth: 1, borderColor: '#ff4444',
    borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  logoutText: { color: '#ff4444', fontWeight: '700', fontSize: 16 },
});
