import { useState, useCallback } from 'react';
import { FlatList, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchFeed } from '../../../src/api/social';
import { api } from '../../../src/api/client';

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function FeedScreen() {
  const qc = useQueryClient();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['feed'],
      queryFn: ({ pageParam }) => fetchFeed(pageParam as string | undefined),
      getNextPageParam: (last) => last.nextCursor,
      initialPageParam: undefined,
    });

  const likeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/workouts/${id}/like`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  const workouts = data?.pages.flatMap((p) => p.workouts ?? p.data ?? []) ?? [];

  const renderItem = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/workout/${item.id}` as never)}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.user?.displayName ?? 'U')[0].toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.user?.displayName ?? 'User'}</Text>
          <Text style={styles.date}>{new Date(item.completedAt ?? item.startTime).toLocaleDateString()}</Text>
        </View>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <View style={styles.stats}>
        <Text style={styles.stat}><Ionicons name="time-outline" size={13} color="#666" /> {formatDuration(item.duration ?? 0)}</Text>
        <Text style={styles.stat}><Ionicons name="barbell-outline" size={13} color="#666" /> {((item.volume ?? 0) / 1000).toFixed(1)}t</Text>
        {item.prCount > 0 && <Text style={[styles.stat, { color: '#f59e0b' }]}>🏆 {item.prCount} PR</Text>}
      </View>
      <View style={styles.exercises}>
        {(item.exercises ?? []).slice(0, 4).map((e: any, i: number) => (
          <Text key={i} style={styles.exerciseTag}>{e.exercise?.name ?? e.exerciseName}</Text>
        ))}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={() => likeMutation.mutate(item.id)}>
          <Ionicons name={item.isLiked ? 'heart' : 'heart-outline'} size={18} color={item.isLiked ? '#ef4444' : '#666'} />
          <Text style={styles.actionText}>{item.likesCount ?? 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={() => router.push(`/(app)/workout/${item.id}` as never)}>
          <Ionicons name="chatbubble-outline" size={16} color="#666" />
          <Text style={styles.actionText}>{item.commentsCount ?? 0}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ), [likeMutation]);

  if (isLoading) return <View style={styles.center}><ActivityIndicator color="#6C63FF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.heading}>Following Feed</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={workouts}
        keyExtractor={(w) => w.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6C63FF" />}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color="#6C63FF" style={{ margin: 16 }} /> : null}
        ListEmptyComponent={<Text style={styles.empty}>No workouts yet. Follow some people!</Text>}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create;
const styles = S({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  heading: { fontSize: 18, fontWeight: '700', color: '#fff' },
  card: { backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#2a2a2a' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  userInfo: { flex: 1 },
  userName: { color: '#fff', fontWeight: '600', fontSize: 14 },
  date: { color: '#666', fontSize: 12 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 10 },
  stats: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  stat: { color: '#666', fontSize: 13 },
  exercises: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  exerciseTag: { backgroundColor: '#111', color: '#888', fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  actions: { flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: '#2a2a2a', paddingTop: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { color: '#666', fontSize: 13 },
  empty: { color: '#555', textAlign: 'center', marginTop: 60, fontSize: 15 },
});
