import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api/client';

interface PublicWorkout {
  id: string;
  title: string;
  startTime: string;
  exerciseCount: number;
  totalVolume: number;
  likeCount: number;
}

interface PublicProfile {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  totalWorkouts: number;
  totalVolume: number;
  followers: number;
  following: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
  recentWorkouts: PublicWorkout[];
}

function usePublicProfile(username: string) {
  return useQuery<PublicProfile>({
    queryKey: ['social-profile', username],
    queryFn: async () => (await api.get(`/api/social/profile/${username}`)).data,
    enabled: !!username,
  });
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

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${kg} kg`;
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function WorkoutCard({ workout }: { workout: PublicWorkout }) {
  return (
    <TouchableOpacity
      style={styles.workoutCard}
      onPress={() => router.push(`/(screens)/workout/${workout.id}` as never)}
    >
      <View style={styles.workoutCardHeader}>
        <Text style={styles.workoutTitle} numberOfLines={1}>{workout.title}</Text>
        <Text style={styles.workoutTime}>{formatRelativeTime(workout.startTime)}</Text>
      </View>
      <View style={styles.workoutMeta}>
        <View style={styles.workoutMetaItem}>
          <Ionicons name="barbell-outline" size={13} color="#666" />
          <Text style={styles.workoutMetaText}>{workout.exerciseCount} exercises</Text>
        </View>
        <View style={styles.workoutMetaItem}>
          <Ionicons name="stats-chart-outline" size={13} color="#666" />
          <Text style={styles.workoutMetaText}>{formatVolume(workout.totalVolume)}</Text>
        </View>
        {workout.likeCount > 0 && (
          <View style={styles.workoutMetaItem}>
            <Ionicons name="heart-outline" size={13} color="#ff6b6b" />
            <Text style={styles.workoutMetaText}>{workout.likeCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = usePublicProfile(username ?? '');
  const [following, setFollowing] = useState<boolean | null>(null);

  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      await api.post('/api/social/follow', { username, action });
    },
    onMutate: (action) => {
      setFollowing(action === 'follow');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-profile', username] });
    },
    onError: () => {
      setFollowing(null);
    },
  });

  const isFollowing = following !== null ? following : data?.isFollowing ?? false;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={48} color="#333" />
          <Text style={styles.emptyText}>User not found</Text>
          <Text style={styles.emptySubText}>@{username} doesn't exist or is private.</Text>
        </View>
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
        <Text style={styles.headerTitle}>@{data.username}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(data.displayName ?? data.username)}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{data.displayName ?? data.username}</Text>
            <Text style={styles.usernameText}>@{data.username}</Text>
            {data.bio ? <Text style={styles.bioText}>{data.bio}</Text> : null}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBox label="Workouts" value={data.totalWorkouts} />
          <StatBox label="Volume" value={formatVolume(data.totalVolume)} />
          <StatBox label="Followers" value={data.followers} />
          <StatBox label="Following" value={data.following} />
        </View>

        {/* Follow / Unfollow Button */}
        {!data.isOwnProfile && (
          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followingBtn]}
            onPress={() => followMutation.mutate(isFollowing ? 'unfollow' : 'follow')}
            disabled={followMutation.isPending}
          >
            {followMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={isFollowing ? 'person-remove-outline' : 'person-add-outline'}
                  size={16}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.followBtnText}>{isFollowing ? 'Unfollow' : 'Follow'}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Recent Workouts */}
        <Text style={styles.sectionTitle}>Recent Workouts</Text>

        {data.recentWorkouts.length === 0 ? (
          <View style={styles.emptyWorkouts}>
            <Ionicons name="barbell-outline" size={36} color="#333" />
            <Text style={styles.emptyText}>No public workouts yet</Text>
          </View>
        ) : (
          data.recentWorkouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))
        )}

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
  backBtn: { width: 40, padding: 4 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 24 },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  profileInfo: { flex: 1, paddingTop: 4 },
  displayName: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 },
  usernameText: { fontSize: 14, color: '#6C63FF', marginBottom: 6 },
  bioText: { fontSize: 13, color: '#aaa', lineHeight: 18 },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#666' },

  followBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  followingBtn: { backgroundColor: '#2a2a2a', borderWidth: 1, borderColor: '#3a3a3a' },
  followBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },

  workoutCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 14,
    marginBottom: 10,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff', marginRight: 8 },
  workoutTime: { fontSize: 12, color: '#555', flexShrink: 0 },
  workoutMeta: { flexDirection: 'row', gap: 14 },
  workoutMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  workoutMetaText: { fontSize: 12, color: '#666' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyWorkouts: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#666', fontSize: 15, fontWeight: '600', marginTop: 12 },
  emptySubText: { color: '#444', fontSize: 13, marginTop: 4, textAlign: 'center' },

  bottomPad: { height: 40 },
});
