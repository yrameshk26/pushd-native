import { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMealPlan, logMealFromPlan, deleteMealPlan } from '../../../src/api/nutrition';
import { MealPlanDay, MealPlanMeal } from '../../../src/types';

const MEAL_TYPE_LABEL: Record<string, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
};

const MACRO_CHIP_COLORS: Record<string, string> = {
  protein: '#4ade80',
  carbs: '#fb923c',
  fat: '#facc15',
};

export default function MealPlanDetailScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const planQuery = useQuery({
    queryKey: ['meal-plan', planId],
    queryFn: () => fetchMealPlan(planId),
    enabled: Boolean(planId),
  });

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const logMealMutation = useMutation({
    mutationFn: ({ mealId }: { mealId: string }) =>
      logMealFromPlan(planId, mealId),
    onSuccess: () => {
      showAlert('Logged', "Meal added to today's food log.");
    },
    onError: () => {
      showAlert('Error', 'Failed to log meal. Please try again.');
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: () => deleteMealPlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      router.back();
    },
    onError: () => {
      showAlert('Error', 'Failed to delete plan. Please try again.');
    },
  });

  const handleLogMeal = useCallback(
    (meal: MealPlanMeal) => {
      if (Platform.OS === 'web') {
        if (window.confirm(`Log "${meal.name}" (${meal.calories} kcal) to today's food diary?`)) {
          logMealMutation.mutate({ mealId: meal.id });
        }
        return;
      }
      Alert.alert(
        'Log Meal',
        `Log "${meal.name}" (${meal.calories} kcal) to today's food diary?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log', onPress: () => logMealMutation.mutate({ mealId: meal.id }) },
        ]
      );
    },
    [logMealMutation]
  );

  const handleDeletePlan = useCallback(() => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${planQuery.data?.name}"? This cannot be undone.`)) {
        deletePlanMutation.mutate();
      }
      return;
    }
    Alert.alert(
      'Delete Plan',
      `Delete "${planQuery.data?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePlanMutation.mutate() },
      ]
    );
  }, [planQuery.data?.name, deletePlanMutation]);

  const handleViewGroceryList = useCallback(() => {
    router.push(`/(screens)/meals/grocery-list?planId=${planId}` as any);
  }, [router, planId]);

  if (planQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} title="Meal Plan" />
        <ActivityIndicator color="#3B82F6" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (planQuery.isError || !planQuery.data) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} title="Meal Plan" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#718FAF" />
          <Text style={styles.errorText}>Failed to load meal plan.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => planQuery.refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const plan = planQuery.data;
  const totalMacros = plan.days.reduce(
    (acc, day) => {
      day.meals.forEach((meal) => {
        acc.calories += meal.calories;
        acc.protein += meal.protein;
        acc.carbs += meal.carbs;
        acc.fat += meal.fat;
      });
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const avgDailyCalories =
    plan.days.length > 0 ? Math.round(totalMacros.calories / plan.days.length) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        onBack={() => router.back()}
        title={plan.name}
        rightAction={
          <TouchableOpacity style={styles.groceryBtn} onPress={handleViewGroceryList}>
            <Ionicons name="cart-outline" size={16} color="#3B82F6" />
            <Text style={styles.groceryBtnText}>Grocery List</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Summary Card */}
        <View style={styles.summaryCard}>
          {plan.description ? (
            <Text style={styles.planDescription}>{plan.description}</Text>
          ) : null}

          <View style={styles.summaryRow}>
            <SummaryChip
              icon="calendar-outline"
              label={`${plan.days.length} day${plan.days.length !== 1 ? 's' : ''}`}
            />
            <SummaryChip
              icon="flame-outline"
              label={`~${ (plan as any).targetCalories ?? plan.calorieTarget > 0 ? (plan as any).targetCalories ?? plan.calorieTarget : avgDailyCalories} kcal/day`}
              accent
            />
          </View>

          <View style={styles.macroSummaryRow}>
            <MacroSummaryItem
              label="Protein"
              value={`${Math.round(totalMacros.protein / Math.max(plan.days.length, 1))}g`}
              color={MACRO_CHIP_COLORS.protein}
            />
            <MacroSummaryItem
              label="Carbs"
              value={`${Math.round(totalMacros.carbs / Math.max(plan.days.length, 1))}g`}
              color={MACRO_CHIP_COLORS.carbs}
            />
            <MacroSummaryItem
              label="Fat"
              value={`${Math.round(totalMacros.fat / Math.max(plan.days.length, 1))}g`}
              color={MACRO_CHIP_COLORS.fat}
            />
          </View>
        </View>

        {/* Day-by-day Schedule */}
        {plan.days.length === 0 ? (
          <View style={styles.emptyDays}>
            <Ionicons name="calendar-outline" size={36} color="#162540" />
            <Text style={styles.emptyText}>No days scheduled yet</Text>
          </View>
        ) : (
          plan.days.map((day) => (
            <DaySection
              key={day.dayNumber}
              day={day}
              onLogMeal={handleLogMeal}
              loggingMealId={
                logMealMutation.isPending
                  ? (logMealMutation.variables as { mealId: string })?.mealId
                  : null
              }
            />
          ))
        )}

        {/* Delete Plan */}
        <TouchableOpacity
          style={styles.deletePlanBtn}
          onPress={handleDeletePlan}
          disabled={deletePlanMutation.isPending}
        >
          {deletePlanMutation.isPending ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
              <Text style={styles.deletePlanText}>Delete Plan</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Header({
  onBack,
  title,
  rightAction,
}: {
  onBack: () => void;
  title: string;
  rightAction?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.heading} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerRight}>{rightAction ?? <View style={{ width: 40 }} />}</View>
    </View>
  );
}

function SummaryChip({
  icon,
  label,
  accent,
}: {
  icon: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.summaryChip, accent && styles.summaryChipAccent]}>
      <Ionicons
        name={icon as any}
        size={14}
        color={accent ? '#3B82F6' : '#718FAF'}
      />
      <Text style={[styles.summaryChipText, accent && styles.summaryChipTextAccent]}>
        {label}
      </Text>
    </View>
  );
}

function MacroSummaryItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.macroSummaryItem}>
      <Text style={[styles.macroSummaryValue, { color }]}>{value}</Text>
      <Text style={styles.macroSummaryLabel}>{label}/day</Text>
    </View>
  );
}

function DaySection({
  day,
  onLogMeal,
  loggingMealId,
}: {
  day: MealPlanDay;
  onLogMeal: (meal: MealPlanMeal) => void;
  loggingMealId: string | null;
}) {
  const dayCalories = day.meals.reduce((sum, m) => sum + m.calories, 0);

  return (
    <View style={styles.daySection}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayLabel}>{day.label ?? `Day ${day.dayNumber}`}</Text>
        <Text style={styles.dayCalories}>{dayCalories} kcal</Text>
      </View>

      {day.meals.length === 0 ? (
        <Text style={styles.noMealsText}>No meals for this day</Text>
      ) : (
        day.meals.map((meal) => (
          <MealRow
            key={meal.id}
            meal={meal}
            onLog={() => onLogMeal(meal)}
            isLogging={loggingMealId === meal.id}
          />
        ))
      )}
    </View>
  );
}

function MealRow({
  meal,
  onLog,
  isLogging,
}: {
  meal: MealPlanMeal;
  onLog: () => void;
  isLogging: boolean;
}) {
  return (
    <View style={styles.mealRow}>
      <View style={styles.mealRowLeft}>
        <View style={styles.mealTypeTag}>
          <Text style={styles.mealTypeText}>
            {MEAL_TYPE_LABEL[(meal as any).type ?? meal.mealType] ?? (meal as any).type ?? meal.mealType}
          </Text>
        </View>
        <Text style={styles.mealRowName}>{meal.name}</Text>
        {meal.description ? (
          <Text style={styles.mealRowDesc} numberOfLines={1}>
            {meal.description}
          </Text>
        ) : null}
        <View style={styles.mealMacroChips}>
          <Text style={styles.mealCalChip}>{meal.calories} kcal</Text>
          <MacroChip label={`P ${meal.protein}g`} color={MACRO_CHIP_COLORS.protein} />
          <MacroChip label={`C ${meal.carbs}g`} color={MACRO_CHIP_COLORS.carbs} />
          <MacroChip label={`F ${meal.fat}g`} color={MACRO_CHIP_COLORS.fat} />
        </View>
      </View>
      <TouchableOpacity
        style={[styles.logBtn, isLogging && styles.logBtnDisabled]}
        onPress={onLog}
        disabled={isLogging}
      >
        {isLogging ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.logBtnText}>Log</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function MacroChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.macroChip, { borderColor: color + '40' }]}>
      <Text style={[styles.macroChipText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  heading: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'BarlowCondensed-Bold',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRight: { minWidth: 40, alignItems: 'flex-end' },
  groceryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3B82F622',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  groceryBtnText: { color: '#3B82F6', fontSize: 12, fontWeight: '600' },
  content: { paddingHorizontal: 16, paddingTop: 8 },

  // Summary card
  summaryCard: {
    backgroundColor: '#0B1326',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#162540',
    gap: 12,
  },
  planDescription: { color: '#718FAF', fontSize: 14, lineHeight: 20 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0B1326',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#162540',
  },
  summaryChipAccent: { borderColor: '#3B82F644', backgroundColor: '#3B82F611' },
  summaryChipText: { color: '#718FAF', fontSize: 13, fontWeight: '500' },
  summaryChipTextAccent: { color: '#3B82F6', fontWeight: '600' },
  macroSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#162540',
  },
  macroSummaryItem: { alignItems: 'center', gap: 2 },
  macroSummaryValue: { fontSize: 16, fontWeight: '700' },
  macroSummaryLabel: { color: '#718FAF', fontSize: 11 },

  // Day section
  daySection: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#162540',
    borderRadius: 14,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#060C1B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#162540',
  },
  dayLabel: { color: '#fff', fontSize: 14, fontWeight: '700',
    fontFamily: 'DMSans-Bold' },
  dayCalories: { color: '#3B82F6', fontSize: 13, fontWeight: '600' },
  noMealsText: { color: '#718FAF', fontSize: 13, padding: 14 },

  // Meal row
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1326',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#162540',
  },
  mealRowLeft: { flex: 1, gap: 4 },
  mealTypeTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#3B82F622',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mealTypeText: { color: '#3B82F6', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  mealRowName: { color: '#fff', fontSize: 15, fontWeight: '600',
    fontFamily: 'DMSans-SemiBold' },
  mealRowDesc: { color: '#718FAF', fontSize: 12 },
  mealMacroChips: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  mealCalChip: { color: '#3B82F6', fontSize: 12, fontWeight: '700' },
  macroChip: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  macroChipText: { fontSize: 11, fontWeight: '600' },
  logBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 10,
    minWidth: 52,
    alignItems: 'center',
  },
  logBtnDisabled: { opacity: 0.5 },
  logBtnText: { color: '#fff', fontSize: 13, fontWeight: '700',
    fontFamily: 'DMSans-Bold' },

  // Error / empty
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: { color: '#718FAF', fontSize: 15, textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyDays: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: '#718FAF', fontSize: 15 },

  // Delete
  deletePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ef444430',
    backgroundColor: '#ef444410',
  },
  deletePlanText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
