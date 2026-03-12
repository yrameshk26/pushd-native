import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWorkoutStore } from '../../../src/store/workout';
import { formatDuration } from '../../../src/hooks/useWorkoutTimer';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { fetchWorkouts } from '../../../src/api/workouts';

export default function WorkoutScreen() {
  const active = useWorkoutStore((s) => s.active);
  const elapsed = useWorkoutStore((s) => s.elapsedSeconds);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  const { data } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => fetchWorkouts(undefined, 3),
  });

  const recentWorkouts = data?.workouts ?? [];

  // If there's an active workout, show resume banner
  if (active) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.heading}>Workout</Text>
          <TouchableOpacity style={styles.resumeCard} onPress={() => router.push('/(app)/workout/active')}>
            <View style={styles.resumeInfo}>
              <Text style={styles.resumeTitle}>{active.title}</Text>
              <Text style={styles.resumeTimer}>{formatDuration(elapsed)} · {active.exercises.length} exercises</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6C63FF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header with history button */}
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Workout</Text>
          <TouchableOpacity style={styles.historyBtn} onPress={() => router.push('/(app)/workout/history')}>
            <Ionicons name="time-outline" size={16} color="#6C63FF" />
            <Text style={styles.historyBtnText}>History</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sub}>Ready to train?</Text>

        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => { startWorkout('Workout'); router.push('/(app)/workout/active'); }}
        >
          <Ionicons name="barbell-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.startText}>Start Empty Workout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.routineBtn} onPress={() => router.push('/(app)/routines')}>
          <Ionicons name="list-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.routineText}>Start from Routine</Text>
        </TouchableOpacity>

        {/* Recent workouts preview */}
        {recentWorkouts.length > 0 && (
          <>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>Recent Workouts</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/workout/history')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            {recentWorkouts.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={styles.recentRow}
                onPress={() => router.push(`/(app)/workout/${w.id}`)}
              >
                <View style={styles.recentInfo}>
                  <Text style={styles.recentTitle} numberOfLines={1}>{w.title}</Text>
                  <Text style={styles.recentMeta}>
                    {new Date(w.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' · '}
                    {w.exercises.length} exercises
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#444" />
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { flex: 1, padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff' },
  historyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#1a1a2e', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: '#2a2a50',
  },
  historyBtnText: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },
  sub: { color: '#888', fontSize: 16, marginBottom: 28 },
  resumeCard: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: '#6C63FF', flexDirection: 'row',
    alignItems: 'center', marginBottom: 16,
  },
  resumeInfo: { flex: 1 },
  resumeTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  resumeTimer: { color: '#6C63FF', fontSize: 13 },
  startBtn: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginBottom: 14,
    flexDirection: 'row', justifyContent: 'center',
  },
  startText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  routineBtn: {
    backgroundColor: '#1a1a1a', borderRadius: 14, borderWidth: 1,
    borderColor: '#2a2a2a', paddingVertical: 18, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', marginBottom: 32,
  },
  routineText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: '#888', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  seeAllText: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },
  recentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a',
  },
  recentInfo: { flex: 1 },
  recentTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 3 },
  recentMeta: { color: '#666', fontSize: 13 },
});
