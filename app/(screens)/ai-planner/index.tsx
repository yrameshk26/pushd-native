import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api/client';

// ─── Types ─────────────────────────────────────────────────────────────────

type Goal = 'strength' | 'hypertrophy' | 'endurance' | 'weight_loss' | 'general_fitness';
type Level = 'beginner' | 'intermediate' | 'advanced';
type Equipment =
  | 'BARBELL'
  | 'DUMBBELL'
  | 'MACHINE'
  | 'BODYWEIGHT'
  | 'CABLE'
  | 'KETTLEBELL';

interface PlanForm {
  goal: Goal | '';
  level: Level | '';
  daysPerWeek: number;
  workoutDurationMinutes: number | null;
  equipment: Equipment[];
  preferences: string;
}

interface GeneratedRoutine {
  id: string;
  name: string;
}

interface GeneratedPlan {
  planName: string;
  planDescription: string;
  weeklySchedule?: string;
  routines: GeneratedRoutine[];
}

// ─── Constants ─────────────────────────────────────────────────────────────

const GOALS: { value: Goal; label: string; emoji: string; desc: string }[] = [
  { value: 'strength', label: 'Get Stronger', emoji: '🏋️', desc: 'Increase strength in key lifts' },
  { value: 'hypertrophy', label: 'Build Muscle', emoji: '💪', desc: 'Increase muscle size and definition' },
  { value: 'endurance', label: 'Improve Endurance', emoji: '❤️', desc: 'Better stamina and cardiovascular fitness' },
  { value: 'weight_loss', label: 'Lose Fat', emoji: '🔥', desc: 'Burn fat while preserving muscle' },
  { value: 'general_fitness', label: 'General Fitness', emoji: '⚡', desc: 'Overall health and fitness improvement' },
];

const LEVELS: { value: Level; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'Less than 1 year training' },
  { value: 'intermediate', label: 'Intermediate', desc: '1–3 years consistent training' },
  { value: 'advanced', label: 'Advanced', desc: '3+ years of training' },
];

const DAYS_OPTIONS = [3, 4, 5, 6];

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'BARBELL', label: 'Barbell' },
  { value: 'DUMBBELL', label: 'Dumbbells' },
  { value: 'MACHINE', label: 'Machines' },
  { value: 'BODYWEIGHT', label: 'Bodyweight' },
  { value: 'CABLE', label: 'Cables' },
  { value: 'KETTLEBELL', label: 'Kettlebells' },
];

const MOTIVATIONAL_TEXTS = [
  'Analysing your goals...',
  'Designing your workout structure...',
  'Selecting the best exercises...',
  'Optimising sets and reps...',
  'Finalising your personalised plan...',
];

const STEPS = [
  { title: 'Your Goal', subtitle: 'What are you training for?' },
  { title: 'Training Details', subtitle: 'Level, schedule, and session length' },
  { title: 'Equipment', subtitle: 'What do you have access to?' },
  { title: 'Preferences', subtitle: 'Any injuries or focus areas?' },
];

const DURATION_PRESETS = [30, 45, 60] as const;

const DEFAULT_FORM: PlanForm = {
  goal: '',
  level: '',
  daysPerWeek: 4,
  workoutDurationMinutes: 45,
  equipment: ['BARBELL', 'DUMBBELL', 'CABLE', 'MACHINE', 'BODYWEIGHT'],
  preferences: '',
};

// ─── Helper components ─────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={dotStyles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[dotStyles.dot, i === current && dotStyles.dotActive, i < current && dotStyles.dotPast]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#162540' },
  dotActive: { width: 24, backgroundColor: '#3B82F6' },
  dotPast: { backgroundColor: '#3B82F6', opacity: 0.4 },
});

// ─── Step 1: Goal ──────────────────────────────────────────────────────────

