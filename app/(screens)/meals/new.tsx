import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api/client';

type Goal = 'DEFICIT' | 'MAINTAIN' | 'SURPLUS';

const GOALS: { value: Goal; label: string; icon: string; desc: string; color: string }[] = [
  { value: 'DEFICIT', label: 'Lose Weight', icon: 'trending-down-outline', desc: 'Calorie deficit for fat loss', color: '#60a5fa' },
  { value: 'MAINTAIN', label: 'Maintain', icon: 'remove-outline', desc: 'Maintenance calories', color: '#fbbf24' },
  { value: 'SURPLUS', label: 'Gain Muscle', icon: 'trending-up-outline', desc: 'Calorie surplus for growth', color: '#34d399' },
];

const DURATION_OPTIONS = [7, 14, 21, 30];

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Keto', 'Paleo', 'Halal', 'Kosher',
];

const CUISINE_OPTIONS = [
  'Any', 'Mediterranean', 'Asian', 'American',
  'Mexican', 'Indian', 'Italian', 'Middle Eastern',
];

interface GeneratePlanPayload {
  goal: Goal;
  days: number;
  dietary?: string[];
  cuisine?: string;
  name?: string;
}

async function generateMealPlan(payload: GeneratePlanPayload) {
  const { data } = await api.post('/api/meal-plans', {
    goal: payload.goal,
    days: payload.days,
    dietaryRestrictions: payload.dietary ?? [],
    cuisines: payload.cuisine && payload.cuisine !== 'Any' ? [payload.cuisine] : [],
    planName: payload.name,
  });
  return data?.data ?? data;
}

export default function NewMealPlanScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [goal, setGoal] = useState<Goal>('MAINTAIN');
  const [days, setDays] = useState(7);
  const [dietary, setDietary] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState('Any');
  const [planName, setPlanName] = useState('');

  const generateMutation = useMutation({
    mutationFn: generateMealPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      router.back();
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      if (status === 429) {
        Alert.alert('Rate Limit', 'You can generate up to 5 meal plans per hour. Please try again later.');
      } else {
        const msg = err?.response?.data?.error ?? 'Failed to generate meal plan. Please try again.';
        Alert.alert('Error', msg);
      }
    },
  });

  const toggleDietary = useCallback((option: string) => {
    setDietary((prev) =>
      prev.includes(option) ? prev.filter((d) => d !== option) : [...prev, option]
    );
  }, []);

  const handleGenerate = useCallback(() => {
    generateMutation.mutate({
      goal,
      days,
      dietary: dietary.length > 0 ? dietary : undefined,
      cuisine: cuisine !== 'Any' ? cuisine : undefined,
      name: planName.trim() || undefined,
    });
  }, [goal, days, dietary, cuisine, planName, generateMutation]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heading}>New Meal Plan</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Plan Name (optional) */}
          <Text style={styles.sectionLabel}>Plan Name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. My Summer Plan"
            placeholderTextColor="#555"
            value={planName}
            onChangeText={setPlanName}
            returnKeyType="done"
          />

          {/* Goal */}
          <Text style={styles.sectionLabel}>Goal</Text>
          <View style={styles.goalCards}>
            {GOALS.map((g) => {
              const active = goal === g.value;
              return (
                <TouchableOpacity
                  key={g.value}
                  style={[styles.goalCard, active && { borderColor: g.color, backgroundColor: g.color + '15' }]}
                  onPress={() => setGoal(g.value)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={g.icon as any} size={22} color={active ? g.color : '#555'} />
                  <Text style={[styles.goalCardLabel, active && { color: g.color }]}>{g.label}</Text>
                  <Text style={styles.goalCardDesc}>{g.desc}</Text>
                  {active && (
                    <View style={[styles.activeCheck, { backgroundColor: g.color }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Duration */}
          <Text style={styles.sectionLabel}>Duration</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.durationChip, days === d && styles.durationChipActive]}
                onPress={() => setDays(d)}
                activeOpacity={0.8}
              >
                <Text style={[styles.durationChipText, days === d && styles.durationChipTextActive]}>
                  {d} days
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Dietary Preferences */}
          <Text style={styles.sectionLabel}>Dietary Preferences</Text>
          <View style={styles.chipWrap}>
            {DIETARY_OPTIONS.map((opt) => {
              const active = dietary.includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleDietary(opt)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cuisine */}
          <Text style={styles.sectionLabel}>Cuisine Style</Text>
          <View style={styles.chipWrap}>
            {CUISINE_OPTIONS.map((opt) => {
              const active = cuisine === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCuisine(opt)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Generate Button */}
          <TouchableOpacity
            style={[styles.generateBtn, generateMutation.isPending && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={generateMutation.isPending}
            activeOpacity={0.85}
          >
            {generateMutation.isPending ? (
              <View style={styles.generateBtnContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.generateBtnText}>Generating plan...</Text>
              </View>
            ) : (
              <View style={styles.generateBtnContent}>
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={styles.generateBtnText}>Generate AI Meal Plan</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            AI will create a personalized {days}-day meal plan based on your preferences.
          </Text>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  heading: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  sectionLabel: {
    color: '#888', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 10, marginTop: 24,
  },

  input: {
    backgroundColor: '#1a1a1a', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    color: '#fff', fontSize: 15,
    borderWidth: 1, borderColor: '#2a2a2a',
  },

  goalCards: { flexDirection: 'row', gap: 10 },
  goalCard: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: '#1a1a1a', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#2a2a2a',
    padding: 14, position: 'relative',
  },
  goalCardLabel: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  goalCardDesc: { color: '#555', fontSize: 10, textAlign: 'center' },
  activeCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },

  durationRow: { flexDirection: 'row', gap: 10 },
  durationChip: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    backgroundColor: '#1a1a1a', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#2a2a2a',
  },
  durationChipActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)' },
  durationChipText: { color: '#666', fontSize: 13, fontWeight: '600' },
  durationChipTextActive: { color: '#3B82F6' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#1a1a1a', borderRadius: 20,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  chipActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)' },
  chipText: { color: '#666', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#3B82F6', fontWeight: '600' },

  generateBtn: {
    backgroundColor: '#3B82F6', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 32,
  },
  generateBtnDisabled: { opacity: 0.65 },
  generateBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  hint: {
    color: '#444', fontSize: 12, textAlign: 'center',
    marginTop: 10, lineHeight: 18,
  },
});
