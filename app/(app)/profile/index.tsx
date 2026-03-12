import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
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
        <Text style={styles.heading}>Profile</Text>

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
  heading: { fontSize: 28, fontWeight: '800', color: '#fff', alignSelf: 'flex-start', marginBottom: 40 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  name: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  username: { color: '#6C63FF', fontSize: 15, marginBottom: 4 },
  email: { color: '#888', fontSize: 14, marginBottom: 40 },
  logoutBtn: {
    marginTop: 'auto', width: '100%', borderWidth: 1, borderColor: '#ff4444',
    borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  logoutText: { color: '#ff4444', fontWeight: '700', fontSize: 16 },
});