function StepGoal({ form, update }: { form: PlanForm; update: (p: Partial<PlanForm>) => void }) {
  return (
    <View style={stepStyles.container}>
      {GOALS.map(({ value, label, emoji, desc }) => {
        const selected = form.goal === value;
        return (
          <TouchableOpacity
            key={value}
            style={[stepStyles.optionRow, selected && stepStyles.optionRowSelected]}
            onPress={() => update({ goal: value })}
            activeOpacity={0.7}
          >
            <Text style={stepStyles.optionEmoji}>{emoji}</Text>
            <View style={stepStyles.optionInfo}>
              <Text style={stepStyles.optionLabel}>{label}</Text>
              <Text style={stepStyles.optionDesc}>{desc}</Text>
            </View>
            {selected && <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Step 2: Level + Days + Duration ──────────────────────────────────────

function StepTraining({ form, update }: { form: PlanForm; update: (p: Partial<PlanForm>) => void }) {
  const [customDuration, setCustomDuration] = React.useState('');
  const isCustom = !DURATION_PRESETS.includes(form.workoutDurationMinutes as any);

  function handleCustomChange(text: string) {
    setCustomDuration(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= 10 && parsed <= 180) {
      update({ workoutDurationMinutes: parsed });
    } else {
      update({ workoutDurationMinutes: null });
    }
  }

  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.sectionLabel}>Fitness Level</Text>
      {LEVELS.map(({ value, label, desc }) => {
        const selected = form.level === value;
        return (
          <TouchableOpacity
            key={value}
            style={[stepStyles.optionRow, selected && stepStyles.optionRowSelected]}
            onPress={() => update({ level: value })}
            activeOpacity={0.7}
          >
            <View style={stepStyles.optionInfo}>
              <Text style={stepStyles.optionLabel}>{label}</Text>
              <Text style={stepStyles.optionDesc}>{desc}</Text>
            </View>
            {selected && <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />}
          </TouchableOpacity>
        );
      })}

      <Text style={[stepStyles.sectionLabel, { marginTop: 24 }]}>
        Days Per Week
        <Text style={stepStyles.accentText}> {form.daysPerWeek}</Text>
      </Text>
      <View style={stepStyles.daysRow}>
        {DAYS_OPTIONS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[stepStyles.dayBtn, form.daysPerWeek === d && stepStyles.dayBtnSelected]}
            onPress={() => update({ daysPerWeek: d })}
            activeOpacity={0.7}
          >
            <Text style={[stepStyles.dayBtnText, form.daysPerWeek === d && stepStyles.dayBtnTextSelected]}>
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[stepStyles.sectionLabel, { marginTop: 24 }]}>Workout Duration (optional)</Text>
      <View style={stepStyles.daysRow}>
        {DURATION_PRESETS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[stepStyles.dayBtn, form.workoutDurationMinutes === d && !isCustom && stepStyles.dayBtnSelected]}
            onPress={() => { setCustomDuration(''); update({ workoutDurationMinutes: d }); }}
            activeOpacity={0.7}
          >
            <Text style={[stepStyles.dayBtnText, form.workoutDurationMinutes === d && !isCustom && stepStyles.dayBtnTextSelected]}>
              {d}m
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[stepStyles.dayBtn, isCustom && stepStyles.dayBtnSelected]}
          onPress={() => { update({ workoutDurationMinutes: null }); setCustomDuration(''); }}
          activeOpacity={0.7}
        >
          <Text style={[stepStyles.dayBtnText, isCustom && stepStyles.dayBtnTextSelected]}>Custom</Text>
        </TouchableOpacity>
      </View>
      {isCustom && (
        <TextInput
          style={durationStyles.input}
          value={customDuration}
          onChangeText={handleCustomChange}
          placeholder="Minutes (e.g. 75)"
          placeholderTextColor="#4A6080"
          keyboardType="number-pad"
          maxLength={3}
        />
      )}
    </View>
  );
}

// ─── Step 3: Equipment ─────────────────────────────────────────────────────

function StepEquipment({ form, update }: { form: PlanForm; update: (p: Partial<PlanForm>) => void }) {
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
    <View style={stepStyles.container}>
      <TouchableOpacity onPress={selectAll} style={stepStyles.selectAllBtn}>
        <Text style={stepStyles.selectAllText}>Select all (full gym)</Text>
      </TouchableOpacity>
      <View style={chipStyles.grid}>
        {EQUIPMENT_OPTIONS.map(({ value, label }) => {
          const selected = form.equipment.includes(value);
          return (
            <TouchableOpacity
              key={value}
              style={[chipStyles.chip, selected && chipStyles.chipSelected]}
              onPress={() => toggle(value)}
              activeOpacity={0.7}
            >
              <View style={[chipStyles.checkbox, selected && chipStyles.checkboxSelected]}>
                {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={[chipStyles.chipText, selected && chipStyles.chipTextSelected]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#162540', backgroundColor: '#0B1326',
    minWidth: '45%',
  },
  chipSelected: { borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246,0.12)' },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1,
    borderColor: '#4A6080', justifyContent: 'center', alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  chipText: { color: '#718FAF', fontSize: 14, fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
});

// ─── Step 4: Preferences ──────────────────────────────────────────────────

function StepPreferences({ form, update }: { form: PlanForm; update: (p: Partial<PlanForm>) => void }) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.optionDesc}>
        Tell the AI anything else that would help personalise your plan — injuries, weak points, exercises you enjoy or want to avoid, etc.
      </Text>
      <TextInput
        style={prefStyles.textarea}
        value={form.preferences}
        onChangeText={(t) => update({ preferences: t })}
        placeholder="e.g. Bad left knee — avoid deep squats. Want to focus on upper body. Love deadlifts."
        placeholderTextColor="#4A6080"
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />
      <Text style={prefStyles.hint}>Optional — leave blank if nothing to add.</Text>
    </View>
  );
}

const durationStyles = StyleSheet.create({
  input: {
    backgroundColor: '#0B1326', borderWidth: 1, borderColor: '#3B82F6',
    borderRadius: 12, padding: 14, color: '#fff', fontSize: 15, marginTop: 10,
  },
});

const prefStyles = StyleSheet.create({
  textarea: {
    backgroundColor: '#0B1326', borderWidth: 1, borderColor: '#162540',
    borderRadius: 12, padding: 14, color: '#fff', fontSize: 15, lineHeight: 22,
    minHeight: 120, marginTop: 16,
  },
  hint: { color: '#4A6080', fontSize: 13, marginTop: 8 },
});

// ─── Shared step styles ───────────────────────────────────────────────────

const stepStyles = StyleSheet.create({
  container: { gap: 10 },
  sectionLabel: { color: '#718FAF', fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  accentText: { color: '#3B82F6' },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#162540',
    backgroundColor: '#0B1326',
  },
  optionRowSelected: { borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246,0.12)' },
  optionEmoji: { fontSize: 22 },
  optionInfo: { flex: 1 },
  optionLabel: { color: '#fff', fontSize: 15, fontWeight: '700',
    fontFamily: 'DMSans-Bold', marginBottom: 2 },
  optionDesc: { color: '#718FAF', fontSize: 13, lineHeight: 19 },
  selectAllBtn: { alignSelf: 'flex-start', marginBottom: 4 },
  selectAllText: { color: '#3B82F6', fontSize: 13, fontWeight: '600' },
  daysRow: { flexDirection: 'row', gap: 10 },
  dayBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
    borderColor: '#162540', backgroundColor: '#0B1326', alignItems: 'center',
  },
  dayBtnSelected: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  dayBtnText: { color: '#718FAF', fontSize: 16, fontWeight: '700' },
  dayBtnTextSelected: { color: '#fff' },
});

// ─── Loading / Success screen ──────────────────────────────────────────────

function GeneratingScreen({ motivationalText }: { motivationalText: string }) {
  return (
    <View style={genStyles.container}>
      <View style={genStyles.pulseWrap}>
        <View style={genStyles.pulseOuter} />
        <View style={genStyles.pulseInner}>
          <Ionicons name="sparkles" size={28} color="#3B82F6" />
        </View>
      </View>
      <Text style={genStyles.title}>Building Your Plan</Text>
      <Text style={genStyles.status}>{motivationalText}</Text>
      <Text style={genStyles.hint}>This usually takes 15–30 seconds</Text>
    </View>
  );
}

function SuccessScreen({ plan, onViewRoutines }: { plan: GeneratedPlan; onViewRoutines: () => void }) {
  return (
    <ScrollView contentContainerStyle={successStyles.container}>
      <View style={successStyles.iconWrap}>
        <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
      </View>
      <Text style={successStyles.planName}>{plan.planName}</Text>
      <Text style={successStyles.planDesc}>{plan.planDescription}</Text>
      {plan.weeklySchedule ? (
        <Text style={successStyles.schedule}>Schedule: {plan.weeklySchedule}</Text>
      ) : null}

      <View style={successStyles.routineList}>
        {plan.routines.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={successStyles.routineRow}
            onPress={() => router.push(`/(screens)/routines/${r.id}` as any)}
            activeOpacity={0.7}
          >
            <View style={successStyles.routineIcon}>
              <Ionicons name="barbell" size={16} color="#3B82F6" />
            </View>
            <Text style={successStyles.routineName}>{r.name}</Text>
            <Ionicons name="chevron-forward" size={16} color="#718FAF" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={successStyles.viewBtn} onPress={onViewRoutines} activeOpacity={0.8}>
        <Text style={successStyles.viewBtnText}>View All My Routines</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const genStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  pulseWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  pulseOuter: {
    position: 'absolute', width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(59, 130, 246,0.15)',
  },
  pulseInner: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '700',
    fontFamily: 'BarlowCondensed-Bold', marginBottom: 10, textAlign: 'center' },
  status: { color: '#718FAF', fontSize: 15, textAlign: 'center', marginBottom: 8 },
  hint: { color: '#4A6080', fontSize: 13, textAlign: 'center' },
});

const successStyles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  iconWrap: { marginBottom: 16 },
  planName: { color: '#fff', fontSize: 22, fontWeight: '800',
    fontFamily: 'BarlowCondensed-ExtraBold',
    fontFamily: 'BarlowCondensed-ExtraBold', textAlign: 'center', marginBottom: 8 },
  planDesc: { color: '#718FAF', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 6 },
  schedule: { color: '#3B82F6', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  routineList: { width: '100%', gap: 10, marginBottom: 24 },
  routineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0B1326', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#162540',
  },
  routineIcon: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  routineName: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600',
    fontFamily: 'DMSans-SemiBold' },
  viewBtn: {
    width: '100%', backgroundColor: '#3B82F6', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  viewBtnText: { color: '#fff', fontSize: 16, fontWeight: '700',
    fontFamily: 'DMSans-Bold' },
});

// ─── Main screen ──────────────────────────────────────────────────────────

export default function AIPlannerScreen() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<PlanForm>(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);
  const [motivationalIdx, setMotivationalIdx] = useState(0);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [error, setError] = useState('');

  function update(partial: Partial<PlanForm>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function canNext(): boolean {
    if (step === 0) return !!form.goal;
    if (step === 1) return !!form.level;
    if (step === 2) return form.equipment.length > 0;
    return true;
  }

  // Map AI planner goal values to what the API accepts
  const GOAL_MAP: Record<string, string> = {
    strength: 'strength',
    hypertrophy: 'hypertrophy',
    endurance: 'general',
    weight_loss: 'fat_loss',
    general_fitness: 'general',
  };

  const GOAL_NAMES: Record<string, string> = {
    strength: 'Strength Program',
    hypertrophy: 'Hypertrophy Program',
    endurance: 'Endurance Program',
    weight_loss: 'Fat Loss Program',
    general_fitness: 'General Fitness Program',
  };

  const generateMutation = useMutation({
    throwOnError: false,
    mutationFn: async () => {
      const mappedGoal = GOAL_MAP[form.goal] ?? 'general';
      const planName = GOAL_NAMES[form.goal] ?? 'My Program';
      const focusAreas = form.preferences.trim() ? [form.preferences.trim()] : undefined;

      const { data } = await api.post('/api/ai/generate-program', {
        name: planName,
        goal: mappedGoal,
        experience: form.level,
        daysPerWeek: form.daysPerWeek,
        durationWeeks: 8,
        equipment: form.equipment,
        focusAreas,
        ...(form.workoutDurationMinutes != null
          ? { workoutDurationMinutes: form.workoutDurationMinutes }
          : {}),
      });
      const result = data?.data ?? data;
      return {
        planName: result.name ?? planName,
        planDescription: result.description ?? `${form.daysPerWeek} days/week · ${form.level} level`,
        weeklySchedule: result.weeklySchedule,
        routines: result.routines ?? [],
      } as GeneratedPlan;
    },
    onSuccess: (data) => {
      setPlan(data);
      setGenerating(false);
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const message =
        status === 429 ? 'Rate limit reached — you can generate up to 5 plans per hour. Please try again later.' :
        status === 401 ? 'Your session has expired. Please log in again.' :
        (err?.response?.data?.error ?? 'Failed to generate plan. Please try again.');
      setError(message);
      setGenerating(false);
      Alert.alert(status === 429 ? '⏱ Rate Limit Reached' : 'Generation Failed', message);
    },
  });

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    setMotivationalIdx(0);

    // Cycle through motivational messages while generating
    const interval = setInterval(() => {
      setMotivationalIdx((prev) => {
        const next = prev + 1;
        if (next >= MOTIVATIONAL_TEXTS.length) {
          clearInterval(interval);
          return prev;
        }
        return next;
      });
    }, 5000);

    try {
      await generateMutation.mutateAsync();
    } catch {
      // Error handled in onError callback
    } finally {
      clearInterval(interval);
    }
  }

  // Success state
  if (plan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.heading}>AI Planner</Text>
          <View style={{ width: 40 }} />
        </View>
        <SuccessScreen plan={plan} onViewRoutines={() => router.push('/(app)/routines')} />
      </SafeAreaView>
    );
  }

  // Generating state
  if (generating) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.heading}>AI Planner</Text>
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
          <GeneratingScreen motivationalText={MOTIVATIONAL_TEXTS[motivationalIdx]} />
        )}
      </SafeAreaView>
    );
  }

  // Form steps
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
          <Ionicons name="sparkles" size={18} color="#3B82F6" />
          <Text style={styles.heading}>AI Planner</Text>
        </View>
        <Text style={styles.stepCount}>
          {step + 1}/{STEPS.length}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress dots */}
        <StepDots current={step} total={STEPS.length} />

        {/* Step title */}
        <Text style={styles.stepTitle}>{STEPS[step].title}</Text>
        <Text style={styles.stepSubtitle}>{STEPS[step].subtitle}</Text>

        <View style={{ marginTop: 20 }}>
          {step === 0 && <StepGoal form={form} update={update} />}
          {step === 1 && <StepTraining form={form} update={update} />}
          {step === 2 && <StepEquipment form={form} update={update} />}
          {step === 3 && <StepPreferences form={form} update={update} />}
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        {error && step === STEPS.length - 1 ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
            <Text style={styles.errorBannerText} numberOfLines={3}>{error}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={[styles.nextBtn, (!canNext() || generating) && styles.nextBtnDisabled]}
          onPress={step < STEPS.length - 1 ? () => { setError(''); setStep((s) => s + 1); } : handleGenerate}
          disabled={!canNext() || generating}
          activeOpacity={0.8}
        >
          {generating && step === STEPS.length - 1 ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.nextBtnText}>Generating…</Text>
            </>
          ) : step < STEPS.length - 1 ? (
            <>
              <Text style={styles.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.nextBtnText}>Generate My Plan</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  heading: { color: '#fff', fontSize: 18, fontWeight: '700',
    fontFamily: 'BarlowCondensed-Bold' },
  stepCount: { color: '#718FAF', fontSize: 13, width: 40, textAlign: 'right' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  stepTitle: { color: '#fff', fontSize: 22, fontWeight: '800',
    fontFamily: 'BarlowCondensed-ExtraBold',
    fontFamily: 'BarlowCondensed-ExtraBold', marginBottom: 4 },
  stepSubtitle: { color: '#718FAF', fontSize: 14 },
  footer: {
    padding: 20, borderTopWidth: 1, borderTopColor: '#0B1326',
    backgroundColor: '#060C1B',
  },
  nextBtn: {
    backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700',
    fontFamily: 'DMSans-Bold' },
  errorWrap: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  errorBox: {
    backgroundColor: '#0B1326', borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: '#ef444430', alignItems: 'center', width: '100%',
  },
  errorText: { color: '#ef4444', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  retryBtn: { marginTop: 14 },
  retryText: { color: '#718FAF', fontSize: 13, textDecorationLine: 'underline' },
});
