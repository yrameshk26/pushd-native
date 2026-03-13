import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../../../src/api/client';

const PAGE_SIZE = 20;

interface DiscoverWorkout {
  id: string;
  title: string;
  totalVolume: number;
  // Rich format from /api/social/feed
  exercises?: { exercise: { name: string }; sets: unknown[] }[];
  _count?: { likes?: number; comments?: number };
  // Legacy lightweight fields (kept for backwards compat)
  exerciseCount?: number;
  likeCount?: number;
  user: {
    username: string;
    displayName: string | null;
  };
}

interface DiscoverPage {
  workouts: DiscoverWorkout[];
  nextCursor: string | null;
}

function getInitials(name: string | null | undefined, fallback = '?'): string {
  const source = name ?? fallback;
  return source
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${kg} kg`;
}

function WorkoutFeedCard({ item }: { item: DiscoverWorkout }) {
  const exerciseCount = item.exercises?.length ?? item.exerciseCount ?? 0;
  const likeCount = item._count?.likes ?? item.likeCount ?? 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(screens)/workout/${item.id}` as never)}
      activeOpacity={0.75}
    >
      {/* User Row */}
      <View style={styles.userRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(item.user.displayName ?? item.user.username)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push(`/(screens)/profile/${item.user.username}` as never)}
        >
          <Text style={styles.userDisplayName}>{item.user.displayName ?? item.user.username}</Text>
          <Text style={styles.userUsername}>@{item.user.username}</Text>
        </TouchableOpacity>
      </View>

      {/* Workout Title */}
      <Text style={styles.workoutTitle} numberOfLines={2}>{item.title}</Text>

      {/* Workout Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="barbell-outline" size={14} color="#3B82F6" />
          <Text style={styles.statText}>{exerciseCount} exercises</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="stats-chart-outline" size={14} color="#3B82F6" />
          <Text style={styles.statText}>{formatVolume(item.totalVolume)}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="heart-outline" size={14} color="#ff6b6b" />
          <Text style={styles.statText}>{likeCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="compass-outline" size={52} color="#162540" />
      <Text style={styles.emptyTitle}>
        {search ? 'No results found' : 'Nothing here yet'}
      </Text>
      <Text style={styles.emptySub}>
        {search
          ? `No workouts match "${search}"`
          : 'Be the first to share a public workout!'}
      </Text>
    </View>
  );
}

export default function DiscoverScreen() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => setDebouncedSearch(text), 400);
    setSearchTimer(timer);
  };

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<DiscoverPage>({
    queryKey: ['social-discover', debouncedSearch],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { type: 'discover', limit: String(PAGE_SIZE) };
      if (pageParam) params.cursor = String(pageParam);
      if (debouncedSearch) params.q = debouncedSearch;
      const res = await api.get('/api/social/feed', { params });
      return res.data;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const allWorkouts: DiscoverWorkout[] = data?.pages.flatMap((p) => p.workouts) ?? [];

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<DiscoverWorkout>) => <WorkoutFeedCard item={item} />,
    [],
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return <ActivityIndicator color="#3B82F6" style={{ marginVertical: 20 }} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discover</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#718FAF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearchChange}
          placeholder="Search exercises or users..."
          placeholderTextColor="#718FAF"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearch('');
              setDebouncedSearch('');
            }}
          >
            <Ionicons name="close-circle" size={18} color="#718FAF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <ActivityIndicator color="#3B82F6" style={{ marginTop: 60 }} />
      ) : isError ? (
        <View style={styles.emptyState}>
          <Ionicons name="wifi-outline" size={48} color="#162540" />
          <Text style={styles.emptyTitle}>Failed to load</Text>
          <Text style={styles.emptySub}>Check your connection and try again.</Text>
        </View>
      ) : (
        <FlatList
          data={allWorkouts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={<EmptyState search={debouncedSearch} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#162540',
  },
  backBtn: { width: 40, padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff',
    fontFamily: 'BarlowCondensed-Bold', textAlign: 'center' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1326',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#162540',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#fff' },

  listContent: { paddingHorizontal: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#0B1326',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#162540',
    padding: 16,
    marginBottom: 12,
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  userDisplayName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  userUsername: { fontSize: 12, color: '#3B82F6' },

  workoutTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    lineHeight: 22,
  },

  statsRow: { flexDirection: 'row', gap: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 13, color: '#718FAF' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#718FAF', marginTop: 14 },
  emptySub: { fontSize: 13, color: '#4A6080', marginTop: 6, textAlign: 'center', lineHeight: 18 },
});
