import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { confirmAction } from '../../../src/utils/confirm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/api/client';
import { useWorkoutStore } from '../../../src/store/workout';
import type { Routine, RoutineExercise } from '../../../src/types';

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchRoutine(id: string): Promise<Routine> {
  const { data } = await api.get(`/api/routines/${id}`);
  return data?.data ?? data;
}

async function deleteRoutine(id: string): Promise<void> {
  await api.delete(`/api/routines/${id}`);
}

async function duplicateRoutine(id: string): Promise<Routine> {
  const { data } = await api.post(`/api/routines/${id}/duplicate`);
  return data?.data ?? data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MUSCLE_COLORS: Record<string, string> = {
  CHEST: '#e74c3c',
  BACK: '#3498db',
  SHOULDERS: '#9b59b6',
  BICEPS: '#e67e22',
  TRICEPS: '#f39c12',
  QUADS: '#2ecc71',
  HAMSTRINGS: '#1abc9c',
  GLUTES: '#27ae60',
  CALVES: '#16a085',
  CORE: '#d35400',
  CARDIO: '#c0392b',
  FULL_BODY: '#3B82F6',
};

function getMuscleColor(muscle: string): string {
  return MUSCLE_COLORS[muscle] ?? '#3B82F6';
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ExerciseItemProps {
  exercise: RoutineExercise;
  index: number;
}

function ExerciseItem({ exercise, index }: ExerciseItemProps) {
  const muscleColor = getMuscleColor(exercise.exercise.primaryMuscle);

  return (
    <View style={styles.exerciseRow}>
      <View style={styles.orderBadge}>
        <Text style={styles.orderText}>{index + 1}</Text>
      </View>

      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
        <View style={styles.exerciseMeta}>
          <View style={[styles.muscleBadge, { backgroundColor: muscleColor + '33' }]}>
            <Text style={[styles.muscleBadgeText, { color: muscleColor }]}>
              {formatLabel(exercise.exercise.primaryMuscle)}
            </Text>
          </View>
          <Text style={styles.exerciseMetaText}>
            {exercise.targetSets} sets
            {exercise.targetReps ? ` × ${exercise.targetReps} reps` : ''}
          </Text>
        </View>
      </View>

      <Ionicons name="reorder-three-outline" size={18} color="#4A6080" />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const startFromRoutine = useWorkoutStore((s) => s.startFromRoutine);

  const { data: routine, isLoading, isError, refetch } = useQuery<Routine>({
    queryKey: ['routine', id],
    queryFn: () => fetchRoutine(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRoutine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      router.replace('/(app)/routines');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to delete routine. Please try again.');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateRoutine(id),
    onSuccess: (newRoutine) => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      Alert.alert('Duplicated', `"${newRoutine.name}" has been created.`, [
        { text: 'View', onPress: () => router.push(`/(screens)/routines/${newRoutine.id}`) },
        { text: 'OK' },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to duplicate routine. Please try again.');
    },
  });

  function handleDelete() {
    confirmAction(
      'Delete Routine',
      `Are you sure you want to delete "${routine?.name ?? 'this routine'}"? This cannot be undone.`,
      () => deleteMutation.mutate(),
    );
  }

  function handleDuplicate() {
    duplicateMutation.mutate();
  }

  function handleStart() {
    if (!routine?.exercises?.length) return;
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
    router.push('/(screens)/workout/active');
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>
        <View style={styles.centeredState}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (isError || !routine) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>
        <View style={styles.centeredState}>
          <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" />
          <Text style={styles.errorText}>Could not load routine</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Content ───────────────────────────────────────────────────────────────

  const exercises = routine.exercises ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>{routine.name}</Text>

        {/* Duplicate */}
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleDuplicate}
          disabled={duplicateMutation.isPending}
        >
          {duplicateMutation.isPending ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Ionicons name="copy-outline" size={20} color="#3B82F6" />
          )}
        </TouchableOpacity>

        {/* Edit */}
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.push(`/(screens)/routines/edit?id=${id}`)}
        >
          <Ionicons name="pencil-outline" size={20} color="#3B82F6" />
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? (
            <ActivityIndicator size="small" color="#e74c3c" />
          ) : (
            <Ionicons name="trash-outline" size={20} color="#e74c3c" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Description */}
        {routine.description ? (
          <Text style={styles.description}>{routine.description}</Text>
        ) : null}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="barbell-outline" size={16} color="#3B82F6" />
            <Text style={styles.statText}>
              {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Start workout button */}
        <TouchableOpacity
          style={[styles.startBtn, exercises.length === 0 && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={exercises.length === 0}
          activeOpacity={0.85}
        >
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.startText}>Start Workout</Text>
        </TouchableOpacity>

        {/* Exercises section */}
        <Text style={styles.sectionLabel}>EXERCISES</Text>

        {exercises.length === 0 ? (
          <View style={styles.emptyExercises}>
            <Ionicons name="barbell-outline" size={36} color="#162540" />
            <Text style={styles.emptyExercisesText}>No exercises in this routine</Text>
            <TouchableOpacity
              style={styles.addExerciseBtn}
              onPress={() => router.push(`/(screens)/routines/edit?id=${id}`)}
            >
              <Text style={styles.addExerciseBtnText}>Add Exercises</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.exerciseList}>
            {exercises.map((ex, index) => (
              <ExerciseItem key={ex.id} exercise={ex} index={index} />
            ))}
          </View>
        )}

        {/* Duplicate button at bottom */}
        <TouchableOpacity
          style={styles.duplicateBtn}
          onPress={handleDuplicate}
          disabled={duplicateMutation.isPending}
          activeOpacity={0.8}
        >
          <Ionicons name="copy-outline" size={18} color="#3B82F6" />
          <Text style={styles.duplicateText}>Duplicate Routine</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#162540',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 4,
  },

  // Scroll
  scrollContent: { padding: 20, paddingBottom: 60 },

  // Description
  description: {
    color: '#718FAF',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: '#718FAF', fontSize: 13 },

  // Start button
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 18,
    gap: 10,
    marginBottom: 28,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  startBtnDisabled: { opacity: 0.4 },
  startText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Section
  sectionLabel: {
    color: '#718FAF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Exercise list
  exerciseList: {
    backgroundColor: '#0B1326',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#162540',
    overflow: 'hidden',
    marginBottom: 24,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#162540',
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#060C1B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  orderText: { color: '#3B82F6', fontWeight: '700', fontSize: 14 },
  exerciseInfo: { flex: 1, marginRight: 8 },
  exerciseName: { color: '#fff', fontSize: 15, fontWeight: '600',
    fontFamily: 'DMSans-SemiBold', marginBottom: 5 },
  exerciseMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muscleBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  muscleBadgeText: { fontSize: 11, fontWeight: '600' },
  exerciseMetaText: { color: '#718FAF', fontSize: 13 },

  // Empty exercises
  emptyExercises: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
    backgroundColor: '#0B1326',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#162540',
    marginBottom: 24,
  },
  emptyExercisesText: { color: '#718FAF', fontSize: 14 },
  addExerciseBtn: {
    marginTop: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addExerciseBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Duplicate bottom button
  duplicateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0B1326',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#162540',
    paddingVertical: 14,
    marginBottom: 16,
  },
  duplicateText: { color: '#3B82F6', fontSize: 15, fontWeight: '600' },

  // States
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: '#e74c3c', fontSize: 15, fontWeight: '600' },
  retryBtn: {
    backgroundColor: '#0B1326',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#162540',
  },
  retryText: { color: '#3B82F6', fontWeight: '600', fontSize: 14 },
});
