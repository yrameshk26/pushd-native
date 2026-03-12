import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../src/api/client';
import { useWorkoutStore } from '../../../src/store/workout';
import { VolumeChart } from '../../../src/components/VolumeChart';
import { StreakCalendar } from '../../../src/components/StreakCalendar';
import { RecoveryWidget } from '../../../src/components/RecoveryWidget';
import { DeloadRecommendationCard } from '../../../src/components/DeloadRecommendationCard';
import { WeeklyReviewCard } from '../../../src/components/WeeklyReviewCard';
import type { Routine, WorkoutListItem } from '../../../src/types/index';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MeData {
  displayName: string;
  username: string;
}

interface StreakData {
  streak: number;
  lastWorkoutDate?: string;
  activeDates?: string[];
}

interface VolumeWeek {
  week: string;
  volume: number;
}

interface DeloadResult {
  shouldDeload: boolean;
  reason: string;
  suggestedWeek?: string;
}

interface WeeklyReview {
  summary: string;
  highlights: string[];
  improvements: string[];
}

interface RecoveryData {
  score: number;
  recommendation: string;
  sleepHours?: number;
  sorenessLevel?: number;
}

interface PREntry {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  achievedAt: string;
}

interface ProgressSummary {
  recentPRs: PREntry[];
  totalWorkouts: number;
  totalVolume: number;
}

// ─── Greeting ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Relative date ───────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  return `${weeks} weeks ago`;
}

// ─── Skeleton placeholder ────────────────────────────────────────────────────

