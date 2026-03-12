import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWorkoutStore } from '../../../src/store/workout';
import { formatDuration } from '../../../src/hooks/useWorkoutTimer';
import { Ionicons } from '@expo/vector-icons';

export default function WorkoutScreen() {
  const active = useWorkoutStore((s) => s.active);
  const elapsed = useWorkoutStore((s) => s.elapsedSeconds);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

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
        <Text style={styles.heading}>Workout</Text>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { flex: 1, padding: 20 },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  sub: { color: '#888', fontSize: 16, marginBottom: 48 },
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
    paddingVertical: 18, alignItems: 'center', marginBottom: 16,
    flexDirection: 'row', justifyContent: 'center',
  },
  startText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  routineBtn: {
    backgroundColor: '#1a1a1a', borderRadius: 14, borderWidth: 1,
    borderColor: '#2a2a2a', paddingVertical: 18, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center',
  },
  routineText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
