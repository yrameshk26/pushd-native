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

// ─── Constants ────────────────────────────────────────────────────────────────

const MUSCLE_GROUPS = [
  'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'FOREARMS',
  'CORE', 'GLUTES', 'QUADS', 'HAMSTRINGS', 'CALVES', 'CARDIO', 'FULL_BODY',
];

const EQUIPMENT = [
  'BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'BODYWEIGHT',
  'KETTLEBELL', 'RESISTANCE_BAND', 'SMITH_MACHINE', 'OTHER',
];

const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

// ─── Form State ───────────────────────────────────────────────────────────────

interface ExerciseForm {
  name: string;
  description: string;
  primaryMuscle: string;
  equipment: string;
  difficulty: string;
  instructions: string;
}

const DEFAULT_FORM: ExerciseForm = {
  name: '',
  description: '',
  primaryMuscle: 'CHEST',
  equipment: 'BARBELL',
  difficulty: 'BEGINNER',
  instructions: '',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EditExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ExerciseForm>(DEFAULT_FORM);
  const [initialized, setInitialized] = useState(false);

  // Fetch existing exercise
  const { data: exerciseData, isLoading, isError } = useQuery({
    queryKey: ['exercise', id],
    queryFn: async () => (await api.get(`/api/exercises/${id}`)).data,
    enabled: !!id,
  });

  // Populate form once data arrives
  useEffect(() => {
    if (!exerciseData || initialized) return;
    const ex = exerciseData?.data ?? exerciseData;
    setForm({
      name: ex.name ?? '',
      description: ex.description ?? '',
      primaryMuscle: ex.primaryMuscle ?? 'CHEST',
      equipment: ex.equipment ?? 'BARBELL',
      difficulty: ex.difficulty ?? 'BEGINNER',
      instructions: Array.isArray(ex.instructions) ? ex.instructions.join('\n') : '',
    });
    setInitialized(true);
  }, [exerciseData, initialized]);

  function setField(field: keyof ExerciseForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Save mutation
  const { mutate: save, isPending: isSaving, error: saveError } = useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/api/exercises/${id}`, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        primaryMuscle: form.primaryMuscle,
        equipment: form.equipment,
        difficulty: form.difficulty,
        muscleGroups: [form.primaryMuscle],
        instructions: form.instructions
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise', id] });
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      router.back();
    },
  });

  // Delete mutation
  const { mutate: deleteExercise, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/exercises/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      router.replace('/(app)/exercises');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to delete exercise';
      Alert.alert('Error', msg);
    },
  });

  function confirmDelete() {
    Alert.alert(
      'Delete Exercise',
      `Are you sure you want to delete "${form.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteExercise() },
      ]
    );
  }

  const errorMessage = saveError instanceof Error ? saveError.message : null;

  // ── Loading state ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heading}>Edit Exercise</Text>
          <View style={{ width: 40 }} />
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
          <Text style={styles.heading}>Edit Exercise</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centeredState}>
          <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" />
          <Text style={styles.errorStateText}>Could not load exercise</Text>
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
        <Text style={styles.heading}>Edit Exercise</Text>
        <TouchableOpacity
          style={[styles.saveBtn, (isSaving || !form.name.trim()) && styles.saveBtnDisabled]}
          onPress={() => save()}
          disabled={isSaving || !form.name.trim()}
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
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Exercise Name *</Text>
          <TextInput
            style={styles.textInput}
            value={form.name}
            onChangeText={(v) => setField('name', v)}
            placeholder="e.g. Barbell Back Squat"
            placeholderTextColor="#444"
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        {/* Primary Muscle */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Primary Muscle *</Text>
          <View style={styles.grid}>
            {MUSCLE_GROUPS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.pill, form.primaryMuscle === m && styles.pillActive]}
                onPress={() => setField('primaryMuscle', m)}
              >
                <Text style={[styles.pillText, form.primaryMuscle === m && styles.pillTextActive]}>
                  {formatLabel(m)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Equipment */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Equipment *</Text>
          <View style={styles.grid}>
            {EQUIPMENT.map((eq) => (
              <TouchableOpacity
                key={eq}
                style={[styles.pill, form.equipment === eq && styles.pillActive]}
                onPress={() => setField('equipment', eq)}
              >
                <Text style={[styles.pillText, form.equipment === eq && styles.pillTextActive]}>
                  {formatLabel(eq)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Difficulty */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Difficulty</Text>
          <View style={styles.difficultyRow}>
            {DIFFICULTIES.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.difficultyChip, form.difficulty === d && styles.difficultyChipActive]}
                onPress={() => setField('difficulty', d)}
              >
                <Text style={[styles.difficultyChipText, form.difficulty === d && styles.difficultyChipTextActive]}>
                  {formatLabel(d)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={styles.textareaInput}
            value={form.description}
            onChangeText={(v) => setField('description', v)}
            placeholder="Brief description of the exercise..."
            placeholderTextColor="#444"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Instructions */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>
            Instructions{' '}
            <Text style={styles.fieldLabelHint}>(one step per line)</Text>
          </Text>
          <TextInput
            style={[styles.textareaInput, { minHeight: 120 }]}
            value={form.instructions}
            onChangeText={(v) => setField('instructions', v)}
            placeholder={'Stand with feet shoulder-width apart\nGrip the bar with hands just outside your legs'}
            placeholderTextColor="#444"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Save error */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#e74c3c" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

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
              <Text style={styles.deleteBtnText}>Delete Exercise</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  fieldSection: { marginBottom: 24 },
  fieldLabel: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  fieldLabelHint: {
    color: '#555',
    fontWeight: '400',
    fontSize: 12,
    textTransform: 'none',
    letterSpacing: 0,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textareaInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#fff',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    lineHeight: 20,
    minHeight: 80,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  pillActive: { backgroundColor: '#6C63FF22', borderColor: '#6C63FF' },
  pillText: { color: '#666', fontSize: 13, fontWeight: '500' },
  pillTextActive: { color: '#6C63FF', fontWeight: '700' },
  difficultyRow: { flexDirection: 'row', gap: 10 },
  difficultyChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  difficultyChipActive: { backgroundColor: '#6C63FF22', borderColor: '#6C63FF' },
  difficultyChipText: { color: '#666', fontSize: 13, fontWeight: '500' },
  difficultyChipTextActive: { color: '#6C63FF', fontWeight: '700' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e74c3c22',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e74c3c44',
  },
  errorText: { color: '#e74c3c', fontSize: 13, flex: 1 },
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
