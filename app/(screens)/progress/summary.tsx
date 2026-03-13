import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../src/api/client';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PREntry {
  id: string;
  exerciseName: string;
  weight: number | null;
  reps: number | null;
  completedAt: string | null;
}

interface TopExercise {
  name: string;
  sets: number;
}

interface MuscleFrequency {
  muscle: string;
  sessions: number;
}

interface WeekComparison {
  totalWorkouts: number;
  totalSets: number;
  totalVolume: number;
  workoutsChange: number;   // % change vs previous week
  setsChange: number;
  volumeChange: number;
}

interface WeeklyReviewInsight {
  bullets: string[];
}

interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalWorkouts: number;
  totalSets: number;
  totalVolume: number;
  totalDuration: number;
  newPRs: PREntry[];
  topExercises: TopExercise[];
  muscleFrequency: MuscleFrequency[];
  comparison?: WeekComparison;
  aiInsights?: WeeklyReviewInsight;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const MUSCLE_LABELS: Record<string, string> = {
  CHEST: 'Chest',
  BACK: 'Back',
  SHOULDERS: 'Shoulders',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  FOREARMS: 'Forearms',
  CORE: 'Core',
  ABS: 'Abs',
  GLUTES: 'Glutes',
  QUADS: 'Quads',
  HAMSTRINGS: 'Hamstrings',
  CALVES: 'Calves',
  FULL_BODY: 'Full Body',
  CARDIO: 'Cardio',
};

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg).toLocaleString()}kg`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatDateRange(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = new Date(startIso).toLocaleDateString(undefined, opts);
  const end = new Date(endIso).toLocaleDateString(undefined, opts);
  return `${start} – ${end}`;
}

async function fetchWeeklySummary(): Promise<WeeklySummary> {
  // Try the weekly-review AI endpoint first, fall back to progress/summary
  try {
    const { data } = await api.get<WeeklySummary>('/api/ai/weekly-review');
    return data;
  } catch {
    const { data } = await api.get<WeeklySummary>('/api/progress/summary?period=weekly');
    return data;
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface ChangeIndicatorProps {
  pct: number;
}

function ChangeIndicator({ pct }: ChangeIndicatorProps) {
  const isUp = pct >= 0;
  const color = isUp ? '#10B981' : '#EF4444';
  const icon = isUp ? 'arrow-up' : 'arrow-down';

  return (
    <View style={[changeStyles.pill, { borderColor: color + '44' }]}>
      <Ionicons name={icon as any} size={10} color={color} />
      <Text style={[changeStyles.text, { color }]}>
        {Math.abs(pct).toFixed(0)}%
      </Text>
    </View>
  );
}

const changeStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  text: { fontSize: 10, fontFamily: 'DMSans-Bold' },
});

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function SummaryScreen() {
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['weekly-summary'],
    queryFn: fetchWeeklySummary,
  });

  const isEmpty = !isLoading && !isError && data && data.totalWorkouts === 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly Summary</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color="#3B82F6" size="large" />
          </View>
        )}

        {isError && !isLoading && (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={40} color="#4A6080" />
            <Text style={styles.errorText}>Failed to load summary</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {isEmpty && (
          <View style={styles.centered}>
            <Ionicons name="barbell-outline" size={40} color="#162540" />
            <Text style={styles.emptyTitle}>No Workouts This Week</Text>
            <Text style={styles.emptyText}>Complete your first workout to see your summary.</Text>
          </View>
        )}

        {!isLoading && !isError && data && !isEmpty && (
          <>
            {/* Week date range */}
            {data.weekStart && data.weekEnd && (
              <Text style={styles.dateRange}>
                {formatDateRange(data.weekStart, data.weekEnd)}
              </Text>
            )}

            {/* Core stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="flame-outline" size={18} color="#F59E0B" style={styles.statIcon} />
                <Text style={styles.statValue}>{data.totalWorkouts}</Text>
                <Text style={styles.statLabel}>Workouts</Text>
                {data.comparison && <ChangeIndicator pct={data.comparison.workoutsChange} />}
              </View>
              <View style={styles.statCard}>
                <Ionicons name="list-outline" size={18} color="#3B82F6" style={styles.statIcon} />
                <Text style={styles.statValue}>{data.totalSets.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total Sets</Text>
                {data.comparison && <ChangeIndicator pct={data.comparison.setsChange} />}
              </View>
              <View style={styles.statCard}>
                <Ionicons name="layers-outline" size={18} color="#10B981" style={styles.statIcon} />
                <Text style={styles.statValue}>{formatVolume(data.totalVolume)}</Text>
                <Text style={styles.statLabel}>Volume</Text>
                {data.comparison && <ChangeIndicator pct={data.comparison.volumeChange} />}
              </View>
              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={18} color="#60A5FA" style={styles.statIcon} />
                <Text style={styles.statValue}>{formatDuration(data.totalDuration)}</Text>
                <Text style={styles.statLabel}>Time</Text>
              </View>
            </View>

            {/* PRs this week */}
            {data.newPRs.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="trophy-outline" size={16} color="#F59E0B" />
                  <Text style={styles.cardTitle}>PRs This Week</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{data.newPRs.length}</Text>
                  </View>
                </View>
                {data.newPRs.slice(0, 8).map((pr) => (
                  <View key={pr.id} style={styles.prRow}>
                    <Text style={styles.prName} numberOfLines={1}>
                      {pr.exerciseName}
                    </Text>
                    {pr.weight != null && (
                      <Text style={styles.prValue}>
                        {pr.weight}kg × {pr.reps}
                      </Text>
                    )}
                  </View>
                ))}
                {data.newPRs.length > 8 && (
                  <Text style={styles.moreText}>+{data.newPRs.length - 8} more PRs</Text>
                )}
              </View>
            )}

            {/* Top exercises */}
            {data.topExercises.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="barbell-outline" size={16} color="#3B82F6" />
                  <Text style={styles.cardTitle}>Top Exercises</Text>
                </View>
                {data.topExercises.map((ex, idx) => (
                  <View key={ex.name} style={styles.exerciseRow}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.exerciseName} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <Text style={styles.exerciseSets}>{ex.sets} sets</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Muscle groups trained */}
            {data.muscleFrequency && data.muscleFrequency.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="body-outline" size={16} color="#10B981" />
                  <Text style={styles.cardTitle}>Muscle Groups</Text>
                </View>
                <View style={styles.muscleChips}>
                  {data.muscleFrequency
                    .slice()
                    .sort((a, b) => b.sessions - a.sessions)
                    .map((item) => (
                      <View key={item.muscle} style={styles.muscleChip}>
                        <Text style={styles.muscleChipText}>
                          {MUSCLE_LABELS[item.muscle] ?? item.muscle}
                        </Text>
                        <Text style={styles.muscleChipCount}>{item.sessions}x</Text>
                      </View>
                    ))}
                </View>
              </View>
            )}

            {/* AI Insights */}
            {data.aiInsights && data.aiInsights.bullets.length > 0 && (
              <View style={[styles.card, styles.aiCard]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="sparkles-outline" size={16} color="#A78BFA" />
                  <Text style={[styles.cardTitle, { color: '#A78BFA' }]}>AI Insights</Text>
                </View>
                {data.aiInsights.bullets.map((bullet, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0B1326',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'BarlowCondensed-Bold', color: '#fff', flex: 1 },

  content: { padding: 20, paddingBottom: 48 },

  centered: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  errorText: { color: '#4A6080', fontSize: 14, fontFamily: 'DMSans-Regular' },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#0B1326',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#162540',
  },
  retryText: { color: '#3B82F6', fontSize: 14, fontFamily: 'DMSans-SemiBold' },

  emptyTitle: { color: '#A8BDD4', fontSize: 16, fontFamily: 'DMSans-SemiBold' },
  emptyText: { color: '#4A6080', fontSize: 13, textAlign: 'center', maxWidth: 260, fontFamily: 'DMSans-Regular' },

  dateRange: {
    color: '#718FAF',
    fontSize: 13,
    fontFamily: 'DMSans-Medium',
    marginBottom: 16,
    textAlign: 'center',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#0B1326',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#162540',
    alignItems: 'flex-start',
    gap: 4,
  },
  statIcon: { marginBottom: 2 },
  statValue: { fontSize: 22, fontFamily: 'BarlowCondensed-ExtraBold', color: '#fff' },
  statLabel: { color: '#718FAF', fontSize: 11, fontFamily: 'DMSans-Medium' },

  card: {
    backgroundColor: '#0B1326',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#162540',
    marginBottom: 14,
  },
  aiCard: {
    borderColor: '#A78BFA44',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#718FAF',
    fontSize: 11,
    fontFamily: 'BarlowCondensed-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#F59E0B22',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countBadgeText: { color: '#F59E0B', fontSize: 11, fontFamily: 'DMSans-Bold' },

  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#162540',
  },
  prName: { color: '#A8BDD4', fontSize: 14, flex: 1, fontFamily: 'DMSans-Regular' },
  prValue: { color: '#3B82F6', fontSize: 13, fontFamily: 'DMSans-Bold' },
  moreText: { color: '#4A6080', fontSize: 12, marginTop: 8, fontFamily: 'DMSans-Regular' },

  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#162540',
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#162540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: '#718FAF', fontSize: 11, fontFamily: 'DMSans-Bold' },
  exerciseName: { color: '#A8BDD4', fontSize: 14, flex: 1, fontFamily: 'DMSans-Regular' },
  exerciseSets: { color: '#3B82F6', fontSize: 12, fontFamily: 'DMSans-Medium' },

  muscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muscleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B98115',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  muscleChipText: { color: '#10B981', fontSize: 12, fontFamily: 'DMSans-Medium' },
  muscleChipCount: { color: '#10B98199', fontSize: 11, fontFamily: 'DMSans-SemiBold' },

  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A78BFA',
    marginTop: 5,
    flexShrink: 0,
  },
  bulletText: { color: '#A8BDD4', fontSize: 13, lineHeight: 20, flex: 1, fontFamily: 'DMSans-Regular' },
});
