import { useState } from 'react';
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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api/client';
import { ExercisePicker } from '../../../src/components/ExercisePicker';
import { Exercise } from '../../../src/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoutineExerciseItem {
  localId: string;
  exercise: Exercise;
  sets: number;
  reps: string;
  restSeconds: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REST_OPTIONS = [30, 60, 90, 120, 180];

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
            style={rowStyles.repsInput}
            value={item.reps}
            onChangeText={(v) => onChange({ reps: v })}
            keyboardType="numeric"
            placeholder="10"
            placeholderTextColor="#444"
            maxLength={4}
          />
        </View>

        {/* Rest picker */}
        <View style={rowStyles.fieldGroup}>
          <Text style={rowStyles.fieldLabel}>REST</Text>
          <View style={rowStyles.restRow}>
            {REST_OPTIONS.map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[rowStyles.restChip, item.restSeconds === sec && rowStyles.restChipActive]}
                onPress={() => onChange({ restSeconds: sec })}
              >
                <Text style={[rowStyles.restChipText, item.restSeconds === sec && rowStyles.restChipTextActive]}>
                  {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateRoutineScreen() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<RoutineExerciseItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/routines', {
        name: name.trim(),
        description: description.trim() || undefined,
        exercises: exercises.map((e, i) => ({
          exerciseId: e.exercise.id,
          order: i,
          sets: e.sets,
          reps: e.reps ? parseInt(e.reps, 10) || undefined : undefined,
          restSeconds: e.restSeconds,
        })),
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      const newId = data?.data?.id ?? data?.id;
      if (newId) {
        router.replace(`/(app)/routines/${newId}`);
      } else {
        router.back();
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to save routine';
      setError(msg);
    },
  });

  function handleAddExercise(exercise: Exercise) {
    setExercises((prev) => [
      ...prev,
      { localId: generateLocalId(), exercise, sets: 3, reps: '10', restSeconds: 60 },
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>New Routine</Text>
        <TouchableOpacity
          style={[styles.saveBtn, (isPending || !name.trim() || exercises.length === 0) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isPending || !name.trim() || exercises.length === 0}
        >
          {isPending ? (
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
          placeholder="Routine name (e.g. Push Day A)"
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
  fields: { gap: 12 },
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
  repsInput: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: 80,
    textAlign: 'center',
  },
  restRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  restChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  restChipActive: { backgroundColor: '#6C63FF22', borderColor: '#6C63FF' },
  restChipText: { color: '#666', fontSize: 12, fontWeight: '600' },
  restChipTextActive: { color: '#6C63FF' },
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
  },
  addExerciseBtnText: { color: '#6C63FF', fontSize: 15, fontWeight: '600' },
});
