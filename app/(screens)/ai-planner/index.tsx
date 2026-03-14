import React, { useState, useEffect } from 'react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscriptionStore, isElite } from '../../../src/store/subscription';
import { ProGate } from '../../../components/ProGate';
import { api } from '../../../src/api/client';
import { storage } from '../../../src/utils/storage';
import { TOKEN_STORAGE_KEY, API_BASE_URL } from '../../../src/constants/config';

// ─── Types ─────────────────────────────────────────────────────────────────

type Goal = 'Build Muscle' | 'Lose Fat' | 'Get Stronger' | 'Improve Fitness' | 'Athletic Performance';
type Level = 'beginner' | 'intermediate' | 'advanced';
type Sex = 'male' | 'female' | 'other';
type Equipment =
  | 'BARBELL' | 'DUMBBELL' | 'CABLE' | 'MACHINE'
  | 'BODYWEIGHT' | 'KETTLEBELL' | 'RESISTANCE_BAND' | 'SMITH_MACHINE';

interface PlanForm {
  age: string;
  sex: Sex | '';
  heightCm: string;
  weightKg: string;
  goal: Goal | '';
  level: Level | '';
  daysPerWeek: number;
  duration: number;
  equipment: Equipment[];
  notes: string;
}

interface PreviewExercise {
  exerciseId: string;
  exerciseName: string;
  order: number;
  targetSets: number;
  targetReps: number | null;
  notes: string | null;
}

interface PreviewRoutine {
  name: string;
  description: string;
  exercises: PreviewExercise[];
}

interface PreviewPlan {
  planName: string;
  planDescription: string;
  weeklySchedule?: string;
  routines: PreviewRoutine[];
}

interface SavedRoutine {
  id: string;
  name: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const GOALS: { value: Goal; emoji: string; desc: string }[] = [
  { value: 'Build Muscle', emoji: '💪', desc: 'Increase muscle size and definition' },
  { value: 'Lose Fat', emoji: '🔥', desc: 'Burn fat while preserving muscle' },
  { value: 'Get Stronger', emoji: '🏋️', desc: 'Increase strength in key lifts' },
  { value: 'Improve Fitness', emoji: '❤️', desc: 'Better endurance and overall health' },
  { value: 'Athletic Performance', emoji: '⚡', desc: 'Sport-specific strength & power' },
];

const LEVELS: { value: Level; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'Less than 1 year training' },
  { value: 'intermediate', label: 'Intermediate', desc: '1–3 years consistent training' },
  { value: 'advanced', label: 'Advanced', desc: '3+ years of training' },
];

const DAYS_OPTIONS = [2, 3, 4, 5, 6];
const DURATION_PRESETS = [30, 45, 60, 75, 90] as const;

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'BARBELL', label: 'Barbell' },
  { value: 'DUMBBELL', label: 'Dumbbells' },
  { value: 'CABLE', label: 'Cables' },
  { value: 'MACHINE', label: 'Machines' },
  { value: 'BODYWEIGHT', label: 'Bodyweight' },
  { value: 'KETTLEBELL', label: 'Kettlebells' },
  { value: 'RESISTANCE_BAND', label: 'Resistance Bands' },
  { value: 'SMITH_MACHINE', label: 'Smith Machine' },
];

const STEPS = [
  { title: 'About You', subtitle: 'Help us personalise your plan' },
  { title: 'Your Goal', subtitle: 'What are you training for?' },
  { title: 'Training Details', subtitle: 'Level and schedule' },
  { title: 'Equipment', subtitle: 'What do you have access to?' },
  { title: 'Anything Else?', subtitle: 'Injuries, preferences, focus areas' },
];

