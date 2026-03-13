import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createCustomExercise } from '../../../src/api/exercises';

// ─── Constants ────────────────────────────────────────────────────────────────

const MUSCLE_GROUPS: { label: string; value: string }[] = [
  { label: 'Chest', value: 'CHEST' },
  { label: 'Back', value: 'BACK' },
  { label: 'Shoulders', value: 'SHOULDERS' },
  { label: 'Biceps', value: 'BICEPS' },
  { label: 'Triceps', value: 'TRICEPS' },
  { label: 'Forearms', value: 'FOREARMS' },
  { label: 'Core', value: 'CORE' },
  { label: 'Glutes', value: 'GLUTES' },
  { label: 'Quads', value: 'QUADS' },
  { label: 'Hamstrings', value: 'HAMSTRINGS' },
  { label: 'Calves', value: 'CALVES' },
  { label: 'Full Body', value: 'FULL_BODY' },
];

const EQUIPMENT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Barbell', value: 'BARBELL' },
  { label: 'Dumbbell', value: 'DUMBBELL' },
  { label: 'Machine', value: 'MACHINE' },
  { label: 'Cable', value: 'CABLE' },
  { label: 'Bodyweight', value: 'BODYWEIGHT' },
  { label: 'Kettlebell', value: 'KETTLEBELL' },
  { label: 'Resistance Band', value: 'RESISTANCE_BAND' },
  { label: 'Smith Machine', value: 'SMITH_MACHINE' },
  { label: 'Other', value: 'OTHER' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SelectChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function SelectChip({ label, selected, onPress }: SelectChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface SectionProps {
  title: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}

function FormSection({ title, required, children, error }: SectionProps) {
  return (
    <View style={styles.formSection}>
      <View style={styles.sectionLabelRow}>
        <Text style={styles.sectionLabel}>{title}</Text>
        {required && <Text style={styles.requiredMark}> *</Text>}
      </View>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  instructions: string;
}

interface FormErrors {
  name?: string;
  primaryMuscle?: string;
}

export default function CreateExerciseScreen() {
  const [form, setForm] = useState<FormState>({
    name: '',
    primaryMuscle: '',
    secondaryMuscles: [],
    equipment: 'BARBELL',
    instructions: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  // ── Field updaters ──────────────────────────────────────────────────────────

  const setName = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, name: value }));
    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
  }, [errors.name]);

  const setPrimaryMuscle = useCallback((value: string) => {
    setForm((prev) => ({
      ...prev,
      primaryMuscle: value,
      // remove from secondary if also set as primary
      secondaryMuscles: prev.secondaryMuscles.filter((m) => m !== value),
    }));
    if (errors.primaryMuscle) setErrors((prev) => ({ ...prev, primaryMuscle: undefined }));
  }, [errors.primaryMuscle]);

  const toggleSecondaryMuscle = useCallback((value: string) => {
    setForm((prev) => {
      const already = prev.secondaryMuscles.includes(value);
      return {
        ...prev,
        secondaryMuscles: already
          ? prev.secondaryMuscles.filter((m) => m !== value)
          : [...prev.secondaryMuscles, value],
      };
    });
  }, []);

  const setEquipment = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, equipment: value }));
  }, []);

  const setInstructions = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, instructions: value }));
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) {
      newErrors.name = 'Exercise name is required';
    }
    if (!form.primaryMuscle) {
      newErrors.primaryMuscle = 'Please select a primary muscle group';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');

    const instructionSteps = form.instructions
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await createCustomExercise({
        name: form.name.trim(),
        primaryMuscle: form.primaryMuscle,
        muscleGroups: [form.primaryMuscle, ...form.secondaryMuscles],
        equipment: form.equipment,
        instructions: instructionSteps,
        isCustom: true,
      });
      router.back();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create exercise. Please try again.';
      setApiError(message);
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = form.name.trim().length > 0 && form.primaryMuscle.length > 0 && !submitting;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>Create Exercise</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Exercise Name */}
          <FormSection title="Exercise Name" required error={errors.name}>
            <TextInput
              style={[styles.textInput, errors.name && styles.textInputError]}
              value={form.name}
              onChangeText={setName}
              placeholder="e.g. Barbell Back Squat"
              placeholderTextColor="#718FAF"
              returnKeyType="next"
              maxLength={120}
            />
          </FormSection>

          {/* Primary Muscle Group */}
          <FormSection title="Primary Muscle Group" required error={errors.primaryMuscle}>
            <View style={styles.chipGrid}>
              {MUSCLE_GROUPS.map((mg) => (
                <SelectChip
                  key={mg.value}
                  label={mg.label}
                  selected={form.primaryMuscle === mg.value}
                  onPress={() => setPrimaryMuscle(mg.value)}
                />
              ))}
            </View>
          </FormSection>

          {/* Secondary Muscles */}
          <FormSection title="Secondary Muscles">
            <Text style={styles.sectionHint}>Select all that apply (optional)</Text>
            <View style={styles.chipGrid}>
              {MUSCLE_GROUPS.filter((mg) => mg.value !== form.primaryMuscle).map((mg) => (
                <SelectChip
                  key={mg.value}
                  label={mg.label}
                  selected={form.secondaryMuscles.includes(mg.value)}
                  onPress={() => toggleSecondaryMuscle(mg.value)}
                />
              ))}
            </View>
          </FormSection>

          {/* Equipment */}
          <FormSection title="Equipment">
            <View style={styles.chipGrid}>
              {EQUIPMENT_OPTIONS.map((eq) => (
                <SelectChip
                  key={eq.value}
                  label={eq.label}
                  selected={form.equipment === eq.value}
                  onPress={() => setEquipment(eq.value)}
                />
              ))}
            </View>
          </FormSection>

          {/* Instructions */}
          <FormSection title="Instructions">
            <Text style={styles.sectionHint}>One step per line</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={form.instructions}
              onChangeText={setInstructions}
              placeholder={
                'Stand with feet shoulder-width apart\nGrip the bar firmly\nDrive through your heels to stand up'
              }
              placeholderTextColor="#4A6080"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </FormSection>

          {/* API error */}
          {apiError ? (
            <View style={styles.apiErrorBox}>
              <Ionicons name="alert-circle" size={16} color="#e74c3c" />
              <Text style={styles.apiErrorText}>{apiError}</Text>
            </View>
          ) : null}

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Create Exercise</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#162540',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, color: '#fff', fontSize: 20, fontWeight: '800',
    fontFamily: 'BarlowCondensed-ExtraBold', textAlign: 'center' },

  // Scroll
  scrollContent: { padding: 20, paddingBottom: 60 },

  // Form sections
  formSection: { marginBottom: 28 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionLabel: {
    color: '#A8BDD4',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  requiredMark: { color: '#3B82F6', fontWeight: '700', fontSize: 14 },
  sectionHint: { color: '#718FAF', fontSize: 12, marginBottom: 8, marginTop: -4 },
  fieldError: { color: '#e74c3c', fontSize: 12, marginTop: 6 },

  // Text inputs
  textInput: {
    backgroundColor: '#0B1326',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#162540',
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textInputError: { borderColor: '#e74c3c' },
  textArea: {
    minHeight: 130,
    paddingTop: 12,
    lineHeight: 22,
  },

  // Chip grid
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#162540',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#0B1326',
  },
  chipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  chipText: { color: '#718FAF', fontSize: 13, fontWeight: '500' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },

  // API error
  apiErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e74c3c22',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e74c3c44',
    marginBottom: 16,
  },
  apiErrorText: { color: '#e74c3c', fontSize: 13, flex: 1 },

  // Submit button
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnDisabled: { backgroundColor: '#162540', shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700',
    fontFamily: 'DMSans-Bold' },
});
