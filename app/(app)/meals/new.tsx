import { useState, useCallback } from 'react';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMeal } from '../../../src/api/nutrition';

interface IngredientRow {
  id: string;
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  amount: string;
  unit: string;
}

function makeIngredient(): IngredientRow {
  return {
    id: String(Date.now() + Math.random()),
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    amount: '',
    unit: 'g',
  };
}

export default function NewMealScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [mealName, setMealName] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([makeIngredient()]);

  const createMealMutation = useMutation({
    mutationFn: createMeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-meals'] });
      router.back();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to create meal. Please try again.');
    },
  });

  const updateIngredient = useCallback(
    (id: string, field: keyof IngredientRow, value: string) => {
      setIngredients((prev) =>
        prev.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
      );
    },
    []
  );

  const addIngredient = useCallback(() => {
    setIngredients((prev) => [...prev, makeIngredient()]);
  }, []);

  const removeIngredient = useCallback((id: string) => {
    setIngredients((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((ing) => ing.id !== id);
    });
  }, []);

  const handleSave = useCallback(() => {
    const trimmedName = mealName.trim();
    if (!trimmedName) {
      Alert.alert('Missing Name', 'Please enter a meal name.');
      return;
    }

    const validIngredients = ingredients.filter((ing) => ing.name.trim().length > 0);
    if (validIngredients.length === 0) {
      Alert.alert('No Ingredients', 'Please add at least one ingredient.');
      return;
    }

    const payload = {
      name: trimmedName,
      description: description.trim() || undefined,
      ingredients: validIngredients.map((ing) => ({
        name: ing.name.trim(),
        calories: parseFloat(ing.calories) || 0,
        protein: parseFloat(ing.protein) || 0,
        carbs: parseFloat(ing.carbs) || 0,
        fat: parseFloat(ing.fat) || 0,
        amount: ing.amount.trim() || undefined,
        unit: ing.unit.trim() || undefined,
      })),
    };

    createMealMutation.mutate(payload);
  }, [mealName, description, ingredients, createMealMutation]);

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
          <Text style={styles.heading}>New Meal</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Meal Name */}
          <Text style={styles.label}>Meal Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Post-Workout Chicken Bowl"
            placeholderTextColor="#555"
            value={mealName}
            onChangeText={setMealName}
            returnKeyType="next"
            autoFocus
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Optional notes about this meal..."
            placeholderTextColor="#555"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            returnKeyType="next"
            textAlignVertical="top"
          />

          {/* Ingredients */}
          <View style={styles.ingredientsHeader}>
            <Text style={styles.label}>Ingredients</Text>
            <TouchableOpacity style={styles.addIngBtn} onPress={addIngredient}>
              <Ionicons name="add" size={16} color="#6C63FF" />
              <Text style={styles.addIngText}>Add Row</Text>
            </TouchableOpacity>
          </View>

          {ingredients.map((ing, index) => (
            <IngredientInput
              key={ing.id}
              ingredient={ing}
              index={index}
              canRemove={ingredients.length > 1}
              onChange={(field, value) => updateIngredient(ing.id, field, value)}
              onRemove={() => removeIngredient(ing.id)}
            />
          ))}

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              createMealMutation.isPending && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={createMealMutation.isPending}
          >
            {createMealMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Meal</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function IngredientInput({
  ingredient,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  ingredient: IngredientRow;
  index: number;
  canRemove: boolean;
  onChange: (field: keyof IngredientRow, value: string) => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.ingredientCard}>
      <View style={styles.ingredientCardHeader}>
        <Text style={styles.ingredientNumber}>#{index + 1}</Text>
        {canRemove && (
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle-outline" size={20} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={[styles.input, styles.ingredientInput]}
        placeholder="Food name *"
        placeholderTextColor="#555"
        value={ingredient.name}
        onChangeText={(v) => onChange('name', v)}
        returnKeyType="next"
      />

      <View style={styles.amountRow}>
        <TextInput
          style={[styles.input, styles.ingredientInput, styles.amountInput]}
          placeholder="Amount"
          placeholderTextColor="#555"
          value={ingredient.amount}
          onChangeText={(v) => onChange('amount', v)}
          keyboardType="decimal-pad"
          returnKeyType="next"
        />
        <TextInput
          style={[styles.input, styles.ingredientInput, styles.unitInput]}
          placeholder="unit"
          placeholderTextColor="#555"
          value={ingredient.unit}
          onChangeText={(v) => onChange('unit', v)}
          returnKeyType="next"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.macroRow}>
        <View style={styles.macroField}>
          <Text style={styles.macroFieldLabel}>Calories</Text>
          <TextInput
            style={[styles.input, styles.ingredientInput]}
            placeholder="0"
            placeholderTextColor="#555"
            value={ingredient.calories}
            onChangeText={(v) => onChange('calories', v)}
            keyboardType="decimal-pad"
            returnKeyType="next"
          />
        </View>
        <View style={styles.macroField}>
          <Text style={styles.macroFieldLabel}>Protein (g)</Text>
          <TextInput
            style={[styles.input, styles.ingredientInput]}
            placeholder="0"
            placeholderTextColor="#555"
            value={ingredient.protein}
            onChangeText={(v) => onChange('protein', v)}
            keyboardType="decimal-pad"
            returnKeyType="next"
          />
        </View>
        <View style={styles.macroField}>
          <Text style={styles.macroFieldLabel}>Carbs (g)</Text>
          <TextInput
            style={[styles.input, styles.ingredientInput]}
            placeholder="0"
            placeholderTextColor="#555"
            value={ingredient.carbs}
            onChangeText={(v) => onChange('carbs', v)}
            keyboardType="decimal-pad"
            returnKeyType="next"
          />
        </View>
        <View style={styles.macroField}>
          <Text style={styles.macroFieldLabel}>Fat (g)</Text>
          <TextInput
            style={[styles.input, styles.ingredientInput]}
            placeholder="0"
            placeholderTextColor="#555"
            value={ingredient.fat}
            onChangeText={(v) => onChange('fat', v)}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </View>
      </View>
    </View>
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
  content: { paddingHorizontal: 20, paddingTop: 4 },
  label: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  ingredientsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
  },
  addIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6C63FF22',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addIngText: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },
  ingredientCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  ingredientCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ingredientNumber: { color: '#555', fontSize: 12, fontWeight: '700' },
  ingredientInput: { marginBottom: 8 },
  amountRow: { flexDirection: 'row', gap: 8 },
  amountInput: { flex: 2 },
  unitInput: { flex: 1 },
  macroRow: { flexDirection: 'row', gap: 8 },
  macroField: { flex: 1 },
  macroFieldLabel: { color: '#555', fontSize: 11, marginBottom: 4 },
  saveBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
