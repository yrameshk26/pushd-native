import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api/client';

// ── Types ────────────────────────────────────────────────────────────────────
type Goal = 'DEFICIT' | 'MAINTAIN' | 'SURPLUS';
type MealTypeKey = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';
type Sex = 'MALE' | 'FEMALE';

// ── Constants ─────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 3;

const GOALS: { value: Goal; emoji: string; label: string }[] = [
  { value: 'DEFICIT', emoji: '🔥', label: 'Lose' },
  { value: 'MAINTAIN', emoji: '⚖️', label: 'Maintain' },
  { value: 'SURPLUS', emoji: '💪', label: 'Gain' },
];

const DAY_OPTIONS = [3, 5, 7];

const MEAL_TYPES: { key: MealTypeKey; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' },
];

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'SEDENTARY', label: 'Sedentary', desc: 'Desk job, little exercise' },
  { value: 'LIGHT', label: 'Light', desc: '1-3 days/week' },
  { value: 'MODERATE', label: 'Moderate', desc: '3-5 days/week' },
  { value: 'ACTIVE', label: 'Active', desc: '6-7 days/week' },
  { value: 'VERY_ACTIVE', label: 'Very Active', desc: 'Twice daily / physical job' },
];

const CUISINES = [
  'Indian', 'Thai', 'Italian', 'Mexican', 'Japanese',
  'Mediterranean', 'American', 'Chinese', 'Korean', 'Middle Eastern',
];

