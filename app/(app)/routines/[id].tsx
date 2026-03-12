import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/api/client';
import { useWorkoutStore } from '../../../src/store/workout';
import { Routine } from '../../../src/types';

function useRoutine(id: string) {
  return useQuery<Routine>({
    queryKey: ['routine', id],
    queryFn: async () => (await api.get(`/api/routines/${id}`)).data,
    enabled: !!id,
  });
}

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: routine, isLoading } = useRoutine(id);
  const startFromRoutine = useWorkoutStore((s) => s.startFromRoutine);

  const handleStart = () => {
    if (!routine?.exercises) return;
    startFromRoutine(
      routine.id,
      routine.name,
      routine.exercises.map((e, i) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exercise.name,
        order: i,
        sets: Array.from({ length: e.targetSets }, (_, si) => ({
          order: si,
          type: 'NORMAL' as const,
          isCompleted: false,
          reps: e.targetReps,
        })),
      })),
    );
    router.push('/(app)/workout/active');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading} numberOfLines={1}>{routine?.name ?? '...'}</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push(`/(app)/routines/edit?id=${id}`)}
        >
          <Ionicons name="pencil-outline" size={18} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 40 }} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {routine?.description && <Text style={styles.desc}>{routine.description}</Text>}

            <Text style={styles.sectionLabel}>EXERCISES</Text>
            {(routine?.exercises ?? []).map((ex, i) => (
              <View key={ex.id} style={styles.exerciseRow}>
                <View style={styles.orderBadge}><Text style={styles.orderText}>{i + 1}</Text></View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{ex.exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {ex.targetSets} sets{ex.targetReps ? ` × ${ex.targetReps} reps` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
              <Ionicons name="play" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.startText}>Start Workout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  heading: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  content: { padding: 20, paddingBottom: 120 },
  desc: { color: '#888', fontSize: 15, marginBottom: 24, lineHeight: 22 },
  sectionLabel: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  exerciseRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  orderBadge: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#1a1a1a',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  orderText: { color: '#6C63FF', fontWeight: '700', fontSize: 14 },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 3 },
  exerciseMeta: { color: '#666', fontSize: 13 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, backgroundColor: '#0a0a0a', borderTopWidth: 1, borderTopColor: '#1a1a1a',
  },
  startBtn: {
    backgroundColor: '#6C63FF', borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
  },
  startText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#6C63FF22',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
