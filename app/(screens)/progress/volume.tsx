import React, { useState } from 'react';
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

type WeekRange = 4 | 8 | 12;

interface WeeklyVolumeBucket {
  week: string;       // e.g. "Mar 3"
  volume: number;
  sets: number;
  workouts: number;
}

interface MuscleBreakdown {
  muscle: string;
  volume: number;
  percentage: number;
}

interface VolumeResponse {
  data: WeeklyVolumeBucket[];
  muscleBreakdown?: MuscleBreakdown[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const WEEK_RANGES: WeekRange[] = [4, 8, 12];

const RANGE_LABELS: Record<WeekRange, string> = {
  4: '4 Weeks',
  8: '8 Weeks',
  12: '12 Weeks',
};

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

function computeStats(buckets: WeeklyVolumeBucket[]): {
  monthlyTotal: number;
  avgPerWeek: number;
  trendPct: number;
} {
  if (buckets.length === 0) {
    return { monthlyTotal: 0, avgPerWeek: 0, trendPct: 0 };
  }

  // Month total = last 4 weeks
  const last4 = buckets.slice(-4);
  const monthlyTotal = last4.reduce((s, b) => s + b.volume, 0);
  const avgPerWeek = buckets.reduce((s, b) => s + b.volume, 0) / buckets.length;

  // Trend: compare second half avg vs first half avg
  const half = Math.floor(buckets.length / 2);
  const firstHalf = buckets.slice(0, half);
  const secondHalf = buckets.slice(half);
  const firstAvg = firstHalf.reduce((s, b) => s + b.volume, 0) / (firstHalf.length || 1);
  const secondAvg = secondHalf.reduce((s, b) => s + b.volume, 0) / (secondHalf.length || 1);
  const trendPct = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

  return { monthlyTotal, avgPerWeek, trendPct };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface BarChartProps {
  buckets: WeeklyVolumeBucket[];
}

function VolumeBarChart({ buckets }: BarChartProps) {
  const maxVolume = Math.max(...buckets.map((b) => b.volume), 1);
  const BAR_MAX_HEIGHT = 120;

  return (
    <View style={chartStyles.container}>
      {buckets.map((bucket, idx) => {
        const heightPct = bucket.volume / maxVolume;
        const barHeight = Math.max(4, Math.round(heightPct * BAR_MAX_HEIGHT));

        return (
          <View key={idx} style={chartStyles.barCol}>
            <View style={chartStyles.barTrack}>
              <View
                style={[
                  chartStyles.bar,
                  { height: barHeight },
                  bucket.volume === 0 && chartStyles.barEmpty,
                ]}
              />
            </View>
            <Text style={chartStyles.barLabel} numberOfLines={1}>
              {bucket.week}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    paddingBottom: 24,
    gap: 3,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '85%',
    backgroundColor: '#6C63FF',
    borderRadius: 4,
    minHeight: 4,
  },
  barEmpty: {
    backgroundColor: '#2a2a2a',
  },
  barLabel: {
    color: '#555',
    fontSize: 8,
    marginTop: 4,
    textAlign: 'center',
  },
});

// ── Screen ─────────────────────────────────────────────────────────────────────

async function fetchVolumeData(weeks: number): Promise<VolumeResponse> {
  const { data } = await api.get<VolumeResponse>(
    `/api/progress/volume?weeks=${weeks}&period=weekly`,
  );
  return data;
}

export default function VolumeScreen() {
  const router = useRouter();
  const [weekRange, setWeekRange] = useState<WeekRange>(12);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['progress-volume', weekRange],
    queryFn: () => fetchVolumeData(weekRange),
  });

  const buckets = data?.data ?? [];
  const muscleBreakdown = data?.muscleBreakdown ?? [];
  const stats = computeStats(buckets);

  const trendUp = stats.trendPct >= 0;
  const trendAbs = Math.abs(stats.trendPct);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Volume Trends</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Time range filter chips */}
        <View style={styles.chipRow}>
          {WEEK_RANGES.map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.chip, weekRange === range && styles.chipActive]}
              onPress={() => setWeekRange(range)}
            >
              <Text style={[styles.chipText, weekRange === range && styles.chipTextActive]}>
                {RANGE_LABELS[range]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color="#6C63FF" size="large" />
          </View>
        )}

        {isError && !isLoading && (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={40} color="#555" />
            <Text style={styles.errorText}>Failed to load volume data</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !isError && (
          <>
            {/* Stats summary cards */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatVolume(stats.monthlyTotal)}</Text>
                <Text style={styles.statLabel}>This Month</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatVolume(stats.avgPerWeek)}</Text>
                <Text style={styles.statLabel}>Avg / Week</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.trendRow}>
                  <Ionicons
                    name={trendUp ? 'trending-up' : 'trending-down'}
                    size={18}
                    color={trendUp ? '#10B981' : '#EF4444'}
                  />
                  <Text style={[styles.statValue, { color: trendUp ? '#10B981' : '#EF4444' }]}>
                    {trendAbs.toFixed(0)}%
                  </Text>
                </View>
                <Text style={styles.statLabel}>Trend</Text>
              </View>
            </View>

            {/* Bar chart */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weekly Volume</Text>
              {buckets.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="barbell-outline" size={32} color="#333" />
                  <Text style={styles.emptyText}>No workouts yet. Start training!</Text>
                </View>
              ) : (
                <VolumeBarChart buckets={buckets} />
              )}
            </View>

            {/* Muscle group breakdown */}
            {muscleBreakdown.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Muscle Group Breakdown</Text>
                {muscleBreakdown
                  .slice()
                  .sort((a, b) => b.percentage - a.percentage)
                  .map((item) => (
                    <View key={item.muscle} style={styles.muscleRow}>
                      <Text style={styles.muscleLabel} numberOfLines={1}>
                        {MUSCLE_LABELS[item.muscle] ?? item.muscle}
                      </Text>
                      <View style={styles.muscleBarTrack}>
                        <View
                          style={[
                            styles.muscleBar,
                            { width: `${Math.min(100, item.percentage)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.musclePct}>{Math.round(item.percentage)}%</Text>
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
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },

  content: { padding: 20, paddingBottom: 48 },

  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  chipActive: {
    backgroundColor: '#6C63FF22',
    borderColor: '#6C63FF',
  },
  chipText: { color: '#888', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#6C63FF', fontWeight: '700' },

  centered: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  errorText: { color: '#555', fontSize: 14, marginTop: 8 },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  retryText: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  statLabel: { color: '#666', fontSize: 11, fontWeight: '500', textAlign: 'center' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },

  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyText: { color: '#555', fontSize: 13 },

  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  muscleLabel: { color: '#ccc', fontSize: 13, width: 90 },
  muscleBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  muscleBar: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 4,
  },
  musclePct: { color: '#666', fontSize: 12, width: 34, textAlign: 'right' },
});