const DIETARY = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Keto', 'Paleo', 'Halal', 'Kosher',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcAge(dob: string | null | undefined): string {
  if (!dob) return '';
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age > 0 ? String(age) : '';
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function NewMealPlanScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);

  // Step 1
  const [goal, setGoal] = useState<Goal>('MAINTAIN');
  const [days, setDays] = useState(7);
  const [mealTypes, setMealTypes] = useState<Record<MealTypeKey, boolean>>({
    breakfast: true, lunch: true, dinner: true, snacks: false,
  });

  // Step 2 — pre-populated from onboarding
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('MALE');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('MODERATE');

  // Step 3
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [dietary, setDietary] = useState<string[]>([]);
  const [disliked, setDisliked] = useState('');

  // Pre-populate body stats from onboarding
  useEffect(() => {
    api.get('/api/users/onboarding').then(({ data }) => {
      const u = data?.data;
      if (!u) return;
      if (u.heightCm) setHeight(String(u.heightCm));
      if (u.sex === 'MALE' || u.sex === 'FEMALE') setSex(u.sex);
      if (u.dateOfBirth) setAge(calcAge(u.dateOfBirth));
      if (u.activityLevel) setActivityLevel(u.activityLevel as ActivityLevel);
    }).catch(() => {
      // Silently ignore — user can fill in manually
    });
    // Also try to get latest weight from bodyweight API
    api.get('/api/bodyweight?limit=1').then(({ data }) => {
      const entry = data?.data?.[0];
      if (entry?.weight) setWeight(String(entry.weight));
    }).catch(() => {});
  }, []);

  const toggleMealType = useCallback((key: MealTypeKey) => {
    setMealTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleCuisine = useCallback((c: string) => {
    setCuisines((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  }, []);

  const toggleDietary = useCallback((d: string) => {
    setDietary((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }, []);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const selectedMealTypes = Object.entries(mealTypes)
        .filter(([, v]) => v)
        .map(([k]) => k.toUpperCase());

      const { data } = await api.post('/api/meal-plans', {
        goal,
        days,
        mealTypes: selectedMealTypes,
        cuisines,
        dietaryRestrictions: dietary,
        dislikedIngredients: disliked,
        weight,
        height,
        age,
        sex,
        activityLevel,
      }, { timeout: 120000 });
      return data?.data ?? data;
    },
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      if (plan?.id) {
        router.replace(`/(screens)/meals/${plan.id}` as never);
      } else {
        router.back();
      }
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
      if (status === 429) {
        Alert.alert('Rate Limit', 'You can generate up to 5 meal plans per hour. Please try again later.');
      } else if (isTimeout) {
        queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
        router.replace('/(app)/meals' as never);
      } else {
        const msg = err?.response?.data?.error ?? 'Failed to generate meal plan. Please try again.';
        Alert.alert('Error', msg);
      }
    },
  });

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.heading}>Create Meal Plan</Text>
            <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Step 1: Goal, Days, Meal Types ── */}
          {step === 1 && (
            <>
              <Text style={styles.sectionTitle}>What's your goal?</Text>
              <View style={styles.row3}>
                {GOALS.map((g) => {
                  const active = goal === g.value;
                  return (
                    <TouchableOpacity
                      key={g.value}
                      style={[styles.optionChip, active && styles.optionChipActive]}
                      onPress={() => setGoal(g.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                        {g.emoji} {g.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>How many days?</Text>
              <View style={styles.row3}>
                {DAY_OPTIONS.map((d) => {
                  const active = days === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[styles.optionChip, active && styles.optionChipActive]}
                      onPress={() => setDays(d)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                        {d} days
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>Include meal types</Text>
              <View style={styles.row2}>
                {MEAL_TYPES.map(({ key, label }) => {
                  const active = mealTypes[key];
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.optionChip, active && styles.optionChipActive]}
                      onPress={() => toggleMealType(key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Step 2: Body Stats ── */}
          {step === 2 && (
            <>
              <Text style={styles.bodyStatsNote}>
                We'll calculate your daily calorie target using the Mifflin-St Jeor formula.
              </Text>

              <View style={styles.statsGrid}>
                <View style={styles.statsCell}>
                  <Text style={styles.fieldLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="70"
                    placeholderTextColor="#4A6080"
                    keyboardType="decimal-pad"
                    value={weight}
                    onChangeText={setWeight}
                  />
                </View>
                <View style={styles.statsCell}>
                  <Text style={styles.fieldLabel}>Height (cm)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="175"
                    placeholderTextColor="#4A6080"
                    keyboardType="decimal-pad"
                    value={height}
                    onChangeText={setHeight}
                  />
                </View>
                <View style={styles.statsCell}>
                  <Text style={styles.fieldLabel}>Age</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="25"
                    placeholderTextColor="#4A6080"
                    keyboardType="number-pad"
                    value={age}
                    onChangeText={setAge}
                  />
                </View>
                <View style={styles.statsCell}>
                  <Text style={styles.fieldLabel}>Sex</Text>
                  <View style={styles.sexRow}>
                    {(['MALE', 'FEMALE'] as Sex[]).map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.sexBtn, sex === s && styles.sexBtnActive]}
                        onPress={() => setSex(s)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.sexBtnText, sex === s && styles.sexBtnTextActive]}>
                          {s === 'MALE' ? 'Male' : 'Female'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Activity Level</Text>
              <View style={styles.activityList}>
                {ACTIVITY_LEVELS.map((a) => {
                  const active = activityLevel === a.value;
                  return (
                    <TouchableOpacity
                      key={a.value}
                      style={[styles.activityRow, active && styles.activityRowActive]}
                      onPress={() => setActivityLevel(a.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.activityLabel, active && styles.activityLabelActive]}>
                        {a.label}
                      </Text>
                      <Text style={styles.activityDesc}>{a.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Step 3: Cuisine & Dietary ── */}
          {step === 3 && (
            <>
              <Text style={styles.sectionTitle}>Cuisine preferences</Text>
              <View style={styles.pillWrap}>
                {CUISINES.map((c) => {
                  const active = cuisines.includes(c);
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.pill, active && styles.pillActive]}
                      onPress={() => toggleCuisine(c)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>Dietary restrictions</Text>
              <View style={styles.pillWrap}>
                {DIETARY.map((d) => {
                  const active = dietary.includes(d);
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[styles.pill, active && styles.pillActive]}
                      onPress={() => toggleDietary(d)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>Ingredients to avoid</Text>
              <TextInput
                style={styles.textArea}
                placeholder="e.g. mushrooms, shellfish, cilantro..."
                placeholderTextColor="#4A6080"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={disliked}
                onChangeText={setDisliked}
              />
            </>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Footer CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, generateMutation.isPending && styles.ctaDisabled]}
            onPress={step < TOTAL_STEPS ? () => setStep((s) => s + 1) : () => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            activeOpacity={0.85}
          >
            {generateMutation.isPending ? (
              <View style={styles.ctaContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.ctaText}>Generating your plan...</Text>
              </View>
            ) : step < TOTAL_STEPS ? (
              <View style={styles.ctaContent}>
                <Text style={styles.ctaText}>Continue</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </View>
            ) : (
              <View style={styles.ctaContent}>
                <Ionicons name="restaurant" size={18} color="#fff" />
                <Text style={styles.ctaText}>Generate Meal Plan</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 4, width: 40 },
  heading: { fontSize: 20, fontWeight: '800', color: '#fff', fontFamily: 'BarlowCondensed-Bold' },
  stepLabel: { fontSize: 12, color: '#718FAF', fontFamily: 'DMSans-Regular', marginTop: 1 },

  progressTrack: {
    height: 4, backgroundColor: '#162540', marginHorizontal: 16, borderRadius: 2, marginBottom: 20,
  },
  progressFill: {
    height: 4, backgroundColor: '#3B82F6', borderRadius: 2,
  },

  content: { paddingHorizontal: 20 },

  sectionTitle: {
    fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'DMSans-SemiBold',
    marginBottom: 12, marginTop: 8,
  },

  // 3-column row
  row3: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  // 2-column row
  row2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },

  optionChip: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    backgroundColor: '#0B1326', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#162540',
  },
  optionChipActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)' },
  optionChipText: {
    color: '#718FAF', fontSize: 14, fontWeight: '600',
    fontFamily: 'DMSans-SemiBold', textAlign: 'center',
  },
  optionChipTextActive: { color: '#3B82F6' },

  // Step 2
  bodyStatsNote: {
    fontSize: 13, color: '#718FAF', fontFamily: 'DMSans-Regular',
    lineHeight: 20, marginBottom: 20,
  },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statsCell: { width: '47%' },

  fieldLabel: {
    fontSize: 12, color: '#718FAF', fontFamily: 'DMSans-Regular', marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#0B1326', borderWidth: 1, borderColor: '#162540',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 15, fontFamily: 'DMSans-Regular',
  },

  sexRow: { flexDirection: 'row', gap: 6 },
  sexBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    backgroundColor: '#0B1326', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#162540',
  },
  sexBtnActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)' },
  sexBtnText: { color: '#718FAF', fontSize: 14, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  sexBtnTextActive: { color: '#3B82F6' },

  activityList: { gap: 8, marginBottom: 16 },
  activityRow: {
    backgroundColor: '#0B1326', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#162540',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  activityRowActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.08)' },
  activityLabel: {
    color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'DMSans-SemiBold', marginBottom: 2,
  },
  activityLabelActive: { color: '#3B82F6' },
  activityDesc: { color: '#718FAF', fontSize: 12, fontFamily: 'DMSans-Regular' },

  // Step 3
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#0B1326', borderRadius: 20,
    borderWidth: 1, borderColor: '#162540',
  },
  pillActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)' },
  pillText: { color: '#718FAF', fontSize: 13, fontFamily: 'DMSans-Regular' },
  pillTextActive: { color: '#3B82F6', fontWeight: '600', fontFamily: 'DMSans-SemiBold' },

  textArea: {
    backgroundColor: '#0B1326', borderWidth: 1, borderColor: '#162540',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    color: '#fff', fontSize: 14, fontFamily: 'DMSans-Regular',
    minHeight: 100,
  },

  // Footer
  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: '#0F1B2D',
    backgroundColor: '#060C1B',
  },
  cta: {
    backgroundColor: '#3B82F6', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.65 },
  ctaContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'DMSans-Bold' },
});
