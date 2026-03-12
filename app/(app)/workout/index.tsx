import { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useWorkoutStore } from '../../../src/store/workout';
import { formatDuration } from '../../../src/hooks/useWorkoutTimer';
import { fetchWorkouts } from '../../../src/api/workouts';
import { WorkoutListItem } from '../../../src/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}kg`;
}

// ─── Recent Workout Row ──────────────────────────────────────────────────────

function RecentWorkoutRow({ workout }: { workout: WorkoutListItem }) {
  const handlePress = useCallback(() => {
    router.push(`/(app)/workout/${workout.id}`);
  }, [workout.id]);

  return (
    <TouchableOpacity
      style={styles.recentRow}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      <View style={styles.recentInfo}>
        <Text style={styles.recentTitle} numberOfLines={1}>{workout.title}</Text>
        <Text style={styles.recentMeta}>
          {relativeDate(workout.completedAt)}
          {' · '}
          {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
          {workout.volume > 0 ? ` · ${formatVolume(workout.volume)}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#444" />
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const active = useWorkoutStore((s) => s.active);
  const elapsedSeconds = useWorkoutStore((s) => s.elapsedSeconds);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  const { data, isLoading } = useQuery({
    queryKey: ['workouts', { limit: 3 }],
    queryFn: () => fetchWorkouts(undefined, 3),
  });

  const recentWorkouts: WorkoutListItem[] = data?.workouts ?? [];

  const handleStartEmpty = useCallback(() => {
    startWorkout('My Workout');
    router.push('/(app)/workout/active');
  }, [startWorkout]);

  const handleStartFromRoutine = useCallback(() => {
    router.push('/(app)/routines');
  }, []);

  const handleHistory = useCallback(() => {
    router.push('/(app)/workout/history');
  }, []);

  const handleResumeActive = useCallback(() => {
    router.push('/(app)/workout/active');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Workout</Text>
          <TouchableOpacity style={styles.historyBtn} onPress={handleHistory}>
            <Ionicons name="time-outline" size={16} color="#6C63FF" />
            <Text style={styles.historyBtnText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Active workout resume banner */}
        {active && (
          <TouchableOpacity
            style={styles.resumeBanner}
            onPress={handleResumeActive}
            activeOpacity={0.8}
          >
            <View style={styles.resumeLeft}>
              <View style={styles.resumeDot} />
              <View style={styles.resumeTextGroup}>
                <Text style={styles.resumeLabel}>Active Workout</Text>
                <Text style={styles.resumeTitle} numberOfLines={1}>{active.title}</Text>
                <Text style={styles.resumeMeta}>
                  {formatDuration(elapsedSeconds)} · {active.exercises.length} exercise{active.exercises.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <View style={styles.resumeChevronWrap}>
              <Text style={styles.resumeResumeTxt}>Resume</Text>
              <Ionicons name="chevron-forward" size={18} color="#6C63FF" />
            </View>
          </TouchableOpacity>
        )}

        {/* Start Empty Workout */}
        <TouchableOpacity
          style={styles.startBtn}
          onPress={handleStartEmpty}
          activeOpacity={0.85}
        >
          <Ionicons name="barbell-outline" size={20} color="#fff" style={styles.btnIcon} />
          <Text style={styles.startBtnText}>Start Empty Workout</Text>
        </TouchableOpacity>

        {/* Start from Routine */}
        <TouchableOpacity
          style={styles.routineBtn}
          onPress={handleStartFromRoutine}
          activeOpacity={0.85}
        >
          <Ionicons name="list-outline" size={20} color="#6C63FF" style={styles.btnIcon} />
          <Text style={styles.routineBtnText}>Start from Routine</Text>
        </TouchableOpacity>

        {/* Recent Workouts section */}
        {isLoading ? (
          <ActivityIndicator color="#6C63FF" style={styles.loadingSpinner} />
        ) : recentWorkouts.length > 0 ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Workouts</Text>
              <TouchableOpacity onPress={handleHistory}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>

            {recentWorkouts.map((w) => (
              <RecentWorkoutRow key={w.id} workout={w} />
            ))}
          </>
        ) : null}
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a50',
  },
  historyBtnText: {
    color: '#6C63FF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Resume banner
  resumeBanner: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#6C63FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  resumeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  resumeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6C63FF',
  },
  resumeTextGroup: {
    flex: 1,
  },
  resumeLabel: {
    color: '#6C63FF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  resumeTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  resumeMeta: {
    color: '#888',
    fontSize: 13,
  },
  resumeChevronWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resumeResumeTxt: {
    color: '#6C63FF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Buttons
  btnIcon: {
    marginRight: 8,
  },
  startBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 14,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  routineBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 32,
  },
  routineBtnText: {
    color: '#6C63FF',
    fontSize: 17,
    fontWeight: '600',
  },

  // Recent workouts
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  seeAllText: {
    color: '#6C63FF',
    fontSize: 13,
    fontWeight: '600',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  recentMeta: {
    color: '#666',
    fontSize: 13,
  },

  // Loading
  loadingSpinner: {
    marginTop: 20,
  },
});
