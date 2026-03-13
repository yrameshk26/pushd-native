import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNutritionGoals, saveNutritionGoals } from '../../../src/api/nutrition';
import { NutritionGoals } from '../../../src/types';

const DEFAULT_GOALS: NutritionGoals = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
  water: 2500,
};

interface GoalField {
  key: keyof NutritionGoals;
  label: string;
  unit: string;
  color: string;
  hint: string;
}

const GOAL_FIELDS: GoalField[] = [
  { key: 'calories', label: 'Daily Calories', unit: 'kcal', color: '#6C63FF', hint: 'Recommended: 1800–2500 kcal for most adults' },
  { key: 'protein', label: 'Protein', unit: 'g', color: '#3B82F6', hint: '0.7–1g per lb of bodyweight is a common target' },
  { key: 'carbs', label: 'Carbohydrates', unit: 'g', color: '#F97316', hint: '45–65% of total calories from carbs' },
  { key: 'fat', label: 'Fat', unit: 'g', color: '#EAB308', hint: '20–35% of total calories from fat' },
  { key: 'water', label: 'Water', unit: 'ml', color: '#06B6D4', hint: '2000–3000 ml (8–12 cups) per day' },
];

export default function NutritionGoalsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const goalsQuery = useQuery({
    queryKey: ['nutrition-goals'],
    queryFn: fetchNutritionGoals,
  });

  const [form, setForm] = useState<Record<keyof NutritionGoals, string>>({
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    water: '',
  });

  useEffect(() => {
    const goals = goalsQuery.data ?? DEFAULT_GOALS;
    setForm({
      calories: String(goals.calories),
      protein: String(goals.protein),
      carbs: String(goals.carbs),
      fat: String(goals.fat),
      water: String(goals.water),
    });
  }, [goalsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: saveNutritionGoals,
    onSuccess: (data) => {
      queryClient.setQueryData(['nutrition-goals'], data);
      Alert.alert('Saved', 'Your nutrition goals have been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Could not save goals. Please try again.');
    },
  });

  const handleSave = useCallback(() => {
    const calories = parseInt(form.calories, 10);
    const protein = parseInt(form.protein, 10);
    const carbs = parseInt(form.carbs, 10);
    const fat = parseInt(form.fat, 10);
    const water = parseInt(form.water, 10);

    if ([calories, protein, carbs, fat, water].some((v) => isNaN(v) || v < 0)) {
      Alert.alert('Invalid Values', 'Please enter valid numbers for all goals.');
      return;
    }

    saveMutation.mutate({ calories, protein, carbs, fat, water });
  }, [form, saveMutation]);

  const updateField = useCallback((key: keyof NutritionGoals, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  if (goalsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

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
          <Text style={styles.heading}>Nutrition Goals</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#6C63FF" />
            <Text style={styles.infoText}>
              Set your daily targets. These goals are used to calculate your progress bars and remaining intake.
            </Text>
          </View>

          {/* Goal Fields */}
          {GOAL_FIELDS.map(({ key, label, unit, color, hint }) => (
            <View key={key} style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <View style={[styles.fieldDot, { backgroundColor: color }]} />
                <Text style={styles.fieldLabel}>{label}</Text>
                <Text style={styles.fieldUnit}>{unit}</Text>
              </View>
              <TextInput
                style={[styles.fieldInput, { borderColor: color + '44' }]}
                value={form[key]}
                onChangeText={(v) => updateField(key, v)}
                keyboardType="number-pad"
                returnKeyType="done"
                selectTextOnFocus
              />
              <Text style={styles.fieldHint}>{hint}</Text>
            </View>
          ))}

          {/* Macro Calculator Info */}
          <View style={styles.calcCard}>
            <View style={styles.calcHeader}>
              <Ionicons name="calculator-outline" size={18} color="#6C63FF" />
              <Text style={styles.calcTitle}>Macro Split Guide</Text>
            </View>
            <Text style={styles.calcText}>
              A common balanced split for your calories:
            </Text>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Protein</Text>
              <Text style={[styles.calcValue, { color: '#3B82F6' }]}>
                {Math.round(((parseInt(form.calories) || 2000) * 0.30) / 4)}g
              </Text>
              <Text style={styles.calcPct}>(30%)</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Carbs</Text>
              <Text style={[styles.calcValue, { color: '#F97316' }]}>
                {Math.round(((parseInt(form.calories) || 2000) * 0.45) / 4)}g
              </Text>
              <Text style={styles.calcPct}>(45%)</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Fat</Text>
              <Text style={[styles.calcValue, { color: '#EAB308' }]}>
                {Math.round(((parseInt(form.calories) || 2000) * 0.25) / 9)}g
              </Text>
              <Text style={styles.calcPct}>(25%)</Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saveMutation.isPending && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Goals</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  heading: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  infoBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#6C63FF15',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#6C63FF33',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, color: '#999', fontSize: 13, lineHeight: 18 },
  fieldCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  fieldDot: { width: 10, height: 10, borderRadius: 5 },
  fieldLabel: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  fieldUnit: { color: '#555', fontSize: 13 },
  fieldInput: {
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    borderWidth: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  fieldHint: { color: '#555', fontSize: 12 },
  calcCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  calcHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  calcTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  calcText: { color: '#666', fontSize: 13, marginBottom: 12 },
  calcRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  calcLabel: { flex: 1, color: '#888', fontSize: 14 },
  calcValue: { fontSize: 16, fontWeight: '700', marginRight: 6 },
  calcPct: { color: '#555', fontSize: 12 },
  saveBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
