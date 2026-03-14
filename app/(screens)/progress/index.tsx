import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import {
  fetchProgressSummary,
  fetchUserStreak,
} from '../../../src/api/progress';
import { StatCard } from '../../../src/components/StatCard';
import { PRBadge } from '../../../src/components/PRBadge';
import { MuscleHeatmap } from '../../../src/components/MuscleHeatmap';
import { api } from '../../../src/api/client';

async function fetchMuscleHeatmap(): Promise<Record<string, number>> {
  const { data } = await api.get<{ data: { muscle: string; sets: number }[] }>(
    '/api/progress/muscle-heatmap',
  );
  const items = data?.data ?? [];
  const maxSets = Math.max(...items.map((m) => m.sets), 1);
  const result: Record<string, number> = {};
  for (const item of items) {
    result[item.muscle] = Math.min(1, item.sets / maxSets);
  }
  return result;
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg).toLocaleString()}kg`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getPRsThisMonth(summary: { recentPRs?: { achievedAt: string }[] } | undefined): number {
  if (!summary?.recentPRs) return 0;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return summary.recentPRs.filter((pr) => new Date(pr.achievedAt) >= startOfMonth).length;
}

export default function ProgressScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['progress-summary'],
    queryFn: fetchProgressSummary,
  });

  const {
    data: streakData,
    isLoading: streakLoading,
    refetch: refetchStreak,
  } = useQuery({
    queryKey: ['user-streak'],
    queryFn: fetchUserStreak,
  });

  const {
    data: heatmapData,
    isLoading: heatmapLoading,
    refetch: refetchHeatmap,
  } = useQuery({
    queryKey: ['muscle-heatmap'],
    queryFn: fetchMuscleHeatmap,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchStreak(), refetchHeatmap()]);
    setRefreshing(false);
  }, [refetchSummary, refetchStreak, refetchHeatmap]);

  const isLoading = summaryLoading || streakLoading;
  const prsThisMonth = getPRsThisMonth(summary);
  const currentStreak = summary?.currentStreak ?? streakData?.streak ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
      >
        <Text style={styles.heading}>Progress</Text>

        {isLoading ? (
          <ActivityIndicator color="#3B82F6" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Stats Grid: Total Workouts, Total Volume, PRs This Month, Current Streak */}
            <View style={styles.grid}>
              <StatCard
                value={summary?.totalWorkouts ?? 0}
                label="Total Workouts"
                icon="barbell-outline"
                color="#3B82F6"
              />
              <StatCard
                value={formatVolume(summary?.totalVolume ?? 0)}
                label="Total Volume"
                icon="layers-outline"
                color="#10B981"
              />
              <StatCard
                value={prsThisMonth}
                label="PRs This Month"
                icon="trophy-outline"
                color="#F59E0B"
              />
              <StatCard
                value={`${currentStreak}🔥`}
                label="Current Streak"
                icon="flame-outline"
                color="#EF4444"
              />
            </View>

            {/* Quick Links Row */}
            <View style={styles.quickLinksRow}>
              <TouchableOpacity
                style={styles.quickLink}
                onPress={() => router.push('/(screens)/progress/body')}
              >
                <Ionicons name="body-outline" size={22} color="#10B981" />
                <Text style={styles.quickLinkText}>Body Weight</Text>
                <Ionicons name="chevron-forward" size={16} color="#718FAF" style={styles.chevron} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLink}
                onPress={() => router.push('/(screens)/progress/strength-standards')}
              >
                <Ionicons name="stats-chart-outline" size={22} color="#F59E0B" />
                <Text style={styles.quickLinkText}>Strength Standards</Text>
                <Ionicons name="chevron-forward" size={16} color="#718FAF" style={styles.chevron} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLink}
                onPress={() => router.push('/(screens)/progress/achievements')}
              >
                <Ionicons name="medal-outline" size={22} color="#3B82F6" />
                <Text style={styles.quickLinkText}>Achievements</Text>
                {(summary?.achievementCount ?? 0) > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{summary?.achievementCount}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color="#718FAF" style={styles.chevron} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLink}
                onPress={() => router.push('/(screens)/progress/volume')}
              >
                <Ionicons name="bar-chart-outline" size={22} color="#3B82F6" />
                <Text style={styles.quickLinkText}>Volume Trends</Text>
                <Ionicons name="chevron-forward" size={16} color="#718FAF" style={styles.chevron} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickLink, styles.quickLinkLast]}
                onPress={() => router.push('/(screens)/progress/summary')}
              >
                <Ionicons name="document-text-outline" size={22} color="#A78BFA" />
                <Text style={styles.quickLinkText}>Weekly Summary</Text>
                <Ionicons name="chevron-forward" size={16} color="#718FAF" style={styles.chevron} />
              </TouchableOpacity>
            </View>

            {/* Muscle Heatmap */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Muscle Activity This Week</Text>
              <View style={styles.heatmapCard}>
                {heatmapLoading ? (
                  <ActivityIndicator color="#3B82F6" style={{ paddingVertical: 24 }} />
                ) : (
                  <MuscleHeatmap muscleData={heatmapData ?? {}} />
                )}
              </View>
            </View>

            {/* Recent PRs */}
            {(summary?.recentPRs?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Personal Records</Text>
                {summary!.recentPRs.map((pr) => (
                  <TouchableOpacity
                    key={pr.id}
                    style={styles.prRow}
                    onPress={() => router.push(`/(screens)/progress/${pr.exerciseId}` as any)}
                  >
                    <View style={styles.prLeft}>
                      <PRBadge size="sm" />
                      <View style={styles.prTextWrap}>
                        <Text style={styles.prName} numberOfLines={1}>
                          {pr.exerciseName}
                        </Text>
                        <Text style={styles.prMeta}>
                          {pr.weight}kg × {pr.reps} reps
                        </Text>
                      </View>
                    </View>
                    <View style={styles.prRight}>
                      <Text style={styles.prDate}>{formatDate(pr.achievedAt)}</Text>
                      <Ionicons name="chevron-forward" size={14} color="#718FAF" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Popular Exercises */}
            {(summary?.popularExercises?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Most Trained Exercises</Text>
                {summary!.popularExercises.map((ex, index) => (
                  <TouchableOpacity
                    key={ex.exerciseId}
                    style={styles.exerciseRow}
                    onPress={() => router.push(`/(screens)/progress/${ex.exerciseId}` as any)}
                  >
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.exerciseName} numberOfLines={1}>
                      {ex.exerciseName}
                    </Text>
                    <Text style={styles.exerciseCount}>{ex.sessionCount} sessions</Text>
                    <Ionicons name="chevron-forward" size={16} color="#718FAF" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 28, fontFamily: 'BarlowCondensed-Bold', color: '#fff', marginBottom: 20 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },

  quickLinksRow: {
    backgroundColor: '#0B1326',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#162540',
    marginBottom: 24,
    overflow: 'hidden',
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#162540',
  },
  quickLinkLast: { borderBottomWidth: 0 },
  quickLinkText: { color: '#fff', fontSize: 15, fontFamily: 'DMSans-Medium', flex: 1 },
  chevron: { marginLeft: 'auto' },
  countBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countBadgeText: { color: '#fff', fontSize: 11, fontFamily: 'DMSans-Bold' },

  section: { marginBottom: 24 },
  sectionTitle: {
    color: '#718FAF',
    fontSize: 11,
    fontFamily: 'BarlowCondensed-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  heatmapCard: {
    backgroundColor: '#0B1326',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#162540',
  },

  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B1326',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#162540',
  },
  prLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  prTextWrap: { flex: 1 },
  prRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prName: { color: '#fff', fontSize: 14, fontFamily: 'DMSans-SemiBold' },
  prMeta: { color: '#718FAF', fontSize: 12, marginTop: 2, fontFamily: 'DMSans-Regular' },
  prDate: { color: '#4A6080', fontSize: 12, fontFamily: 'DMSans-Regular' },

  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1326',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#162540',
    gap: 10,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#162540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: '#718FAF', fontSize: 13, fontFamily: 'DMSans-Bold' },
  exerciseName: { color: '#fff', fontSize: 14, fontFamily: 'DMSans-SemiBold', flex: 1 },
  exerciseCount: { color: '#3B82F6', fontSize: 13, fontFamily: 'DMSans-Medium' },
});
