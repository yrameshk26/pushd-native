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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logFood, lookupBarcode } from '../../../src/api/nutrition';
import { MealType } from '../../../src/types';

const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'BREAKFAST', label: 'Breakfast' },
  { key: 'LUNCH', label: 'Lunch' },
  { key: 'DINNER', label: 'Dinner' },
  { key: 'SNACK', label: 'Snack' },
];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function LogFoodScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ mealType?: string; date?: string }>();

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [barcode, setBarcode] = useState('');
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(
    (params.mealType as MealType) ?? 'BREAKFAST'
  );
  const date = params.date ?? formatDate(new Date());

  const logFoodMutation = useMutation({
    mutationFn: logFood,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs', date] });
      router.back();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to log food. Please try again.');
    },
  });

  const handleBarcodeSearch = useCallback(async () => {
    if (!barcode.trim()) return;
    setIsBarcodeLoading(true);
    try {
      const result = await lookupBarcode(barcode.trim());
      if (result) {
        setName(result.name);
        setCalories(String(result.calories));
        setProtein(String(result.protein));
        setCarbs(String(result.carbs));
        setFat(String(result.fat));
      } else {
        Alert.alert('Not Found', 'No food found for this barcode. Please enter details manually.');
      }
    } catch {
      Alert.alert('Error', 'Could not look up barcode. Please enter details manually.');
    } finally {
      setIsBarcodeLoading(false);
    }
  }, [barcode]);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Missing Info', 'Please enter a food name.');
      return;
    }

    const parsedCalories = parseFloat(calories);
    if (isNaN(parsedCalories) || parsedCalories < 0) {
      Alert.alert('Invalid Calories', 'Please enter a valid calorie amount.');
      return;
    }

    logFoodMutation.mutate({
      name: trimmedName,
      calories: parsedCalories,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      mealType: selectedMeal,
      date,
    });
  }, [name, calories, protein, carbs, fat, selectedMeal, date, logFoodMutation]);

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
          <Text style={styles.heading}>Log Food</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Meal Type Selector */}
          <Text style={styles.label}>Meal</Text>
          <View style={styles.mealRow}>
            {MEAL_TYPES.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.mealChip, selectedMeal === key && styles.mealChipActive]}
                onPress={() => setSelectedMeal(key)}
              >
                <Text
                  style={[styles.mealChipText, selectedMeal === key && styles.mealChipTextActive]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Barcode Input */}
          <Text style={styles.label}>Barcode Lookup</Text>
          <View style={styles.barcodeRow}>
            <View style={styles.barcodeInput}>
              <Ionicons name="barcode-outline" size={18} color="#555" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.barcodeText}
                placeholder="Enter barcode number..."
                placeholderTextColor="#555"
                value={barcode}
                onChangeText={setBarcode}
                keyboardType="number-pad"
                returnKeyType="search"
                onSubmitEditing={handleBarcodeSearch}
              />
            </View>
            <TouchableOpacity
              style={styles.barcodeBtn}
              onPress={handleBarcodeSearch}
              disabled={isBarcodeLoading || !barcode.trim()}
            >
              {isBarcodeLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.barcodeBtnText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or enter manually</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Manual Entry */}
          <Text style={styles.label}>Food Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Chicken Breast"
            placeholderTextColor="#555"
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />

          <Text style={styles.label}>Calories (kcal) *</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#555"
            value={calories}
            onChangeText={setCalories}
            keyboardType="decimal-pad"
            returnKeyType="next"
          />

          <Text style={styles.label}>Macros</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroField}>
              <Text style={styles.macroFieldLabel}>Protein (g)</Text>
              <TextInput
                style={[styles.input, styles.macroInput]}
                placeholder="0"
                placeholderTextColor="#555"
                value={protein}
                onChangeText={setProtein}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
            <View style={styles.macroField}>
              <Text style={styles.macroFieldLabel}>Carbs (g)</Text>
              <TextInput
                style={[styles.input, styles.macroInput]}
                placeholder="0"
                placeholderTextColor="#555"
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
            <View style={styles.macroField}>
              <Text style={styles.macroFieldLabel}>Fat (g)</Text>
              <TextInput
                style={[styles.input, styles.macroInput]}
                placeholder="0"
                placeholderTextColor="#555"
                value={fat}
                onChangeText={setFat}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>
          </View>

          {/* Date display */}
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={15} color="#555" />
            <Text style={styles.dateInfoText}>Logging for {date}</Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, logFoodMutation.isPending && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={logFoodMutation.isPending}
          >
            {logFoodMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Log Food</Text>
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
  label: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 20,
  },
  mealRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mealChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  mealChipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  mealChipText: { color: '#888', fontSize: 14, fontWeight: '500' },
  mealChipTextActive: { color: '#fff' },
  barcodeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  barcodeInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  barcodeText: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 12 },
  barcodeBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 72,
    alignItems: 'center',
  },
  barcodeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2a2a2a' },
  dividerText: { color: '#555', fontSize: 12 },
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
  macroRow: { flexDirection: 'row', gap: 10 },
  macroField: { flex: 1 },
  macroFieldLabel: { color: '#666', fontSize: 12, marginBottom: 6 },
  macroInput: { paddingHorizontal: 12 },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    marginBottom: 4,
  },
  dateInfoText: { color: '#555', fontSize: 13 },
  saveBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