const DEFAULT_FORM: PlanForm = {
  age: '', sex: '', heightCm: '', weightKg: '',
  goal: '', level: '',
  daysPerWeek: 3, duration: 60,
  equipment: ['BARBELL', 'DUMBBELL', 'CABLE', 'MACHINE', 'BODYWEIGHT'],
  notes: '',
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

// ─── Step 0: About You ─────────────────────────────────────────────────────

function StepAbout({ form, update }: { form: PlanForm; update: (p: Partial<PlanForm>) => void }) {
  const SEX_OPTIONS: { value: Sex; label: string }[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.sectionLabel}>Age</Text>
      <TextInput
        style={inputStyles.field}
        value={form.age}
        onChangeText={(t) => update({ age: t })}
        placeholder="e.g. 28"
        placeholderTextColor="#4A6080"
        keyboardType="number-pad"
        maxLength={3}
      />

      <Text style={[stepStyles.sectionLabel, { marginTop: 20 }]}>Sex</Text>
      <View style={inputStyles.sexRow}>
        {SEX_OPTIONS.map(({ value, label }) => (
          <TouchableOpacity
            key={value}
            style={[inputStyles.sexBtn, form.sex === value && inputStyles.sexBtnSelected]}
            onPress={() => update({ sex: value })}
            activeOpacity={0.7}
          >
            <Text style={[inputStyles.sexBtnText, form.sex === value && inputStyles.sexBtnTextSelected]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={inputStyles.row}>
        <View style={inputStyles.halfWrap}>
          <Text style={stepStyles.sectionLabel}>Height (cm)</Text>
          <TextInput
            style={inputStyles.field}
            value={form.heightCm}
            onChangeText={(t) => update({ heightCm: t })}
            placeholder="e.g. 178"
            placeholderTextColor="#4A6080"
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>
        <View style={inputStyles.halfWrap}>
          <Text style={stepStyles.sectionLabel}>Weight (kg)</Text>
          <TextInput
            style={inputStyles.field}
            value={form.weightKg}
            onChangeText={(t) => update({ weightKg: t })}
            placeholder="e.g. 80"
            placeholderTextColor="#4A6080"
            keyboardType="decimal-pad"
            maxLength={5}
          />
        </View>
      </View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  field: {
    backgroundColor: '#0B1326', borderWidth: 1, borderColor: '#162540',
    borderRadius: 12, padding: 14, color: '#fff', fontSize: 15,
  },
  row: { flexDirection: 'row', gap: 12, marginTop: 20 },
  halfWrap: { flex: 1 },
  sexRow: { flexDirection: 'row', gap: 8 },
  sexBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
    borderColor: '#162540', backgroundColor: '#0B1326', alignItems: 'center',
  },
  sexBtnSelected: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  sexBtnText: { color: '#718FAF', fontSize: 14, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  sexBtnTextSelected: { color: '#fff' },
});

// ─── Step 1: Goal ──────────────────────────────────────────────────────────

function StepGoal({ form, update }: { form: PlanForm; update: (p: Partial<PlanForm>) => void }) {
  return (
    <View style={stepStyles.container}>
      {GOALS.map(({ value, emoji, desc }) => {
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
              <Text style={stepStyles.optionLabel}>{value}</Text>
              <Text style={stepStyles.optionDesc}>{desc}</Text>
            </View>
            {selected && <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Step 2: Training Details ──────────────────────────────────────────────

function StepTraining({ form, update }: { form: PlanForm; update: (p: Partial<PlanForm>) => void }) {
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
        Days per week<Text style={stepStyles.accentText}> {form.daysPerWeek}</Text>
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

      <Text style={[stepStyles.sectionLabel, { marginTop: 24 }]}>
        Session duration<Text style={stepStyles.accentText}> {form.duration} min</Text>
      </Text>
      <View style={stepStyles.daysRow}>
        {DURATION_PRESETS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[stepStyles.dayBtn, form.duration === d && stepStyles.dayBtnSelected]}
            onPress={() => update({ duration: d })}
            activeOpacity={0.7}
          >
            <Text style={[stepStyles.dayBtnText, form.duration === d && stepStyles.dayBtnTextSelected]}>
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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

  return (
    <View style={stepStyles.container}>
      <TouchableOpacity
        onPress={() => update({ equipment: EQUIPMENT_OPTIONS.map((e) => e.value) })}
        style={stepStyles.selectAllBtn}
      >
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

// ─── Step 4: Notes ─────────────────────────────────────────────────────────

function StepNotes({ form, update }: { form: PlanForm; update: (p: Partial<PlanForm>) => void }) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.optionDesc}>
        Tell the AI anything else that would help personalise your plan — injuries, weak points, exercises you enjoy or want to avoid, etc.
      </Text>
      <TextInput
        style={notesStyles.textarea}
        value={form.notes}
        onChangeText={(t) => update({ notes: t })}
        placeholder="e.g. Bad left knee — avoid deep squats. Want to focus on upper body. Love deadlifts."
        placeholderTextColor="#4A6080"
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />
      <Text style={notesStyles.hint}>Optional — leave blank if nothing to add.</Text>
    </View>
  );
}

const notesStyles = StyleSheet.create({
  textarea: {
    backgroundColor: '#0B1326', borderWidth: 1, borderColor: '#162540',
    borderRadius: 12, padding: 14, color: '#fff', fontSize: 15, lineHeight: 22,
    minHeight: 120, marginTop: 16,
  },
  hint: { color: '#4A6080', fontSize: 13, marginTop: 8 },
});

// ─── Shared step styles ────────────────────────────────────────────────────

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
  optionLabel: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'DMSans-Bold', marginBottom: 2 },
  optionDesc: { color: '#718FAF', fontSize: 13, lineHeight: 19 },
  selectAllBtn: { alignSelf: 'flex-start', marginBottom: 4 },
  selectAllText: { color: '#3B82F6', fontSize: 13, fontWeight: '600' },
  daysRow: { flexDirection: 'row', gap: 8 },
  dayBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
    borderColor: '#162540', backgroundColor: '#0B1326', alignItems: 'center',
  },
  dayBtnSelected: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  dayBtnText: { color: '#718FAF', fontSize: 14, fontWeight: '700' },
  dayBtnTextSelected: { color: '#fff' },
});

// ─── Loading / Success screen ──────────────────────────────────────────────

function GeneratingScreen({ status }: { status: string }) {
  return (
    <View style={genStyles.container}>
      <View style={genStyles.pulseWrap}>
        <View style={genStyles.pulseOuter} />
        <View style={genStyles.pulseInner}>
          <Ionicons name="sparkles" size={28} color="#3B82F6" />
        </View>
      </View>
      <Text style={genStyles.title}>Building Your Plan</Text>
      <Text style={genStyles.status}>{status}</Text>
      <Text style={genStyles.hint}>This usually takes 15–30 seconds</Text>
    </View>
  );
}

function SuccessScreen({ routines, onViewRoutines }: { routines: SavedRoutine[]; onViewRoutines: () => void }) {
  return (
    <ScrollView contentContainerStyle={successStyles.container}>
      <View style={successStyles.iconWrap}>
        <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
      </View>
      <Text style={successStyles.planName}>Routines Saved!</Text>
      <Text style={successStyles.planDesc}>{routines.length} routine{routines.length !== 1 ? 's' : ''} added to your library</Text>
      <View style={successStyles.routineList}>
        {routines.map((r) => (
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
  title: { color: '#fff', fontSize: 20, fontWeight: '700', fontFamily: 'BarlowCondensed-Bold', marginBottom: 10, textAlign: 'center' },
  status: { color: '#718FAF', fontSize: 15, textAlign: 'center', marginBottom: 8 },
  hint: { color: '#4A6080', fontSize: 13, textAlign: 'center' },
});

const successStyles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  iconWrap: { marginBottom: 16 },
  planName: { color: '#fff', fontSize: 22, fontWeight: '800', fontFamily: 'BarlowCondensed-ExtraBold', textAlign: 'center', marginBottom: 8 },
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
  routineName: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  viewBtn: { width: '100%', backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  viewBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'DMSans-Bold' },
});

// ─── Main screen ───────────────────────────────────────────────────────────

export default function AIPlannerScreen() {
  const { tier } = useSubscriptionStore();
  const queryClient = useQueryClient();

  if (!isElite(tier)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#060C1B' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', fontFamily: 'BarlowCondensed-Bold', flex: 1, textAlign: 'center' }}>AI Planner</Text>
          <View style={{ width: 40 }} />
        </View>
        <ProGate required="elite">{null}</ProGate>
      </SafeAreaView>
    );
  }
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<PlanForm>(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState('Initialising...');
  const [preview, setPreview] = useState<PreviewPlan | null>(null);
  const [saved, setSaved] = useState<SavedRoutine[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch body profile for pre-population
  const { data: profile } = useQuery({
    queryKey: ['onboarding-profile'],
    queryFn: async () => {
      const { data } = await api.get('/api/users/onboarding');
      return data?.data ?? data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Pre-populate age, sex, height, weight from profile
  useEffect(() => {
    if (!profile) return;
    const updates: Partial<PlanForm> = {};

    if (profile.heightCm) {
      updates.heightCm = String(profile.heightCm);
    }
    if (profile.latestWeightKg) {
      updates.weightKg = String(Math.round(profile.latestWeightKg));
    }
    if (profile.dateOfBirth) {
      const dob = new Date(profile.dateOfBirth);
      const now = new Date();
      const age = now.getFullYear() - dob.getFullYear() -
        (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      if (age >= 13 && age <= 100) updates.age = String(age);
    }
    if (profile.sex === 'MALE') {
      updates.sex = 'male';
    } else if (profile.sex === 'FEMALE') {
      updates.sex = 'female';
    }

    if (Object.keys(updates).length > 0) {
      setForm((prev) => ({ ...prev, ...updates }));
    }
  }, [profile]);

  function update(partial: Partial<PlanForm>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function canNext(): boolean {
    if (step === 0) return !!form.age && !!form.sex;
    if (step === 1) return !!form.goal;
    if (step === 2) return !!form.level;
    if (step === 3) return form.equipment.length > 0;
    return true;
  }

  async function generate() {
    setGenerating(true);
    setError('');
    setStatus('Initialising...');

    try {
      const token = await storage.getItemAsync(TOKEN_STORAGE_KEY);

      const res = await fetch(`${API_BASE_URL}/api/ai-planner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          age: parseInt(form.age) || undefined,
          sex: form.sex || undefined,
          heightCm: parseFloat(form.heightCm) || undefined,
          weightKg: parseFloat(form.weightKg) || undefined,
          goal: form.goal || undefined,
          level: form.level || undefined,
          daysPerWeek: form.daysPerWeek,
          duration: form.duration,
          equipment: form.equipment,
          notes: form.notes.trim() || undefined,
          dryRun: true,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const status429 = res.status === 429;
        const msg = status429
          ? 'Rate limit reached — you can generate up to 50 plans per hour. Please try again later.'
          : (errJson.error ?? 'Failed to generate plan. Please try again.');
        throw new Error(msg);
      }

      function parseSseText(text: string) {
        const lines = text.split('\n\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.type === 'status') {
              setStatus(json.message);
            } else if (json.type === 'error') {
              throw new Error(json.message);
            } else if (json.type === 'done') {
              setPreview({
                planName: json.planName,
                planDescription: json.planDescription,
                weeklySchedule: json.weeklySchedule,
                routines: json.routines ?? [],
              });
            }
          } catch (parseErr) {
            // skip malformed event
          }
        }
      }

      // React Native fetch may not support ReadableStream — fall back to res.text()
      if (!res.body) {
        const text = await res.text();
        parseSseText(text);
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;
          buffer += decoder.decode(value, { stream: true });

          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() ?? '';
          parseSseText(chunks.join('\n\n'));
        }
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to generate plan. Please try again.';
      setError(msg);
      Alert.alert('Generation Failed', msg);
    } finally {
      setGenerating(false);
    }
  }

  // Saved state
  if (saved) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.heading}>AI Planner</Text>
          <View style={{ width: 40 }} />
        </View>
        <SuccessScreen routines={saved} onViewRoutines={() => router.push('/(app)/routines')} />
      </SafeAreaView>
    );
  }

  // Preview (review before saving) state
  if (preview) {
    async function handleSave() {
      if (!preview) return;
      setSaving(true);
      try {
        const { data } = await api.post('/api/ai-planner/confirm', {
          planName: preview.planName,
          planDescription: preview.planDescription,
          weeklySchedule: preview.weeklySchedule,
          routines: preview.routines,
        });
        const routines = data?.data?.routines ?? data?.routines ?? [];
        queryClient.invalidateQueries({ queryKey: ['routines'] });
        setSaved(routines);
        setPreview(null);
      } catch (err: any) {
        Alert.alert('Save Failed', err?.response?.data?.error ?? 'Could not save routines. Please try again.');
      } finally {
        setSaving(false);
      }
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setPreview(null)} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="sparkles" size={18} color="#3B82F6" />
            <Text style={styles.heading}>Your Plan</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={reviewStyles.content} showsVerticalScrollIndicator={false}>
          {/* Plan summary */}
          <Text style={reviewStyles.planName}>{preview.planName}</Text>
          <Text style={reviewStyles.planDesc}>{preview.planDescription}</Text>
          {preview.weeklySchedule ? (
            <View style={reviewStyles.schedulePill}>
              <Ionicons name="calendar-outline" size={13} color="#3B82F6" />
              <Text style={reviewStyles.scheduleText}>{preview.weeklySchedule}</Text>
            </View>
          ) : null}

          <Text style={reviewStyles.sectionLabel}>{preview.routines.length} ROUTINES</Text>

          {preview.routines.map((routine, ri) => (
            <View key={ri} style={reviewStyles.routineCard}>
              <View style={reviewStyles.routineHeader}>
                <View style={reviewStyles.routineIconWrap}>
                  <Ionicons name="barbell" size={16} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={reviewStyles.routineName}>{routine.name}</Text>
                  {routine.description ? (
                    <Text style={reviewStyles.routineDesc} numberOfLines={1}>{routine.description}</Text>
                  ) : null}
                </View>
                <Text style={reviewStyles.exerciseCount}>{routine.exercises.length} exercises</Text>
              </View>

              {routine.exercises.map((ex, ei) => (
                <View key={ei} style={[reviewStyles.exerciseRow, ei < routine.exercises.length - 1 && reviewStyles.exerciseRowBorder]}>
                  <Text style={reviewStyles.exerciseName} numberOfLines={1}>{ex.exerciseName}</Text>
                  <Text style={reviewStyles.exerciseMeta}>
                    {ex.targetSets} × {ex.targetReps ?? '—'}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Footer actions */}
        <View style={reviewStyles.footer}>
          <TouchableOpacity
            style={reviewStyles.discardBtn}
            onPress={() => { setPreview(null); setStep(0); setForm(DEFAULT_FORM); }}
            activeOpacity={0.7}
          >
            <Text style={reviewStyles.discardText}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[reviewStyles.regenerateBtn]}
            onPress={() => setPreview(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={16} color="#3B82F6" />
            <Text style={reviewStyles.regenerateText}>Regenerate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[reviewStyles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            )}
            <Text style={reviewStyles.saveBtnText}>{saving ? 'Saving…' : 'Save Routines'}</Text>
          </TouchableOpacity>
        </View>
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
        <GeneratingScreen status={status} />
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
        <Text style={styles.stepCount}>{step + 1}/{STEPS.length}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StepDots current={step} total={STEPS.length} />

        <Text style={styles.stepTitle}>{STEPS[step].title}</Text>
        <Text style={styles.stepSubtitle}>{STEPS[step].subtitle}</Text>

        <View style={{ marginTop: 20 }}>
          {step === 0 && <StepAbout form={form} update={update} />}
          {step === 1 && <StepGoal form={form} update={update} />}
          {step === 2 && <StepTraining form={form} update={update} />}
          {step === 3 && <StepEquipment form={form} update={update} />}
          {step === 4 && <StepNotes form={form} update={update} />}
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
          style={[styles.nextBtn, !canNext() && styles.nextBtnDisabled]}
          onPress={step < STEPS.length - 1 ? () => { setError(''); setStep((s) => s + 1); } : generate}
          disabled={!canNext()}
          activeOpacity={0.8}
        >
          {step < STEPS.length - 1 ? (
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

const reviewStyles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  planName: { color: '#fff', fontSize: 22, fontWeight: '800', fontFamily: 'BarlowCondensed-ExtraBold', marginBottom: 6 },
  planDesc: { color: '#718FAF', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  schedulePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(59,130,246,0.12)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, marginBottom: 20,
  },
  scheduleText: { color: '#3B82F6', fontSize: 12, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  sectionLabel: {
    color: '#718FAF', fontSize: 11, fontWeight: '700', letterSpacing: 1,
    marginBottom: 12, fontFamily: 'BarlowCondensed-SemiBold',
  },
  routineCard: {
    backgroundColor: '#0B1326', borderRadius: 14, borderWidth: 1,
    borderColor: '#162540', marginBottom: 12, overflow: 'hidden',
  },
  routineHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#162540',
  },
  routineIconWrap: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: 'rgba(59,130,246,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  routineName: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  routineDesc: { color: '#718FAF', fontSize: 12, fontFamily: 'DMSans-Regular', marginTop: 1 },
  exerciseCount: { color: '#4A6080', fontSize: 11, fontFamily: 'DMSans-Regular', flexShrink: 0 },
  exerciseRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  exerciseRowBorder: { borderBottomWidth: 1, borderBottomColor: '#0F1A2E' },
  exerciseName: { color: '#A8BDD4', fontSize: 13, fontFamily: 'DMSans-Regular', flex: 1, marginRight: 8 },
  exerciseMeta: { color: '#4A6080', fontSize: 12, fontFamily: 'DMSans-Regular', flexShrink: 0 },
  footer: {
    flexDirection: 'row', gap: 8, padding: 16,
    borderTopWidth: 1, borderTopColor: '#0B1326', backgroundColor: '#060C1B',
  },
  discardBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
    borderColor: '#162540', alignItems: 'center', justifyContent: 'center',
  },
  discardText: { color: '#718FAF', fontSize: 14, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  regenerateBtn: {
    flex: 1.2, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
    borderColor: '#3B82F644', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5,
  },
  regenerateText: { color: '#3B82F6', fontSize: 14, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  saveBtn: {
    flex: 2, backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'DMSans-Bold' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  heading: { color: '#fff', fontSize: 18, fontWeight: '700', fontFamily: 'BarlowCondensed-Bold' },
  stepCount: { color: '#718FAF', fontSize: 13, width: 40, textAlign: 'right' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  stepTitle: { color: '#fff', fontSize: 22, fontWeight: '800', fontFamily: 'BarlowCondensed-ExtraBold', marginBottom: 4 },
  stepSubtitle: { color: '#718FAF', fontSize: 14 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#0B1326', backgroundColor: '#060C1B' },
  nextBtn: {
    backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: 12, marginBottom: 12,
  },
  errorBannerText: { flex: 1, color: '#ef4444', fontSize: 13, lineHeight: 19 },
});
