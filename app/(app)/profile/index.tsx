import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  displayName: string | null;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  email: string;
}

interface UserStats {
  workouts: number;
  totalVolume: number;
  followers: number;
  following: number;
  currentStreak: number;
}

interface WorkoutSummary {
  id: string;
  title: string;
  startTime: string;
  duration?: number;
  exerciseCount?: number;
}

interface WorkoutsResponse {
  data?: WorkoutSummary[];
  workouts?: WorkoutSummary[];
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

function formatVolume(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}M kg`;
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)} kg`;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── API hooks ────────────────────────────────────────────────────────────────

function useMe() {
  return useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/api/users/me');
      return data?.data ?? data;
    },
  });
}

function useUserStats() {
  return useQuery<UserStats>({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const { data } = await api.get('/api/users/stats');
      return data?.data ?? data;
    },
  });
}

function useRecentWorkouts() {
  return useQuery<WorkoutsResponse>({
    queryKey: ['recent-workouts'],
    queryFn: async () => {
      const { data } = await api.get('/api/workouts', { params: { limit: 5 } });
      return data;
    },
  });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { data: me, isLoading: meLoading } = useMe();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: workoutsRes, isLoading: workoutsLoading } = useRecentWorkouts();
  const logout = useAuthStore((s) => s.logout);

  const recentWorkouts: WorkoutSummary[] =
    workoutsRes?.data ?? workoutsRes?.workouts ?? [];

  const displayName = me?.displayName ?? me?.username ?? 'User';
  const initials = getInitials(displayName);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const isLoading = meLoading;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Profile</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/(app)/profile/settings' as never)}
            >
              <Ionicons name="settings-outline" size={22} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#6C63FF" />
          </View>
        ) : (
          <>
            {/* Avatar + identity */}
            <View style={styles.profileTop}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>{initials}</Text>
              </View>
              <Text style={styles.displayName}>{displayName}</Text>
              {me?.username && (
                <Text style={styles.username}>@{me.username}</Text>
              )}
              {me?.bio ? (
                <Text style={styles.bio}>{me.bio}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={() => router.push('/(app)/profile/settings' as never)}
              >
                <Ionicons name="pencil-outline" size={14} color="#6C63FF" />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Stats row */}
            {statsLoading ? (
              <ActivityIndicator color="#6C63FF" style={{ marginVertical: 16 }} />
            ) : (
              <View style={styles.statsRow}>
                <TouchableOpacity style={styles.statCell}>
                  <Text style={styles.statValue}>{stats?.workouts ?? 0}</Text>
                  <Text style={styles.statLabel}>Workouts</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <TouchableOpacity style={styles.statCell}>
                  <Text style={styles.statValue}>
                    {formatVolume(stats?.totalVolume ?? 0)}
                  </Text>
                  <Text style={styles.statLabel}>Total Volume</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <TouchableOpacity
                  style={styles.statCell}
                  onPress={() =>
                    router.push('/(app)/profile/followers' as never)
                  }
                >
                  <Text style={styles.statValue}>{stats?.followers ?? 0}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <TouchableOpacity
                  style={styles.statCell}
                  onPress={() =>
                    router.push('/(app)/profile/following' as never)
                  }
                >
                  <Text style={styles.statValue}>{stats?.following ?? 0}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Recent Workouts */}
            <Text style={styles.sectionTitle}>Recent Workouts</Text>
            {workoutsLoading ? (
              <ActivityIndicator color="#6C63FF" style={{ marginTop: 12 }} />
            ) : recentWorkouts.length === 0 ? (
              <Text style={styles.emptyText}>No workouts yet. Start one!</Text>
            ) : (
              recentWorkouts.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  style={styles.workoutRow}
                  onPress={() =>
                    router.push(`/(app)/workout/${w.id}` as never)
                  }
                >
                  <View style={styles.workoutRowIcon}>
                    <Ionicons name="barbell-outline" size={18} color="#6C63FF" />
                  </View>
                  <View style={styles.workoutRowInfo}>
                    <Text style={styles.workoutRowTitle} numberOfLines={1}>
                      {w.title}
                    </Text>
                    <Text style={styles.workoutRowMeta}>
                      {formatRelativeTime(w.startTime)}
                      {w.exerciseCount != null
                        ? ` · ${w.exerciseCount} exercises`
                        : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#444" />
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  center: { alignItems: 'center', paddingTop: 60 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginBottom: 24,
  },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },

  profileTop: { alignItems: 'center', marginBottom: 24 },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarLargeText: { color: '#fff', fontSize: 34, fontWeight: '800' },
  displayName: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  username: { color: '#6C63FF', fontSize: 14, marginBottom: 8 },
  bio: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a1a',
    marginTop: 4,
  },
  editProfileText: { color: '#6C63FF', fontWeight: '600', fontSize: 13 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 28,
    overflow: 'hidden',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 4 },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 3 },
  statLabel: { color: '#666', fontSize: 11 },
  statDivider: { width: 1, backgroundColor: '#2a2a2a', marginVertical: 12 },

  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  workoutRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(108,99,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  workoutRowInfo: { flex: 1, minWidth: 0 },
  workoutRowTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  workoutRowMeta: { color: '#666', fontSize: 12 },

  emptyText: { color: '#555', textAlign: 'center', marginTop: 16, fontSize: 13 },
});
