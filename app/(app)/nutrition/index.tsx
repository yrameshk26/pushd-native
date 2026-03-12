import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchNutritionGoals,
  fetchFoodLogs,
  fetchWaterLogs,
  logWater,
  deleteFood,
  deleteWater,
  fetchCalorieBurn,
} from '../../../src/api/nutrition';
import { CalorieRing } from '../../../src/components/CalorieRing';
import { MacroBar } from '../../../src/components/MacroBar';
import { FoodLog, MealType, NutritionGoals } from '../../../src/types';

const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: 'BREAKFAST', label: 'Breakfast', icon: 'sunny-outline' },
  { key: 'LUNCH', label: 'Lunch', icon: 'restaurant-outline' },
  { key: 'DINNER', label: 'Dinner', icon: 'moon-outline' },
  { key: 'SNACK', label: 'Snacks', icon: 'cafe-outline' },
];

const DEFAULT_GOALS: NutritionGoals = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
  water: 2500,
};

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (formatDate(date) === formatDate(today)) return 'Today';
  if (formatDate(date) === formatDate(yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NutritionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateStr = formatDate(selectedDate);

  const goalsQuery = useQuery({
    queryKey: ['nutrition-goals'],
    queryFn: fetchNutritionGoals,
  });

  const foodQuery = useQuery({
    queryKey: ['food-logs', dateStr],
    queryFn: () => fetchFoodLogs(dateStr),
  });

  const waterQuery = useQuery({
    queryKey: ['water-logs', dateStr],
    queryFn: () => fetchWaterLogs(dateStr),
  });

  const calorieBurnQuery = useQuery({
    queryKey: ['calorie-burn', dateStr],
    queryFn: () => fetchCalorieBurn(dateStr),
  });

  const logWaterMutation = useMutation({
    mutationFn: (amountMl: number) => logWater(amountMl, dateStr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-logs', dateStr] });
    },
  });

  const deleteFoodMutation = useMutation({
    mutationFn: deleteFood,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs', dateStr] });
    },
  });

  const deleteWaterMutation = useMutation({
    mutationFn: deleteWater,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-logs', dateStr] });
    },
  });

  const goals = goalsQuery.data ?? DEFAULT_GOALS;
  const caloriesBurned = calorieBurnQuery.data?.totalBurned ?? 0;
  const summary = foodQuery.data?.summary ?? {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalWater: 0,
  };
  const foodLogs = foodQuery.data?.logs ?? [];
  const waterLogs = waterQuery.data?.logs ?? [];
  const totalWaterMl = waterQuery.data?.totalMl ?? 0;

  const navigateDay = useCallback((delta: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta);
      return next;
    });
  }, []);

  const handleDeleteFood = useCallback((id: string, name: string) => {
    Alert.alert('Delete Entry', `Remove "${name}" from your log?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteFoodMutation.mutate(id),
      },
    ]);
  }, [deleteFoodMutation]);

  const handleDeleteWater = useCallback((id: string) => {
    Alert.alert('Remove Water Entry', 'Remove this water log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteWaterMutation.mutate(id),
      },
    ]);
  }, [deleteWaterMutation]);

  const isLoading = goalsQuery.isLoading || foodQuery.isLoading;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Nutrition</Text>
        <TouchableOpacity
          style={styles.goalsBtn}
          onPress={() => router.push('/(app)/nutrition/goals')}
        >
          <Ionicons name="settings-outline" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Date Selector */}
      <View style={styles.datePicker}>
        <TouchableOpacity onPress={() => navigateDay(-1)} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={20} color="#888" />
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{getDateLabel(selectedDate)}</Text>
        <TouchableOpacity
          onPress={() => navigateDay(1)}
          style={styles.dateArrow}
          disabled={formatDate(selectedDate) === formatDate(new Date())}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={formatDate(selectedDate) === formatDate(new Date()) ? '#333' : '#888'}
          />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Calorie Ring */}
          <View style={styles.card}>
            <CalorieRing consumed={summary.totalCalories} goal={goals.calories} />
          </View>

          {/* Calorie Burn */}
          {caloriesBurned > 0 && (
            <View style={styles.burnCard}>
              <View style={styles.burnLeft}>
                <Ionicons name="flame-outline" size={20} color="#F97316" />
                <View>
                  <Text style={styles.burnLabel}>Burned Today</Text>
                  <Text style={styles.burnValue}>{Math.round(caloriesBurned)} kcal</Text>
                </View>
              </View>
              <View style={styles.burnRight}>
                <Text style={styles.burnNetLabel}>Net</Text>
                <Text style={[
                  styles.burnNetValue,
                  summary.totalCalories - caloriesBurned < 0 && styles.burnNetNegative,
                ]}>
                  {Math.round(summary.totalCalories - caloriesBurned)} kcal
                </Text>
              </View>
            </View>
          )}

          {/* Quick Links */}
          <View style={styles.quickLinksRow}>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => router.push('/(app)/nutrition/supplements' as any)}
            >
              <Ionicons name="flask-outline" size={22} color="#6C63FF" />
              <Text style={styles.quickLinkText}>Supplements</Text>
              <Ionicons name="chevron-forward" size={14} color="#555" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => router.push('/(app)/nutrition/templates' as any)}
            >
              <Ionicons name="bookmark-outline" size={22} color="#6C63FF" />
              <Text style={styles.quickLinkText}>Templates</Text>
              <Ionicons name="chevron-forward" size={14} color="#555" />
            </TouchableOpacity>
          </View>

          {/* Macro Bars */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Macros</Text>
            <MacroBar
              label="Protein"
              current={summary.totalProtein}
              goal={goals.protein}
              color="#3B82F6"
            />
            <MacroBar
              label="Carbs"
              current={summary.totalCarbs}
              goal={goals.carbs}
              color="#F97316"
            />
            <MacroBar
              label="Fat"
              current={summary.totalFat}
              goal={goals.fat}
              color="#EAB308"
            />
          </View>

          {/* Water Tracker */}
          <View style={styles.card}>
            <View style={styles.waterHeader}>
              <View>
                <Text style={styles.sectionTitle}>Water</Text>
                <Text style={styles.waterAmount}>
                  <Text style={styles.waterCurrent}>{totalWaterMl}</Text>
                  <Text style={styles.waterGoal}> / {goals.water} ml</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.waterAddBtn}
                onPress={() => router.push('/(app)/nutrition/water')}
              >
                <Ionicons name="water-outline" size={18} color="#6C63FF" />
                <Text style={styles.waterAddText}>Details</Text>
              </TouchableOpacity>
            </View>

            {/* Water progress bar */}
            <View style={styles.waterTrack}>
              <View
                style={[
                  styles.waterFill,
                  {
                    width: `${Math.min((totalWaterMl / goals.water) * 100, 100)}%`,
                  },
                ]}
              />
            </View>

            {/* Quick add water */}
            <View style={styles.waterQuickRow}>
              {[250, 500].map((ml) => (
                <TouchableOpacity
                  key={ml}
                  style={styles.waterQuick}
                  onPress={() => logWaterMutation.mutate(ml)}
                  disabled={logWaterMutation.isPending}
                >
                  <Ionicons name="add" size={14} color="#6C63FF" />
                  <Text style={styles.waterQuickText}>{ml}ml</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Meal Sections */}
          {MEAL_TYPES.map(({ key, label, icon }) => {
            const logs = foodLogs.filter((l) => l.mealType === key);
            const mealCalories = logs.reduce((sum, l) => sum + l.calories, 0);

            return (
              <View key={key} style={styles.card}>
                <View style={styles.mealHeader}>
                  <View style={styles.mealTitleRow}>
                    <Ionicons name={icon as any} size={18} color="#6C63FF" />
                    <Text style={styles.mealTitle}>{label}</Text>
                    {mealCalories > 0 && (
                      <Text style={styles.mealCalories}>{Math.round(mealCalories)} kcal</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.addFoodBtn}
                    onPress={() =>
                      router.push(
                        `/(app)/nutrition/log-food?mealType=${key}&date=${dateStr}` as any
                      )
                    }
                  >
                    <Ionicons name="add" size={18} color="#6C63FF" />
                    <Text style={styles.addFoodText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {logs.length === 0 ? (
                  <Text style={styles.emptyMeal}>No food logged</Text>
                ) : (
                  logs.map((log) => (
                    <FoodLogRow
                      key={log.id}
                      log={log}
                      onDelete={() => handleDeleteFood(log.id, log.name)}
                    />
                  ))
                )}
              </View>
            );
          })}

          {/* Goals Link */}
          <TouchableOpacity
            style={styles.goalsLink}
            onPress={() => router.push('/(app)/nutrition/goals')}
          >
            <Ionicons name="flag-outline" size={18} color="#6C63FF" />
            <Text style={styles.goalsLinkText}>Edit Nutrition Goals</Text>
            <Ionicons name="chevron-forward" size={16} color="#555" />
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push(`/(app)/nutrition/log-food?date=${dateStr}` as any)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function FoodLogRow({
  log,
  onDelete,
}: {
  log: FoodLog;
  onDelete: () => void;
}) {
  return (
    <View style={styles.foodRow}>
      <View style={styles.foodInfo}>
        <Text style={styles.foodName}>{log.name}</Text>
        <Text style={styles.foodMacros}>
          {Math.round(log.calories)} kcal · P{Math.round(log.protein)}g · C{Math.round(log.carbs)}g · F{Math.round(log.fat)}g
        </Text>
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={18} color="#555" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff' },
  goalsBtn: { padding: 4 },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  dateArrow: { padding: 6 },
  dateLabel: { color: '#fff', fontSize: 16, fontWeight: '600', minWidth: 90, textAlign: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  sectionTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  // Water
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  waterAmount: { marginTop: 4 },
  waterCurrent: { color: '#3B82F6', fontSize: 22, fontWeight: '700' },
  waterGoal: { color: '#555', fontSize: 14 },
  waterAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6C63FF22',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  waterAddText: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },
  waterTrack: {
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  waterFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  waterQuickRow: { flexDirection: 'row', gap: 8 },
  waterQuick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#6C63FF55',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  waterQuickText: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },
  // Meals
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  mealCalories: { color: '#888', fontSize: 13, marginLeft: 4 },
  addFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6C63FF22',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addFoodText: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },
  emptyMeal: { color: '#444', fontSize: 13, fontStyle: 'italic' },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  foodInfo: { flex: 1 },
  foodName: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  foodMacros: { color: '#666', fontSize: 12 },
  goalsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 12,
  },
  goalsLinkText: { flex: 1, color: '#6C63FF', fontSize: 15, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  // Calorie burn
  burnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F9731633',
  },
  burnLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  burnLabel: { color: '#888', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  burnValue: { color: '#F97316', fontSize: 18, fontWeight: '700', marginTop: 2 },
  burnRight: { alignItems: 'flex-end' },
  burnNetLabel: { color: '#888', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  burnNetValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 2 },
  burnNetNegative: { color: '#3B82F6' },
  // Quick links
  quickLinksRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  quickLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  quickLinkText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
});
