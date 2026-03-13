import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  Pressable,
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
  fetchSupplements,
  deleteSupplementLog,
  markSupplementTaken,
  fetchTemplates,
  logTemplate as apiLogTemplate,
} from '../../../src/api/nutrition';
import { CalorieRing } from '../../../src/components/CalorieRing';
import { MacroBar } from '../../../src/components/MacroBar';
import {
  FoodLog,
  MealType,
  NutritionGoals,
  SupplementLog,
  MealTemplate,
} from '../../../src/types';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NutritionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [fabOpen, setFabOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const dateStr = formatDate(selectedDate);
  const isToday = dateStr === formatDate(new Date());

  // ── Queries ─────────────────────────────────────────────────────────────────

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

  const supplementsQuery = useQuery({
    queryKey: ['supplements', dateStr],
    queryFn: () => fetchSupplements(dateStr),
  });

  const templatesQuery = useQuery({
    queryKey: ['meal-templates'],
    queryFn: fetchTemplates,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

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

  const deleteSupMutation = useMutation({
    mutationFn: deleteSupplementLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplements', dateStr] });
    },
  });

  const toggleSupMutation = useMutation({
    mutationFn: markSupplementTaken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplements', dateStr] });
    },
  });

  const logTemplateMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => apiLogTemplate(id, dateStr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs', dateStr] });
    },
  });

  // ── Derived data ─────────────────────────────────────────────────────────────

  const goals = goalsQuery.data ?? DEFAULT_GOALS;
  const caloriesBurned = calorieBurnQuery.data?.totalBurned ?? 0;
  const calorieBurnEntries = calorieBurnQuery.data?.entries ?? [];
  const summary = foodQuery.data?.summary ?? {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalWater: 0,
  };
  const foodLogs = foodQuery.data?.logs ?? [];
  const totalWaterMl = waterQuery.data?.totalMl ?? 0;
  const supplementLogs = supplementsQuery.data?.logs ?? [];
  const templates = templatesQuery.data?.templates ?? [];

  const netCalories = summary.totalCalories - caloriesBurned;
  const remainingCalories = goals.calories - summary.totalCalories;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const navigateDay = useCallback((delta: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta);
      return next;
    });
  }, []);

  const handleDeleteFood = useCallback(
    (id: string, name: string) => {
      Alert.alert('Delete Entry', `Remove "${name}" from your log?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteFoodMutation.mutate(id),
        },
      ]);
    },
    [deleteFoodMutation]
  );

  const handleDeleteSupplement = useCallback(
    (id: string, name: string) => {
      Alert.alert('Remove Supplement', `Remove "${name}" from today's log?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteSupMutation.mutate(id),
        },
      ]);
    },
    [deleteSupMutation]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['food-logs', dateStr] }),
      queryClient.invalidateQueries({ queryKey: ['water-logs', dateStr] }),
      queryClient.invalidateQueries({ queryKey: ['calorie-burn', dateStr] }),
      queryClient.invalidateQueries({ queryKey: ['supplements', dateStr] }),
      queryClient.invalidateQueries({ queryKey: ['nutrition-goals'] }),
      queryClient.invalidateQueries({ queryKey: ['meal-templates'] }),
    ]);
    setRefreshing(false);
  }, [queryClient, dateStr]);

  const isLoading = goalsQuery.isLoading || foodQuery.isLoading;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Nutrition</Text>
        <TouchableOpacity
          style={styles.goalsBtn}
          onPress={() => router.push('/(screens)/nutrition/goals')}
        >
          <Ionicons name="settings-outline" size={20} color="#718FAF" />
        </TouchableOpacity>
      </View>

      {/* Date Navigator */}
      <View style={styles.datePicker}>
        <TouchableOpacity onPress={() => navigateDay(-1)} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={20} color="#718FAF" />
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{getDateLabel(selectedDate)}</Text>
        <TouchableOpacity
          onPress={() => navigateDay(1)}
          style={styles.dateArrow}
          disabled={isToday}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isToday ? '#162540' : '#718FAF'}
          />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#3B82F6" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
            />
          }
        >
          {/* ── Calorie Summary Card ─────────────────────────────────────── */}
          <View style={styles.card}>
            <CalorieRing consumed={summary.totalCalories} goal={goals.calories} />

            {/* Burned / Net / Remaining row */}
            <View style={styles.calorieSummaryRow}>
              <View style={styles.calorieSummaryItem}>
                <Ionicons name="flame-outline" size={16} color="#F97316" />
                <Text style={styles.calorieSummaryValue}>
                  {Math.round(caloriesBurned)}
                </Text>
                <Text style={styles.calorieSummaryLabel}>Burned</Text>
              </View>

              <View style={styles.calorieSummarySep} />

              <View style={styles.calorieSummaryItem}>
                <Ionicons name="analytics-outline" size={16} color="#3B82F6" />
                <Text
                  style={[
                    styles.calorieSummaryValue,
                    netCalories < 0 && styles.netNegative,
                  ]}
                >
                  {Math.round(netCalories)}
                </Text>
                <Text style={styles.calorieSummaryLabel}>Net</Text>
              </View>

              <View style={styles.calorieSummarySep} />

              <View style={styles.calorieSummaryItem}>
                <Ionicons
                  name="flag-outline"
                  size={16}
                  color={remainingCalories < 0 ? '#FF4B4B' : '#22C55E'}
                />
                <Text
                  style={[
                    styles.calorieSummaryValue,
                    remainingCalories < 0 && styles.overBudget,
                  ]}
                >
                  {Math.abs(Math.round(remainingCalories))}
                </Text>
                <Text style={styles.calorieSummaryLabel}>
                  {remainingCalories < 0 ? 'Over' : 'Remaining'}
                </Text>
              </View>
            </View>

            {/* Calorie burn breakdown (workouts) */}
            {calorieBurnEntries.length > 0 && (
              <View style={styles.burnBreakdown}>
                {calorieBurnEntries.map((entry) => (
                  <View key={entry.id} style={styles.burnEntry}>
                    <Ionicons name="barbell-outline" size={13} color="#F97316" />
                    <Text style={styles.burnEntryName} numberOfLines={1}>
                      {entry.title}
                    </Text>
                    {entry.duration != null && (
                      <Text style={styles.burnEntryDuration}>
                        {Math.round(entry.duration / 60)}m
                      </Text>
                    )}
                    <Text style={styles.burnEntryKcal}>
                      -{Math.round(entry.estimated)} kcal
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Macro Bars ───────────────────────────────────────────────── */}
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

          {/* ── Water Tracker ────────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/(screens)/nutrition/water' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.waterHeader}>
              <View>
                <Text style={styles.sectionTitle}>Water</Text>
                <Text style={styles.waterAmountText}>
                  <Text style={styles.waterCurrent}>{totalWaterMl}</Text>
                  <Text style={styles.waterGoal}> / {goals.water} ml</Text>
                </Text>
              </View>
              <View style={styles.waterDetailsChip}>
                <Ionicons name="water-outline" size={16} color="#3B82F6" />
                <Text style={styles.waterDetailsText}>Details</Text>
                <Ionicons name="chevron-forward" size={13} color="#718FAF" />
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.waterTrack}>
              <View
                style={[
                  styles.waterFill,
                  { width: `${Math.min((totalWaterMl / goals.water) * 100, 100)}%` },
                ]}
              />
            </View>

            {/* Quick add buttons — stop tap propagation */}
            <View style={styles.waterQuickRow}>
              {[250, 500].map((ml) => (
                <TouchableOpacity
                  key={ml}
                  style={styles.waterQuick}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    logWaterMutation.mutate(ml);
                  }}
                  disabled={logWaterMutation.isPending}
                >
                  <Ionicons name="add" size={14} color="#3B82F6" />
                  <Text style={styles.waterQuickText}>+{ml}ml</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>

          {/* ── Meal Templates Quick-Log ──────────────────────────────────── */}
          {templates.length > 0 && (
            <View style={styles.card}>
              <View style={styles.templatesHeader}>
                <Text style={styles.sectionTitle}>Quick Log</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(screens)/nutrition/templates' as any)}
                >
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.templateChips}>
                {templates.slice(0, 3).map((t) => (
                  <TemplateChip
                    key={t.id}
                    template={t}
                    onLog={() => logTemplateMutation.mutate({ id: t.id })}
                    loading={logTemplateMutation.isPending}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Meal Sections ─────────────────────────────────────────────── */}
          {MEAL_TYPES.map(({ key, label, icon }) => {
            const mealLogs = foodLogs.filter((l) => l.mealType === key);
            const mealCalories = mealLogs.reduce((sum, l) => sum + l.calories, 0);

            return (
              <View key={key} style={styles.card}>
                <View style={styles.mealHeader}>
                  <View style={styles.mealTitleRow}>
                    <Ionicons name={icon as any} size={18} color="#3B82F6" />
                    <Text style={styles.mealTitle}>{label}</Text>
                    {mealCalories > 0 && (
                      <Text style={styles.mealCalories}>
                        {Math.round(mealCalories)} kcal
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.addFoodBtn}
                    onPress={() =>
                      router.push(
                        `/(screens)/nutrition/log-food?meal=${key}&date=${dateStr}` as any
                      )
                    }
                  >
                    <Ionicons name="add" size={16} color="#3B82F6" />
                    <Text style={styles.addFoodText}>Add food</Text>
                  </TouchableOpacity>
                </View>

                {mealLogs.length === 0 ? (
                  <Text style={styles.emptyMeal}>No food logged</Text>
                ) : (
                  mealLogs.map((log) => (
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

          {/* ── Supplement Tracker ───────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.supplementHeader}>
              <Text style={styles.sectionTitle}>Supplements</Text>
              <TouchableOpacity
                onPress={() => router.push('/(screens)/nutrition/supplements' as any)}
              >
                <Text style={styles.seeAllText}>Add supplement</Text>
              </TouchableOpacity>
            </View>

            {supplementLogs.length === 0 ? (
              <Text style={styles.emptyMeal}>No supplements logged today</Text>
            ) : (
              supplementLogs.map((sup) => (
                <SupplementRow
                  key={sup.id}
                  supplement={sup}
                  onToggle={() => toggleSupMutation.mutate(sup.id)}
                  onDelete={() => handleDeleteSupplement(sup.id, sup.name)}
                />
              ))
            )}
          </View>

          {/* ── Goals Link ───────────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.goalsLink}
            onPress={() => router.push('/(screens)/nutrition/goals')}
          >
            <Ionicons name="flag-outline" size={18} color="#3B82F6" />
            <Text style={styles.goalsLinkText}>Edit Nutrition Goals</Text>
            <Ionicons name="chevron-forward" size={16} color="#718FAF" />
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── FAB + Action Sheet ──────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setFabOpen(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <FabActionSheet
        visible={fabOpen}
        dateStr={dateStr}
        onClose={() => setFabOpen(false)}
        onNavigate={(path) => {
          setFabOpen(false);
          router.push(path as any);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
        <View style={styles.foodMacroRow}>
          <Ionicons name="flame-outline" size={11} color="#F97316" />
          <Text style={styles.foodCalories}>{Math.round(log.calories)} kcal</Text>
          <Text style={[styles.foodMacroChip, styles.proteinChip]}>
            P {Math.round(log.protein)}g
          </Text>
          <Text style={[styles.foodMacroChip, styles.carbsChip]}>
            C {Math.round(log.carbs)}g
          </Text>
          <Text style={[styles.foodMacroChip, styles.fatChip]}>
            F {Math.round(log.fat)}g
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.deleteBtn}
      >
        <Ionicons name="close-circle-outline" size={20} color="#718FAF" />
      </TouchableOpacity>
    </View>
  );
}

function SupplementRow({
  supplement,
  onToggle,
  onDelete,
}: {
  supplement: SupplementLog;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.supplementRow}>
      <TouchableOpacity
        onPress={onToggle}
        style={styles.supplementCheck}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons
          name={supplement.taken ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={supplement.taken ? '#22C55E' : '#718FAF'}
        />
      </TouchableOpacity>
      <View style={styles.supplementInfo}>
        <Text
          style={[
            styles.supplementName,
            supplement.taken && styles.supplementNameTaken,
          ]}
        >
          {supplement.name}
        </Text>
        {supplement.dosage ? (
          <Text style={styles.supplementDosage}>{supplement.dosage}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={16} color="#718FAF" />
      </TouchableOpacity>
    </View>
  );
}

function TemplateChip({
  template,
  onLog,
  loading,
}: {
  template: MealTemplate;
  onLog: () => void;
  loading: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.templateChip}
      onPress={onLog}
      disabled={loading}
    >
      <Text style={styles.templateChipName} numberOfLines={1}>
        {template.name}
      </Text>
      <Text style={styles.templateChipCal}>{template.calories} kcal</Text>
    </TouchableOpacity>
  );
}

function FabActionSheet({
  visible,
  dateStr,
  onClose,
  onNavigate,
}: {
  visible: boolean;
  dateStr: string;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const actions = [
    {
      label: 'Log Food',
      icon: 'fast-food-outline',
      path: `/(screens)/nutrition/log-food?date=${dateStr}`,
    },
    {
      label: 'Log Water',
      icon: 'water-outline',
      path: `/(screens)/nutrition/water`,
    },
    {
      label: 'Log Supplement',
      icon: 'flask-outline',
      path: `/(screens)/nutrition/supplements`,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.fabOverlay} onPress={onClose}>
        <View style={styles.fabSheet}>
          {actions.map((action, idx) => (
            <TouchableOpacity
              key={action.label}
              style={[
                styles.fabSheetItem,
                idx < actions.length - 1 && styles.fabSheetItemBorder,
              ]}
              onPress={() => onNavigate(action.path)}
            >
              <View style={styles.fabSheetIcon}>
                <Ionicons name={action.icon as any} size={20} color="#3B82F6" />
              </View>
              <Text style={styles.fabSheetLabel}>{action.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#718FAF" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.fabSheetCancel} onPress={onClose}>
            <Text style={styles.fabSheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  container: { flex: 1, backgroundColor: '#060C1B' },
  content: { paddingHorizontal: 16, paddingTop: 4 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  heading: { fontSize: 28, fontWeight: '800',
    fontFamily: 'BarlowCondensed-ExtraBold',
    fontFamily: 'BarlowCondensed-ExtraBold', color: '#fff' },
  goalsBtn: { padding: 4 },

  // Date navigator
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  dateArrow: { padding: 6 },
  dateLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'DMSans-SemiBold',
    minWidth: 90,
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: '#0B1326',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#162540',
  },
  sectionTitle: {
    color: '#718FAF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'BarlowCondensed-SemiBold',
    letterSpacing: 1.2,
    marginBottom: 14,
  },

  // Calorie summary row (below ring)
  calorieSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 0,
  },
  calorieSummaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  calorieSummarySep: {
    width: 1,
    height: 40,
    backgroundColor: '#162540',
  },
  calorieSummaryValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'BarlowCondensed-Bold',
  },
  calorieSummaryLabel: {
    color: '#718FAF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  netNegative: { color: '#3B82F6' },
  overBudget: { color: '#FF4B4B' },

  // Burn breakdown
  burnBreakdown: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#162540',
    gap: 6,
  },
  burnEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  burnEntryName: {
    flex: 1,
    color: '#A8BDD4',
    fontSize: 12,
  },
  burnEntryDuration: {
    color: '#718FAF',
    fontSize: 11,
  },
  burnEntryKcal: {
    color: '#F97316',
    fontSize: 12,
    fontWeight: '600',
  },

  // Water
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  waterAmountText: { marginTop: 4 },
  waterCurrent: { color: '#3B82F6', fontSize: 22, fontWeight: '700',
    fontFamily: 'BarlowCondensed-Bold' },
  waterGoal: { color: '#718FAF', fontSize: 14 },
  waterDetailsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3B82F622',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  waterDetailsText: { color: '#3B82F6', fontSize: 13, fontWeight: '600' },
  waterTrack: {
    height: 8,
    backgroundColor: '#162540',
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
    borderColor: '#3B82F655',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  waterQuickText: { color: '#3B82F6', fontSize: 13, fontWeight: '600' },

  // Meal templates
  templatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: { color: '#3B82F6', fontSize: 13, fontWeight: '600' },
  templateChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateChip: {
    backgroundColor: '#3B82F61A',
    borderWidth: 1,
    borderColor: '#3B82F644',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: '45%',
  },
  templateChipName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'DMSans-SemiBold',
  },
  templateChipCal: {
    color: '#718FAF',
    fontSize: 11,
    marginTop: 1,
  },

  // Meal sections
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealTitle: { color: '#fff', fontSize: 16, fontWeight: '700',
    fontFamily: 'DMSans-Bold' },
  mealCalories: { color: '#718FAF', fontSize: 13, marginLeft: 4 },
  addFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3B82F622',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addFoodText: { color: '#3B82F6', fontSize: 13, fontWeight: '600' },
  emptyMeal: { color: '#4A6080', fontSize: 13, fontStyle: 'italic' },

  // Food log row
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#162540',
  },
  foodInfo: { flex: 1 },
  foodName: { color: '#fff', fontSize: 14, fontWeight: '600',
    fontFamily: 'DMSans-SemiBold', marginBottom: 4 },
  foodMacroRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  foodCalories: { color: '#718FAF', fontSize: 12 },
  foodMacroChip: { fontSize: 11, fontWeight: '600' },
  proteinChip: { color: '#3B82F6' },
  carbsChip: { color: '#F97316' },
  fatChip: { color: '#EAB308' },
  deleteBtn: { padding: 4 },

  // Supplement rows
  supplementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  supplementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#162540',
    gap: 10,
  },
  supplementCheck: {},
  supplementInfo: { flex: 1 },
  supplementName: { color: '#fff', fontSize: 14, fontWeight: '600',
    fontFamily: 'DMSans-SemiBold' },
  supplementNameTaken: { color: '#718FAF', textDecorationLine: 'line-through' },
  supplementDosage: { color: '#718FAF', fontSize: 12, marginTop: 2 },

  // Goals link
  goalsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0B1326',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#162540',
    marginBottom: 12,
  },
  goalsLinkText: { flex: 1, color: '#3B82F6', fontSize: 15, fontWeight: '600' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  // FAB action sheet
  fabOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  fabSheet: {
    backgroundColor: '#0B1326',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#162540',
    overflow: 'hidden',
  },
  fabSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  fabSheetItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#162540',
  },
  fabSheetIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#3B82F622',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSheetLabel: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600',
    fontFamily: 'DMSans-SemiBold' },
  fabSheetCancel: {
    marginTop: 10,
    backgroundColor: '#0B1326',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#162540',
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 0,
  },
  fabSheetCancelText: { color: '#718FAF', fontSize: 16, fontWeight: '600' },
});
