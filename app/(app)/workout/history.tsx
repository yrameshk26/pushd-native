import { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchWorkouts } from '../../../src/api/workouts';
import { WorkoutCard } from '../../../src/components/WorkoutCard';
import { WorkoutListItem } from '../../../src/types';

export default function WorkoutHistoryScreen() {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['workouts'],
    queryFn: ({ pageParam }) => fetchWorkouts(pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  const allWorkouts: WorkoutListItem[] = data?.pages.flatMap((p) => p.workouts) ?? [];

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return <ActivityIndicator color="#6C63FF" style={{ paddingVertical: 20 }} />;
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="barbell-outline" size={56} color="#333" />
        <Text style={styles.emptyTitle}>No workouts yet</Text>
        <Text style={styles.emptySubtitle}>Complete your first workout to see your history here.</Text>
        <TouchableOpacity style={styles.startBtn} onPress={() => router.push('/(app)/workout')}>
          <Text style={styles.startBtnText}>Start Workout</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>Workout History</Text>
        <View style={{ width: 38 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={allWorkouts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              onPress={() => router.push(`/(app)/workout/${item.id}`)}
            />
          )}
          ListEmptyComponent={renderEmpty()}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#6C63FF"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  heading: { fontSize: 20, fontWeight: '700', color: '#fff' },
  list: { padding: 16, paddingTop: 8 },
  emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  emptySubtitle: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  startBtn: {
    marginTop: 28, backgroundColor: '#6C63FF', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
