import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api/client';

// ─── Types ─────────────────────────────────────────────────────────────────

type ProgramGoal = 'strength' | 'hypertrophy' | 'fat_loss' | 'general';
type Experience = 'beginner' | 'intermediate' | 'advanced';
type DurationWeeks = 4 | 8 | 12;
type DaysPerWeek = 3 | 4 | 5 | 6;

type Equipment =
  | 'BARBELL'
  | 'DUMBBELL'
  | 'MACHINE'
  | 'BODYWEIGHT'
  | 'CABLE'
  | 'KETTLEBELL'
  | 'RESISTANCE_BAND';

const DEFAULT_PROGRAM_NAMES: Record<ProgramGoal, string> = {
  strength: 'Strength Program',
  hypertrophy: 'Hypertrophy Program',
  fat_loss: 'Fat Loss Program',
  general: 'General Fitness Program',
};

interface GenerateForm {
  goal: ProgramGoal | '';
  experience: Experience | '';
  durationWeeks: DurationWeeks | 0;
  daysPerWeek: DaysPerWeek | 0;
  equipment: Equipment[];
  notes: string;
}

interface GenerateResult {
  programName: string;
  routines: { id: string; name: string }[];
}

// ─── Constants ─────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

const GOALS: { value: ProgramGoal; label: string; icon: string; desc: string }[] = [
  { value: 'strength', label: 'Strength', icon: 'barbell-outline', desc: 'Build max strength in compound lifts' },
  { value: 'hypertrophy', label: 'Hypertrophy', icon: 'body-outline', desc: 'Maximize muscle size and definition' },
  { value: 'fat_loss', label: 'Fat Loss', icon: 'flame-outline', desc: 'Burn fat while preserving muscle' },
  { value: 'general', label: 'General Fitness', icon: 'heart-outline', desc: 'Balanced fitness and wellness' },
];

const EXPERIENCE_OPTIONS: { value: Experience; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'Less than 1 year of consistent training' },
  { value: 'intermediate', label: 'Intermediate', desc: '1–3 years of consistent training' },
  { value: 'advanced', label: 'Advanced', desc: '3+ years of consistent training' },
];

const DURATION_OPTIONS: { value: DurationWeeks; label: string }[] = [
  { value: 4, label: '4 weeks' },
  { value: 8, label: '8 weeks' },
  { value: 12, label: '12 weeks' },
];

const DAYS_OPTIONS: { value: DaysPerWeek; label: string }[] = [
  { value: 3, label: '3 days' },
  { value: 4, label: '4 days' },
  { value: 5, label: '5 days' },
  { value: 6, label: '6 days' },
];


const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'BARBELL', label: 'Barbell' },
  { value: 'DUMBBELL', label: 'Dumbbells' },
  { value: 'CABLE', label: 'Cables' },
  { value: 'MACHINE', label: 'Machines' },
  { value: 'BODYWEIGHT', label: 'Bodyweight' },
  { value: 'KETTLEBELL', label: 'Kettlebells' },
  { value: 'RESISTANCE_BAND', label: 'Resistance Bands' },
];

const AI_TIPS = [
  'Analysing your goal and schedule...',
  'Designing your weekly splits...',
  'Selecting optimal exercises...',
  'Adding progressive overload...',
  'Balancing volume and intensity...',
  'Finalising your program...',
];

const DEFAULT_FORM: GenerateForm = {
  goal: '',
  experience: '',
  durationWeeks: 0,
  daysPerWeek: 0,
  equipment: [],
  notes: '',
};

// ─── Step dots ─────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i === current && dotStyles.dotActive,
            i < current && dotStyles.dotPast,
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2a2a2a' },
  dotActive: { width: 26, backgroundColor: '#6C63FF' },
  dotPast: { backgroundColor: '#6C63FF', opacity: 0.4 },
});

// ─── Step 1: Goal + Duration ───────────────────────────────────────────────

