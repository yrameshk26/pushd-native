import { useState, useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Share,
  Alert,
} from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/api/client';
import { PRBadge } from '../../../src/components/PRBadge';

type FeedTab = 'following' | 'discover';

interface FeedSet {
  isPR?: boolean;
  weight?: number;
  reps?: number;
}

interface FeedExercise {
  exercise: { name: string };
  sets: FeedSet[];
}

interface FeedUser {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

interface FeedWorkout {
  id: string;
  title: string;
  startTime: string;
  completedAt?: string;
  duration?: number;
  isLiked: boolean;
  exercises: FeedExercise[];
  _count?: { likes?: number; comments?: number };
  user: FeedUser;
}

interface FeedPage {
  data?: FeedWorkout[];
  workouts?: FeedWorkout[];
  nextCursor?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function calculateVolume(sets: FeedSet[]): number {
  return sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
}

function AvatarCircle({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

function WorkoutCard({
  workout,
  onLike,
}: {
  workout: FeedWorkout;
  onLike: () => void;
}) {
  const totalVolume = workout.exercises.reduce(
    (t, ex) => t + calculateVolume(ex.sets),
    0,
  );
  const prCount = workout.exercises
    .flatMap((ex) => ex.sets)
    .filter((s) => s.isPR).length;

  const displayName = workout.user.displayName ?? workout.user.username ?? 'User';
  const likeCount = workout._count?.likes ?? 0;
  const commentCount = workout._count?.comments ?? 0;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${displayName}'s workout: ${workout.title} — ${workout.exercises.length} exercises, ${Math.round(totalVolume)} kg total volume!`,
        title: workout.title,
      });
    } catch {
      // user dismissed
    }
  };

  return (
    <View style={styles.card}>
      {/* Card header: avatar + user info + PR badge */}
      <View style={styles.cardHeader}>
        <TouchableOpacity
          onPress={() =>
            router.push(`/(app)/profile/${workout.user.username}` as never)
          }
        >
          <AvatarCircle name={displayName} size={40} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.userInfo}
          onPress={() =>
            router.push(`/(app)/profile/${workout.user.username}` as never)
          }
        >
          <Text style={styles.userName}>{displayName}</Text>
          {workout.user.displayName && workout.user.username && (
            <Text style={styles.usernameHandle}>@{workout.user.username}</Text>
          )}
          <Text style={styles.timeAgo}>
            {formatRelativeTime(workout.startTime)}
          </Text>
        </TouchableOpacity>

        {prCount > 0 && <PRBadge size="sm" />}
      </View>