function Skeleton({ width, height, borderRadius = 8, style }: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const opacity = React.useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius,
          backgroundColor: '#2a2a2a',
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, icon, children }: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        {icon ? <Ionicons name={icon as never} size={14} color="#888" style={{ marginRight: 6 }} /> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Quick action button ──────────────────────────────────────────────────────

function QuickAction({ icon, label, color, onPress }: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as never} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const queryClient = useQueryClient();
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const startFromRoutine = useWorkoutStore((s) => s.startFromRoutine);
  const [refreshing, setRefreshing] = useState(false);

  // ── Parallel queries — each silently hides on error ──────────────────────

  const { data: me, isLoading: meLoading } = useQuery<MeData>({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/api/users/me')).data,
    retry: 1,
  });

  const { data: streakData, isLoading: streakLoading } = useQuery<StreakData>({
    queryKey: ['user-streak'],
    queryFn: async () => (await api.get('/api/users/streak')).data,
    retry: 1,
  });

  const { data: volumeData, isLoading: volumeLoading } = useQuery<VolumeWeek[]>({
    queryKey: ['volume-8w'],
    queryFn: async () => {
      const res = await api.get('/api/progress/volume', { params: { weeks: 8 } });
      return res.data.weeks ?? res.data ?? [];
    },
    retry: 1,
  });

  const { data: deloadData, isLoading: deloadLoading } = useQuery<DeloadResult>({
    queryKey: ['deload-check'],
    queryFn: async () => {
      const res = await api.get('/api/ai/deload-check');
      return res.data.data ?? res.data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24h
    retry: 1,
  });

  const { data: weeklyReview, isLoading: reviewLoading } = useQuery<WeeklyReview>({
    queryKey: ['weekly-review'],
    queryFn: async () => {
      const res = await api.get('/api/ai/weekly-review');
      return res.data.data ?? res.data;
    },
    staleTime: 6 * 60 * 60 * 1000, // 6h
    retry: 1,
  });

  const { data: recoveryData, isLoading: recoveryLoading } = useQuery<RecoveryData>({
    queryKey: ['recovery'],
    queryFn: async () => {
      const res = await api.get('/api/ai/recovery');
      return res.data.data ?? res.data;
    },
    retry: 1,
  });

  const { data: progressSummary, isLoading: progressLoading } = useQuery<ProgressSummary>({
    queryKey: ['progress-summary'],
    queryFn: async () => (await api.get('/api/progress/summary')).data,
    retry: 1,
  });

  const { data: routinesData, isLoading: routinesLoading } = useQuery<{ routines: Routine[] }>({
    queryKey: ['routines-suggested'],
    queryFn: async () => (await api.get('/api/routines', { params: { limit: 1 } })).data,
    retry: 1,
  });

  const { data: recentWorkoutsData, isLoading: recentWorkoutsLoading } = useQuery<{ workouts: WorkoutListItem[] }>({
    queryKey: ['recent-workouts'],
    queryFn: async () => (await api.get('/api/workouts', { params: { limit: 3 } })).data,
    retry: 1,
  });

  // ── Derived values ────────────────────────────────────────────────────────

  const suggestedRoutine = routinesData?.routines?.[0] ?? null;
  const recentPRs = progressSummary?.recentPRs ?? [];
  const activeDates = streakData?.activeDates ?? [];
  const streak = streakData?.streak ?? 0;
  const chartData: VolumeWeek[] = volumeData ?? [];
  const recentWorkouts: WorkoutListItem[] = recentWorkoutsData?.workouts ?? [];

  // ── Pull-to-refresh ────────────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  // ── Suggested routine start handler ───────────────────────────────────────

  function handleStartRoutine() {
    if (!suggestedRoutine) return;
    const exercises = (suggestedRoutine.exercises ?? []).map((e) => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exercise?.name ?? e.exerciseId,
      order: e.order,
      sets: [],
      notes: e.notes,
    }));
    startFromRoutine(suggestedRoutine.id, suggestedRoutine.name, exercises);
    router.push('/(app)/workout/active');
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C63FF"
            colors={['#6C63FF']}
          />
        }
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            {meLoading ? (
              <Skeleton width={140} height={28} borderRadius={6} style={{ marginTop: 4 }} />
            ) : (
              <Text style={styles.displayName}>
                {me?.displayName ?? me?.username ?? 'Athlete'}
              </Text>
            )}
          </View>

          {/* Streak badge — only shown when streak > 0 */}
          {!streakLoading && streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakFlame}>🔥</Text>
              <Text style={styles.streakCount}>{streak}</Text>
            </View>
          )}
        </View>

        {/* ── Quick actions ────────────────────────────────────────── */}
        <View style={styles.quickActionsRow}>
          <QuickAction
            icon="barbell-outline"
            label="Start Workout"
            color="#6C63FF"
            onPress={() => {
              startWorkout('Workout');
              router.push('/(app)/workout/active');
            }}
          />
          <QuickAction
            icon="restaurant-outline"
            label="Log Food"
            color="#10B981"
            onPress={() => router.push('/(app)/nutrition/log-food')}
          />
          <QuickAction
            icon="body-outline"
            label="Log Weight"
            color="#F59E0B"
            onPress={() => router.push('/(app)/progress/body')}
          />
        </View>

        {/* ── Recovery widget ───────────────────────────────────────── */}
        {recoveryLoading ? (
          <Skeleton height={110} borderRadius={16} style={{ marginBottom: 16 }} />
        ) : recoveryData ? (
          <View style={styles.cardSpacing}>
            <RecoveryWidget
              score={recoveryData.score}
              recommendation={recoveryData.recommendation}
              sleepHours={recoveryData.sleepHours}
              sorenessLevel={recoveryData.sorenessLevel}
            />
          </View>
        ) : null}

        {/* ── Deload recommendation ─────────────────────────────────── */}
        {deloadLoading ? (
          <Skeleton height={80} borderRadius={14} style={{ marginBottom: 16 }} />
        ) : deloadData?.shouldDeload ? (
          <View style={styles.cardSpacing}>
            <DeloadRecommendationCard recommendation={deloadData} />
          </View>
        ) : null}

        {/* ── AI weekly review ──────────────────────────────────────── */}
        {reviewLoading ? (
          <Skeleton height={100} borderRadius={16} style={{ marginBottom: 16 }} />
        ) : weeklyReview ? (
          <View style={styles.cardSpacing}>
            <WeeklyReviewCard review={weeklyReview} />
          </View>
        ) : null}

        {/* ── Suggested routine ─────────────────────────────────────── */}
        {routinesLoading ? (
          <Skeleton height={80} borderRadius={14} style={{ marginBottom: 24 }} />
        ) : suggestedRoutine ? (
          <Section title="Suggested Today" icon="flash-outline">
            <View style={styles.routineCard}>
              <View style={styles.routineInfo}>
                <Text style={styles.routineName} numberOfLines={1}>
                  {suggestedRoutine.name}
                </Text>
                {suggestedRoutine.exercises && suggestedRoutine.exercises.length > 0 && (
                  <Text style={styles.routineExercises} numberOfLines={1}>
                    {suggestedRoutine.exercises
                      .slice(0, 4)
                      .map((e) => e.exercise?.name ?? e.exerciseId)
                      .join(' · ')}
                    {suggestedRoutine.exercises.length > 4 ? ' …' : ''}
                  </Text>
                )}
                <Text style={styles.routineMeta}>
                  {suggestedRoutine._count?.exercises ?? suggestedRoutine.exercises?.length ?? 0} exercises
                </Text>
              </View>
              <TouchableOpacity
                style={styles.startRoutineBtn}
                onPress={handleStartRoutine}
                activeOpacity={0.8}
              >
                <Text style={styles.startRoutineText}>Start</Text>
              </TouchableOpacity>
            </View>
          </Section>
        ) : null}

        {/* ── Recent PRs ───────────────────────────────────────────── */}
        {progressLoading ? (
          <Skeleton height={90} borderRadius={14} style={{ marginBottom: 24 }} />
        ) : recentPRs.length > 0 ? (
          <Section title="Recent PRs" icon="trophy-outline">
            {recentPRs.slice(0, 3).map((pr) => (
              <TouchableOpacity
                key={pr.id}
                style={styles.prRow}
                onPress={() => router.push(`/(app)/progress/${pr.exerciseId}` as never)}
                activeOpacity={0.7}
              >
                <View style={styles.prBadge}>
                  <Text style={styles.prBadgeText}>PR</Text>
                </View>
                <View style={styles.prInfo}>
                  <Text style={styles.prName} numberOfLines={1}>{pr.exerciseName}</Text>
                  <Text style={styles.prMeta}>
                    {pr.weight}kg × {pr.reps} reps
                  </Text>
                </View>
                <Text style={styles.prDate}>
                  {new Date(pr.achievedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </TouchableOpacity>
            ))}
          </Section>
        ) : null}

        {/* ── Weekly Volume chart ────────────────────────────────────── */}
        <Section title="Weekly Volume" icon="bar-chart-outline">
          {volumeLoading ? (
            <Skeleton height={160} borderRadius={12} />
          ) : (
            <View style={styles.chartCard}>
              <VolumeChart data={chartData} />
            </View>
          )}
        </Section>

        {/* ── Streak / Activity calendar ────────────────────────────── */}
        {streakLoading ? (
          <Skeleton height={130} borderRadius={12} style={{ marginBottom: 24 }} />
        ) : (
          <Section title="Activity" icon="flame-outline">
            <View style={styles.calendarCard}>
              <StreakCalendar activeDates={activeDates} weeks={16} />
            </View>
          </Section>
        )}

        {/* ── Recent Workouts ───────────────────────────────────────── */}
        {recentWorkoutsLoading ? (
          <Skeleton height={150} borderRadius={14} style={{ marginBottom: 24 }} />
        ) : recentWorkouts.length > 0 ? (
          <Section title="Recent Workouts" icon="time-outline">
            <View style={styles.recentWorkoutsCard}>
              <TouchableOpacity
                style={styles.recentWorkoutsSeeAll}
                onPress={() => router.push('/(app)/workout/history' as never)}
                activeOpacity={0.7}
              >
                <Text style={styles.recentWorkoutsSeeAllText}>See all</Text>
                <Ionicons name="chevron-forward" size={13} color="#6C63FF" />
              </TouchableOpacity>
              {recentWorkouts.map((w, index) => (
                <TouchableOpacity
                  key={w.id}
                  style={[
                    styles.recentWorkoutRow,
                    index < recentWorkouts.length - 1 && styles.recentWorkoutRowBorder,
                  ]}
                  onPress={() => router.push(`/(app)/workout/${w.id}` as never)}
                  activeOpacity={0.7}
                >
                  <View style={styles.recentWorkoutInfo}>
                    <Text style={styles.recentWorkoutTitle} numberOfLines={1}>{w.title}</Text>
                    <Text style={styles.recentWorkoutMeta}>
                      {w.exercises.length} exercise{w.exercises.length !== 1 ? 's' : ''}
                      {'  ·  '}
                      {w.volume >= 1000
                        ? `${(w.volume / 1000).toFixed(1)}t`
                        : `${Math.round(w.volume)}kg`}
                    </Text>
                  </View>
                  <Text style={styles.recentWorkoutDate}>{timeAgo(w.completedAt)}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#444" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              ))}
            </View>
          </Section>
        ) : null}

        {/* Bottom padding */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 20,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  displayName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1a1a0a',
    borderWidth: 1,
    borderColor: '#3d3000',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  streakFlame: {
    fontSize: 16,
  },
  streakCount: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '800',
  },

  // Quick actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 8,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Card spacing
  cardSpacing: {
    marginBottom: 16,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Suggested routine card
  routineCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routineInfo: {
    flex: 1,
    minWidth: 0,
  },
  routineName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  routineExercises: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  routineMeta: {
    color: '#6C63FF',
    fontSize: 12,
    fontWeight: '500',
  },
  startRoutineBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  startRoutineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // PRs
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 10,
  },
  prBadge: {
    backgroundColor: '#F59E0B20',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  prBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  prInfo: {
    flex: 1,
    minWidth: 0,
  },
  prName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  prMeta: {
    color: '#888',
    fontSize: 12,
  },
  prDate: {
    color: '#555',
    fontSize: 12,
    flexShrink: 0,
  },

  // Charts
  chartCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 16,
  },
  calendarCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 16,
  },

  // Recent workouts
  recentWorkoutsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  recentWorkoutsSeeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 2,
  },
  recentWorkoutsSeeAllText: {
    color: '#6C63FF',
    fontSize: 12,
    fontWeight: '600',
  },
  recentWorkoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  recentWorkoutRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  recentWorkoutInfo: {
    flex: 1,
    minWidth: 0,
  },
  recentWorkoutTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  recentWorkoutMeta: {
    color: '#666',
    fontSize: 12,
  },
  recentWorkoutDate: {
    color: '#555',
    fontSize: 12,
    flexShrink: 0,
  },
});
