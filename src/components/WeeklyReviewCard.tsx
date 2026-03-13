import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeeklyReview {
  id: string;
  weekStart: string;
  workoutCount: number;
  totalVolume: number;
  totalSets: number;
  prCount: number;
  narrative: string | null;
}

interface WeeklyReviewCardProps {
  review: WeeklyReview;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeeklyReviewCard({ review }: WeeklyReviewCardProps) {
  const weekDate = review.weekStart ? new Date(review.weekStart.replace(' ', 'T')) : null;
  const weekLabel = weekDate && !isNaN(weekDate.getTime())
    ? weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;
  const totalVolume = review.totalVolume ?? 0;
  const volumeKg = Math.round(totalVolume);
  const volumeDisplay = totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${volumeKg}kg`;
  const workoutCount = review.workoutCount ?? 0;
  const prCount = review.prCount ?? 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={16} color="#c084fc" />
          <Text style={styles.headerTitle}>Weekly Review</Text>
        </View>
        {weekLabel ? <Text style={styles.weekLabel}>Week of {weekLabel}</Text> : null}
      </View>

      {/* 3 stat boxes */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="barbell-outline" size={14} color="#60a5fa" style={styles.statIcon} />
          <Text style={styles.statNumber}>{workoutCount}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="trending-up-outline" size={14} color="#34d399" style={styles.statIcon} />
          <Text style={styles.statNumber}>{volumeDisplay}</Text>
          <Text style={styles.statLabel}>Volume</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="trophy-outline" size={14} color="#fbbf24" style={styles.statIcon} />
          <Text style={styles.statNumber}>{prCount}</Text>
          <Text style={styles.statLabel}>PRs</Text>
        </View>
      </View>

      {/* Narrative */}
      {review.narrative ? (
        <Text style={styles.narrative}>{review.narrative}</Text>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a0533',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#7c3aed40',
    padding: 16,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: '#c084fc',
    fontSize: 14,
    fontWeight: '700',
  },
  weekLabel: {
    color: '#888',
    fontSize: 11,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#00000030',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 4,
  },
  statNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    color: '#888',
    fontSize: 10,
  },

  // Narrative
  narrative: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 19,
  },
});