      {/* Workout title */}
      <TouchableOpacity
        onPress={() => router.push(`/(app)/workout/${workout.id}` as never)}
      >
        <Text style={styles.workoutTitle}>{workout.title}</Text>
      </TouchableOpacity>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {workout.duration != null && workout.duration > 0 && (
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={13} color="#888" />
            <Text style={styles.statText}>{formatDuration(workout.duration)}</Text>
          </View>
        )}
        <View style={styles.statItem}>
          <Ionicons name="barbell-outline" size={13} color="#888" />
          <Text style={styles.statText}>
            {workout.exercises.length} exercise
            {workout.exercises.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {totalVolume > 0 && (
          <Text style={styles.statText}>{Math.round(totalVolume)} kg</Text>
        )}
      </View>

      {/* Exercise list preview */}
      <Text style={styles.exerciseList} numberOfLines={1}>
        {workout.exercises
          .slice(0, 4)
          .map((e) => e.exercise.name)
          .join(' · ')}
        {workout.exercises.length > 4
          ? ` +${workout.exercises.length - 4} more`
          : ''}
      </Text>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={onLike}>
          <Ionicons
            name={workout.isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={workout.isLiked ? '#ef4444' : '#666'}
          />
          <Text style={[styles.actionText, workout.isLiked && styles.actionTextLiked]}>
            {likeCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/(app)/workout/${workout.id}` as never)}
        >
          <Ionicons name="chatbubble-outline" size={16} color="#666" />
          <Text style={styles.actionText}>{commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={handleShare}>
          <Ionicons name="share-outline" size={18} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const [tab, setTab] = useState<FeedTab>('following');
  const qc = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery<FeedPage>({
    queryKey: ['feed', tab],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { limit: '20' };
      if (tab === 'discover') params.type = 'discover';
      if (pageParam) params.cursor = pageParam as string;
      const { data: res } = await api.get('/api/social/feed', { params });
      return res;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined,
  });

  const workouts: FeedWorkout[] =
    data?.pages.flatMap((p) => p.data ?? p.workouts ?? []) ?? [];

  const likeMutation = useMutation({
    mutationFn: async ({
      workoutId,
      liked,
    }: {
      workoutId: string;
      liked: boolean;
    }) => {
      if (liked) {
        await api.delete(`/api/workouts/${workoutId}/like`);
      } else {
        await api.post(`/api/workouts/${workoutId}/like`);
      }
    },
    onMutate: async ({ workoutId, liked }) => {
      await qc.cancelQueries({ queryKey: ['feed', tab] });
      qc.setQueryData<{ pages: FeedPage[] }>(['feed', tab], (old) => {
        if (!old) return old;
        const newPages = old.pages.map((page) => {
          const items = (page.data ?? page.workouts ?? []).map((w) =>
            w.id === workoutId
              ? {
                  ...w,
                  isLiked: !liked,
                  _count: {
                    ...w._count,
                    likes: (w._count?.likes ?? 0) + (liked ? -1 : 1),
                  },
                }
              : w,
          );
          return page.data ? { ...page, data: items } : { ...page, workouts: items };
        });
        return { ...old, pages: newPages };
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['feed', tab] }),
  });

  const renderItem = useCallback(
    ({ item }: { item: FeedWorkout }) => (
      <WorkoutCard
        workout={item}
        onLike={() =>
          likeMutation.mutate({ workoutId: item.id, liked: item.isLiked })
        }
      />
    ),
    [likeMutation],
  );

  const EmptyComponent = () => {
    if (tab === 'following') {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color="#333" />
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptySubtitle}>
            Follow people to see their workouts, or check Discover
          </Text>
          <TouchableOpacity
            style={styles.discoverBtn}
            onPress={() => setTab('discover')}
          >
            <Text style={styles.discoverBtnText}>Explore Discover</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Ionicons name="barbell-outline" size={48} color="#333" />
        <Text style={styles.emptySubtitle}>No public workouts yet</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>Feed</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab switcher */}
      <View style={styles.tabContainer}>
        {(['following', 'discover'] as FeedTab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabPill, tab === t && styles.tabPillActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#6C63FF" />
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(w) => w.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#6C63FF"
            />
          }
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                color="#6C63FF"
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
          ListEmptyComponent={<EmptyComponent />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  heading: { fontSize: 18, fontWeight: '700', color: '#fff' },

  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 14,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabPillActive: { backgroundColor: '#0a0a0a' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#666' },
  tabTextActive: { color: '#fff', fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingBottom: 10,
  },
  avatar: {
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { color: '#fff', fontWeight: '600', fontSize: 14 },
  usernameHandle: { color: '#888', fontSize: 11 },
  timeAgo: { color: '#666', fontSize: 12, marginTop: 1 },

  workoutTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexWrap: 'wrap',
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: '#888', fontSize: 13 },

  exerciseList: {
    color: '#555',
    fontSize: 12,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },

  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shareBtn: { marginLeft: 'auto' },
  actionText: { color: '#666', fontSize: 13 },
  actionTextLiked: { color: '#ef4444' },

  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  discoverBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  discoverBtnText: { color: '#6C63FF', fontWeight: '600', fontSize: 14 },
});