function Step1({
  form,
  update,
}: {
  form: GenerateForm;
  update: (p: Partial<GenerateForm>) => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={stepStyles.sectionLabel}>Program Goal</Text>
      <View style={stepStyles.gap10}>
        {GOALS.map(({ value, label, icon, desc }) => {
          const selected = form.goal === value;
          return (
            <TouchableOpacity
              key={value}
              style={[stepStyles.optionRow, selected && stepStyles.optionRowSelected]}
              onPress={() => update({ goal: value })}
              activeOpacity={0.7}
            >
              <View style={[stepStyles.iconWrap, selected && stepStyles.iconWrapSelected]}>
                <Ionicons name={icon as any} size={20} color={selected ? '#6C63FF' : '#666'} />
              </View>
              <View style={stepStyles.optionInfo}>
                <Text style={stepStyles.optionLabel}>{label}</Text>
                <Text style={stepStyles.optionDesc}>{desc}</Text>
              </View>
              {selected && <Ionicons name="checkmark-circle" size={20} color="#6C63FF" />}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[stepStyles.sectionLabel, { marginTop: 24 }]}>Program Duration</Text>
      <View style={stepStyles.chipRow}>
        {DURATION_OPTIONS.map(({ value, label }) => {
          const selected = form.durationWeeks === value;
          return (
            <TouchableOpacity
              key={value}
              style={[stepStyles.chip, selected && stepStyles.chipSelected]}
              onPress={() => update({ durationWeeks: value })}
              activeOpacity={0.7}
            >
              <Text style={[stepStyles.chipText, selected && stepStyles.chipTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Step 2: Frequency + Session Duration ─────────────────────────────────

function Step2({
  form,
  update,
}: {
  form: GenerateForm;
  update: (p: Partial<GenerateForm>) => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={stepStyles.sectionLabel}>Training Frequency</Text>
      <View style={stepStyles.chipRow}>
        {DAYS_OPTIONS.map(({ value, label }) => {
          const selected = form.daysPerWeek === value;
          return (
            <TouchableOpacity
              key={value}
              style={[stepStyles.chip, selected && stepStyles.chipSelected]}
              onPress={() => update({ daysPerWeek: value })}
              activeOpacity={0.7}
            >
              <Text style={[stepStyles.chipText, selected && stepStyles.chipTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[stepStyles.sectionLabel, { marginTop: 24 }]}>Experience Level</Text>
      <View style={stepStyles.gap10}>
        {EXPERIENCE_OPTIONS.map(({ value, label, desc }) => {
          const selected = form.experience === value;
          return (
            <TouchableOpacity
              key={value}
              style={[stepStyles.optionCard, selected && stepStyles.optionCardSelected]}
              onPress={() => update({ experience: value })}
              activeOpacity={0.7}
            >
              <View style={stepStyles.optionLeft}>
                <Text style={[stepStyles.optionLabel, selected && stepStyles.optionLabelSelected]}>{label}</Text>
                <Text style={stepStyles.optionDesc}>{desc}</Text>
              </View>
              {selected && <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Step 3: Equipment ─────────────────────────────────────────────────────

function Step3({
  form,
  update,
}: {
  form: GenerateForm;
  update: (p: Partial<GenerateForm>) => void;
}) {
  function toggle(eq: Equipment) {
    const next = form.equipment.includes(eq)
      ? form.equipment.filter((e) => e !== eq)
      : [...form.equipment, eq];
    update({ equipment: next });
  }

  function selectAll() {
    update({ equipment: EQUIPMENT_OPTIONS.map((e) => e.value) });
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={selectAll} style={stepStyles.selectAllBtn} activeOpacity={0.7}>
        <Text style={stepStyles.selectAllText}>Select all (full gym)</Text>
      </TouchableOpacity>
      <View style={equipStyles.grid}>
        {EQUIPMENT_OPTIONS.map(({ value, label }) => {
          const selected = form.equipment.includes(value);
          return (
            <TouchableOpacity
              key={value}
              style={[equipStyles.chip, selected && equipStyles.chipSelected]}
              onPress={() => toggle(value)}
              activeOpacity={0.7}
            >
              <View style={[equipStyles.checkbox, selected && equipStyles.checkboxSelected]}>
                {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={[equipStyles.chipText, selected && equipStyles.chipTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const equipStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#1a1a1a',
    minWidth: '45%',
    flex: 1,
  },
  chipSelected: { borderColor: '#6C63FF', backgroundColor: 'rgba(108,99,255,0.12)' },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1,
    borderColor: '#444', alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  chipText: { color: '#888', fontSize: 14, fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
});

// ─── Step 4: Notes ─────────────────────────────────────────────────────────

function Step4({
  form,
  update,
}: {
  form: GenerateForm;
  update: (p: Partial<GenerateForm>) => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={stepStyles.optionDesc}>
        Tell the AI anything specific: focus muscle groups, injuries to avoid, preferred exercise styles, or any other context.
      </Text>
      <TextInput
        style={notesStyles.textarea}
        value={form.notes}
        onChangeText={(t) => update({ notes: t })}
        placeholder="e.g. Focus on upper body. Avoid heavy squats due to knee. Love Romanian deadlifts."
        placeholderTextColor="#444"
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        maxLength={400}
      />
      <Text style={notesStyles.charCount}>{form.notes.length}/400</Text>
      <Text style={notesStyles.hint}>Optional — leave blank to let the AI decide.</Text>
    </ScrollView>
  );
}

const notesStyles = StyleSheet.create({
  textarea: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 140,
    marginTop: 16,
  },
  charCount: { color: '#444', fontSize: 12, textAlign: 'right', marginTop: 6 },
  hint: { color: '#444', fontSize: 13, marginTop: 8 },
});

// ─── Generating screen ─────────────────────────────────────────────────────

function GeneratingScreen({ tip }: { tip: string }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={genStyles.container}>
      <View style={genStyles.iconWrap}>
        <View style={genStyles.pulseOuter} />
        <View style={genStyles.pulseInner}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="sparkles" size={28} color="#6C63FF" />
          </Animated.View>
        </View>
      </View>
      <Text style={genStyles.title}>AI is building your program...</Text>
      <Text style={genStyles.tip}>{tip}</Text>
      <Text style={genStyles.hint}>This usually takes 15–30 seconds</Text>
    </View>
  );
}

const genStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  pulseOuter: {
    position: 'absolute',
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(108,99,255,0.12)',
  },
  pulseInner: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(108,99,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  tip: { color: '#888', fontSize: 15, textAlign: 'center', marginBottom: 8, lineHeight: 22 },
  hint: { color: '#444', fontSize: 13, textAlign: 'center' },
});

// ─── Success screen ────────────────────────────────────────────────────────

function SuccessScreen({ result }: { result: GenerateResult }) {
  return (
    <ScrollView
      contentContainerStyle={successStyles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={successStyles.iconWrap}>
        <Ionicons name="checkmark-circle" size={52} color="#22c55e" />
      </View>

      <Text style={successStyles.programName}>{result.programName}</Text>
      <Text style={successStyles.programDesc}>
        {result.routines.length} routine{result.routines.length !== 1 ? 's' : ''} created and saved to your library
      </Text>

      {/* Routines list */}
      <View style={successStyles.scheduleCard}>
        <Text style={successStyles.scheduleTitle}>Created Routines</Text>
        {result.routines.map((r, i) => (
          <View key={r.id} style={successStyles.scheduleRow}>
            <View style={successStyles.routineNum}>
              <Text style={successStyles.routineNumText}>{i + 1}</Text>
            </View>
            <Text style={[successStyles.scheduleDay, { flex: 1 }]}>{r.name}</Text>
            <Ionicons name="checkmark" size={16} color="#22c55e" />
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={successStyles.saveBtn}
        onPress={() => router.replace('/(app)/routines' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="list-outline" size={18} color="#fff" />
        <Text style={successStyles.saveBtnText}>View My Routines</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={successStyles.secondaryBtn}
        onPress={() => router.replace('/(screens)/programs/generate' as any)}
        activeOpacity={0.8}
      >
        <Text style={successStyles.secondaryBtnText}>Generate Another Program</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const successStyles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, alignItems: 'center' },
  iconWrap: { marginBottom: 16 },
  programName: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  programDesc: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  scheduleCard: {
    width: '100%', backgroundColor: '#1a1a1a', borderRadius: 14,
    borderWidth: 1, borderColor: '#2a2a2a', padding: 16, marginBottom: 20,
  },
  scheduleTitle: { color: '#888', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },
  scheduleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  scheduleDay: { color: '#fff', fontSize: 14, fontWeight: '600' },
  routineNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(108,99,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  routineNumText: { color: '#6C63FF', fontSize: 12, fontWeight: '700' },
  saveBtn: {
    width: '100%', backgroundColor: '#6C63FF', borderRadius: 14,
    paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 12,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { paddingVertical: 12 },
  secondaryBtnText: { color: '#666', fontSize: 14, textDecorationLine: 'underline' },
});

// ─── Shared step styles ────────────────────────────────────────────────────

const stepStyles = StyleSheet.create({
  sectionLabel: { color: '#888', fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginBottom: 10 },
  gap10: { gap: 10 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1,
    borderColor: '#2a2a2a', backgroundColor: '#1a1a1a',
  },
  optionRowSelected: { borderColor: '#6C63FF', backgroundColor: 'rgba(108,99,255,0.12)' },
  iconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center',
  },
  iconWrapSelected: { backgroundColor: 'rgba(108,99,255,0.2)' },
  optionInfo: { flex: 1 },
  optionLabel: { color: '#888', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  optionLabelSelected: { color: '#fff' },
  optionDesc: { color: '#666', fontSize: 13, lineHeight: 19 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 14, borderWidth: 1,
    borderColor: '#2a2a2a', backgroundColor: '#1a1a1a',
  },
  optionCardSelected: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)' },
  optionLeft: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#2a2a2a', backgroundColor: '#1a1a1a',
  },
  chipSelected: { borderColor: '#6C63FF', backgroundColor: 'rgba(108,99,255,0.12)' },
  chipText: { color: '#888', fontSize: 14, fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  selectAllBtn: { alignSelf: 'flex-start' },
  selectAllText: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },
});

// ─── Main screen ──────────────────────────────────────────────────────────

const STEP_META = [
  { title: 'Your Goal', subtitle: 'What are you training for?' },
  { title: 'Your Schedule', subtitle: 'Frequency and session length' },
  { title: 'Equipment', subtitle: 'What do you have access to?' },
  { title: 'Any Notes?', subtitle: 'Focus areas or things to avoid' },
];

export default function GenerateProgramScreen() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<GenerateForm>(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState('');

  function update(partial: Partial<GenerateForm>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function canNext(): boolean {
    if (step === 0) return !!form.goal && form.durationWeeks > 0;
    if (step === 1) return form.daysPerWeek > 0 && !!form.experience;
    if (step === 2) return form.equipment.length > 0;
    return true;
  }

  const generateMutation = useMutation({
    throwOnError: false,
    mutationFn: async () => {
      const { data } = await api.post('/api/ai/generate-program', {
        name: DEFAULT_PROGRAM_NAMES[form.goal as ProgramGoal] ?? 'My Program',
        goal: form.goal,
        experience: form.experience,
        durationWeeks: form.durationWeeks,
        daysPerWeek: form.daysPerWeek,
        equipment: form.equipment,
        focusAreas: form.notes.trim() ? [form.notes.trim()] : undefined,
      });
      return (data?.data ?? data) as { routines: { id: string; name: string }[]; programName: string };
    },
    onSuccess: (data) => {
      setGenerateResult({ programName: data.programName, routines: data.routines ?? [] });
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      setGenerating(false);
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const message =
        status === 429 ? 'Rate limit reached. You can generate up to 100 programs per day. Try again tomorrow.' :
        status === 401 ? 'Your session has expired. Please log in again.' :
        (err?.response?.data?.error ?? 'Failed to generate program. Please try again.');
      setError(message);
      setGenerating(false);
    },
  });

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    setTipIdx(0);

    const interval = setInterval(() => {
      setTipIdx((prev) => {
        const next = prev + 1;
        if (next >= AI_TIPS.length) {
          clearInterval(interval);
          return prev;
        }
        return next;
      });
    }, 4500);

    try {
      await generateMutation.mutateAsync();
    } catch {
      // Error handled in onError callback above
    } finally {
      clearInterval(interval);
    }
  }

  // ── Generated program success view
  if (generateResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Program Ready</Text>
          <View style={{ width: 40 }} />
        </View>
        <SuccessScreen result={generateResult} />
      </SafeAreaView>
    );
  }

  // ── Generating view
  if (generating) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Generating</Text>
          <View style={{ width: 40 }} />
        </View>
        {error ? (
          <View style={styles.errorWrap}>
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={24} color="#ef4444" style={{ marginBottom: 8 }} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => { setGenerating(false); setError(''); }}
              >
                <Text style={styles.retryText}>Go back and try again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <GeneratingScreen tip={AI_TIPS[tipIdx]} />
        )}
      </SafeAreaView>
    );
  }

  // ── Multi-step form
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={step > 0 ? () => setStep((s) => s - 1) : () => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="sparkles" size={16} color="#6C63FF" />
          <Text style={styles.headerTitle}>Build with AI</Text>
        </View>
        <Text style={styles.stepCount}>{step + 1}/{TOTAL_STEPS}</Text>
      </View>

      <View style={styles.formContent}>
        {/* Progress dots */}
        <StepDots current={step} total={TOTAL_STEPS} />

        {/* Step title */}
        <Text style={styles.stepTitle}>{STEP_META[step].title}</Text>
        <Text style={styles.stepSubtitle}>{STEP_META[step].subtitle}</Text>

        {/* Step content */}
        <View style={styles.stepBody}>
          {step === 0 && <Step1 form={form} update={update} />}
          {step === 1 && <Step2 form={form} update={update} />}
          {step === 2 && <Step3 form={form} update={update} />}
          {step === 3 && <Step4 form={form} update={update} />}
        </View>
      </View>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, !canNext() && styles.nextBtnDisabled]}
          onPress={
            step < TOTAL_STEPS - 1
              ? () => setStep((s) => s + 1)
              : handleGenerate
          }
          disabled={!canNext()}
          activeOpacity={0.8}
        >
          {step < TOTAL_STEPS - 1 ? (
            <>
              <Text style={styles.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.nextBtnText}>Generate Program</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  stepCount: { color: '#555', fontSize: 13, width: 40, textAlign: 'right' },

  formContent: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  stepTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  stepSubtitle: { color: '#888', fontSize: 14, marginBottom: 20 },
  stepBody: { flex: 1 },

  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    backgroundColor: '#0a0a0a',
  },
  nextBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  errorWrap: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  errorBox: {
    backgroundColor: '#1a1a1a', borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    alignItems: 'center', width: '100%',
  },
  errorText: { color: '#ef4444', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  retryBtn: { marginTop: 14 },
  retryText: { color: '#888', fontSize: 13, textDecorationLine: 'underline' },
});
