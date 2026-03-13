import { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { searchUsers, followUser } from '../../../src/api/social';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['user-search', query],
    queryFn: () => searchUsers(query),
    enabled: query.length > 1,
  });

  const followMutation = useMutation({
    mutationFn: followUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-search'] }),
  });

  const users: any[] = data?.data ?? data?.users ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.heading}>Find People</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color="#666" />
        <TextInput
          style={styles.input}
          placeholder="Search by name or username..."
          placeholderTextColor="#555"
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
      </View>

      {isLoading && <ActivityIndicator color="#6C63FF" style={{ marginTop: 20 }} />}

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.userRow}>
            <TouchableOpacity style={styles.userInfo} onPress={() => router.push(`/(screens)/profile/${item.username}` as never)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.displayName ?? 'U')[0].toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.username}>@{item.username}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.followBtn, item.isFollowing && styles.followingBtn]}
              onPress={() => followMutation.mutate(item.username)}
            >
              <Text style={[styles.followText, item.isFollowing && styles.followingText]}>
                {item.isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={query.length > 1 ? <Text style={styles.empty}>No users found</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  heading: { fontSize: 18, fontWeight: '700', color: '#fff' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 14, gap: 8, marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a' },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  userInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  name: { color: '#fff', fontWeight: '600', fontSize: 15 },
  username: { color: '#666', fontSize: 13 },
  followBtn: { backgroundColor: '#6C63FF', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#333' },
  followText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  followingText: { color: '#666' },
  empty: { color: '#555', textAlign: 'center', marginTop: 40 },
});
