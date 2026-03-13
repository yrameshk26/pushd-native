import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api/client';
import { ExercisePicker } from '../../../src/components/ExercisePicker';
import { Exercise } from '../../../src/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoutineExerciseItem {
  localId: string;
  exercise: Exercise;
  sets: number;
  reps: string;
  weight: string; // targetWeight — empty string means no weight
}

// ─── Constants ────────────────────────────────────────────────────────────────


function generateLocalId(): string {
  return Math.random().toString(36).slice(2);
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────

interface ExerciseRowProps {
  item: RoutineExerciseItem;
  index: number;
  total: number;
  onChange: (updates: Partial<RoutineExerciseItem>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function ExerciseRow({ item, index, total, onChange, onRemove, onMoveUp, onMoveDown }: ExerciseRowProps) {
  return (
    <View style={rowStyles.card}>
      {/* Header row */}
      <View style={rowStyles.headerRow}>
        <View style={rowStyles.orderBadge}>
          <Text style={rowStyles.orderText}>{index + 1}</Text>
        </View>
        <Text style={rowStyles.name} numberOfLines={1}>{item.exercise.name}</Text>
        <View style={rowStyles.actions}>
          <TouchableOpacity
            style={[rowStyles.arrowBtn, index === 0 && rowStyles.arrowBtnDisabled]}
            onPress={onMoveUp}
            disabled={index === 0}
          >
            <Ionicons name="chevron-up" size={16} color={index === 0 ? '#333' : '#888'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[rowStyles.arrowBtn, index === total - 1 && rowStyles.arrowBtnDisabled]}
            onPress={onMoveDown}
            disabled={index === total - 1}
          >
            <Ionicons name="chevron-down" size={16} color={index === total - 1 ? '#333' : '#888'} />
          </TouchableOpacity>
          <TouchableOpacity style={rowStyles.removeBtn} onPress={onRemove}>
            <Ionicons name="close-circle" size={20} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Fields */}
      <View style={rowStyles.fields}>
        {/* Sets stepper */}
        <View style={rowStyles.fieldGroup}>
          <Text style={rowStyles.fieldLabel}>SETS</Text>
          <View style={rowStyles.stepper}>
            <TouchableOpacity
              style={rowStyles.stepBtn}
              onPress={() => onChange({ sets: Math.max(1, item.sets - 1) })}
            >
              <Text style={rowStyles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={rowStyles.stepValue}>{item.sets}</Text>
            <TouchableOpacity
              style={rowStyles.stepBtn}
              onPress={() => onChange({ sets: Math.min(20, item.sets + 1) })}
            >
              <Text style={rowStyles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reps input */}
        <View style={rowStyles.fieldGroup}>
          <Text style={rowStyles.fieldLabel}>REPS</Text>
          <TextInput
            style={rowStyles.numInput}
            value={item.reps}
            onChangeText={(v) => onChange({ reps: v })}
            keyboardType="numeric"
            placeholder="10"
            placeholderTextColor="#444"
            maxLength={4}
          />
        </View>

        {/* Weight input */}
        <View style={rowStyles.fieldGroup}>
          <Text style={rowStyles.fieldLabel}>WEIGHT KG</Text>
          <TextInput
            style={rowStyles.numInput}
            value={item.weight}
            onChangeText={(v) => onChange({ weight: v })}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor="#444"
            maxLength={6}
          />
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EditRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<RoutineExerciseItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Fetch existing routine
  const { data: routine, isLoading, isError } = useQuery({
    queryKey: ['routine', id],
    queryFn: async () => (await api.get(`/api/routines/${id}`)).data,
    enabled: !!id,
  });

  // Populate form once data arrives
  useEffect(() => {
    if (!routine || initialized) return;
    const r = routine?.data ?? routine;
    setName(r.name ?? '');
    setDescription(r.description ?? '');
    setExercises(
      (r.exercises ?? []).map((ex: {
        exercise: Exercise;
        targetSets: number;
        targetReps?: number | null;
        targetWeight?: number | null;
      }) => ({
        localId: generateLocalId(),
        exercise: ex.exercise,
        sets: ex.targetSets ?? 3,
        reps: ex.targetReps != null ? String(ex.targetReps) : '10',
        weight: ex.targetWeight != null ? String(ex.targetWeight) : '',
      }))
    );
    setInitialized(true);
  }, [routine, initialized]);

  // Save mutation
  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const res = await api.put(`/api/routines/${id}`, {
        name: name.trim(),
        description: description.trim() || undefined,
        exercises: exercises.map((e, i) => {
          const targetReps = e.reps.trim() ? parseInt(e.reps, 10) || undefined : undefined;
          const targetWeight = e.weight.trim() ? parseFloat(e.weight) || undefined : undefined;
          return {
            exerciseId: e.exercise.id,
            order: i,
            targetSets: e.sets,
            ...(targetReps !== undefined && { targetReps }),
            ...(targetWeight !== undefined && { targetWeight }),
          };
        }),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      queryClient.invalidateQueries({ queryKey: ['routine', id] });
      router.back();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to save routine';
      setError(msg);
    },
  });

  // Delete mutation
  const { mutate: deleteRoutine, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/routines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      router.replace('/(app)/routines');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to delete routine';
      Alert.alert('Error', msg);
    },
  });

  function handleAddExercise(exercise: Exercise) {
    setExercises((prev) => [
      ...prev,
      { localId: generateLocalId(), exercise, sets: 3, reps: '10', weight: '' },
    ]);
  }

  function updateExercise(localId: string, updates: Partial<RoutineExerciseItem>) {
    setExercises((prev) =>
      prev.map((e) => (e.localId === localId ? { ...e, ...updates } : e))
    );
  }

  function removeExercise(localId: string) {
    setExercises((prev) => prev.filter((e) => e.localId !== localId));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setExercises((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  }

  function moveDown(index: number) {
    setExercises((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  }

  function handleSave() {
    setError('');
    if (!name.trim()) {
      setError('Routine name is required');
      return;
    }
    if (exercises.length === 0) {
      setError('Add at least one exercise');
      return;
    }
    save();
  }

  function confirmDelete() {
    Alert.alert(
      'Delete Routine',
      `Are you sure you want to delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteRoutine() },
      ]
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heading}>Edit Routine</Text>
          <View style={{ width: 64 }} />
        </View>
        <View style={styles.centeredState}>
          <ActivityIndicator color="#6C63FF" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heading}>Edit Routine</Text>
          <View style={{ width: 64 }} />
        </View>
        <View style={styles.centeredState}>
          <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" />
          <Text style={styles.errorStateText}>Could not load routine</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>Edit Routine</Text>
        <TouchableOpacity
          style={[styles.saveBtn, (isSaving || !name.trim() || exercises.length === 0) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving || !name.trim() || exercises.length === 0}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Name */}
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="Routine name"
          placeholderTextColor="#444"
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* Description */}
        <TextInput
          style={styles.descInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Description (optional)"
          placeholderTextColor="#444"
          multiline
          numberOfLines={2}
          returnKeyType="done"
        />

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#e74c3c" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Exercise list */}
        {exercises.length > 0 && (
          <View style={styles.exerciseList}>
            <Text style={styles.sectionLabel}>EXERCISES</Text>
            {exercises.map((item, index) => (
              <ExerciseRow
                key={item.localId}
                item={item}
                index={index}
                total={exercises.length}
                onChange={(updates) => updateExercise(item.localId, updates)}
                onRemove={() => removeExercise(item.localId)}
                onMoveUp={() => moveUp(index)}
                onMoveDown={() => moveDown(index)}
              />
            ))}
          </View>
        )}

        {/* Add exercise button */}
        <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setShowPicker(true)}>
          <Ionicons name="add-circle-outline" size={20} color="#6C63FF" />
          <Text style={styles.addExerciseBtnText}>Add Exercise</Text>
        </TouchableOpacity>

        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={confirmDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#e74c3c" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color="#e74c3c" />
              <Text style={styles.deleteBtnText}>Delete Routine</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Exercise picker modal */}
      <ExercisePicker
        visible={showPicker}
        onSelect={handleAddExercise}
        onClose={() => setShowPicker(false)}
      />
    </SafeAreaView>
  );
}

// ─── Row Styles ───────────────────────────────────────────────────────────────

const rowStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#6C63FF22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  orderText: { color: '#6C63FF', fontWeight: '700', fontSize: 13 },
  name: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#242424',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowBtnDisabled: { opacity: 0.3 },
  removeBtn: { marginLeft: 4 },
  fields: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  fieldGroup: {},
  fieldLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignSelf: 'flex-start',
  },
  stepBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: { color: '#6C63FF', fontSize: 20, fontWeight: '600', lineHeight: 22 },
  stepValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  numInput: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: 90,
    textAlign: 'center',
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  heading: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginHorizontal: 8 },
  saveBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  content: { padding: 20, paddingBottom: 60 },
  nameInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  descInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e74c3c22',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e74c3c44',
  },
  errorText: { color: '#e74c3c', fontSize: 13, flex: 1 },
  sectionLabel: {
    color: '#555',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  exerciseList: { marginBottom: 12 },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
    paddingVertical: 16,
    marginBottom: 32,
  },
  addExerciseBtnText: { color: '#6C63FF', fontSize: 15, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#e74c3c11',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e74c3c33',
    paddingVertical: 16,
  },
  deleteBtnText: { color: '#e74c3c', fontSize: 15, fontWeight: '600' },
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorStateText: { color: '#e74c3c', fontSize: 15, fontWeight: '600' },
});
