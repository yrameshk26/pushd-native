import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchMeals, deleteMeal, fetchMealPlans } from '../../../src/api/nutrition';
import { SavedMeal, MealPlanListItem } from '../../../src/types';

export default function MealsLibraryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const mealPlansQuery = useQuery({
    queryKey: ['meal-plans'],
    queryFn: fetchMealPlans,
  });

  const mealsQuery = useQuery({
    queryKey: ['saved-meals'],
    queryFn: fetchMeals,
  });

  const deleteMealMutation = useMutation({
    mutationFn: deleteMeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-meals'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to delete meal. Please try again.');
    },
  });

  const handleDelete = useCallback(
    (id: string, name: string) => {
      Alert.alert(
        'Delete Meal',
        `Delete "${name}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteMealMutation.mutate(id),
          },
        ]
      );
    },
    [deleteMealMutation]
  );

  const allMeals = mealsQuery.data?.meals ?? [];
  const filteredMeals =
    searchQuery.trim().length === 0
      ? allMeals
      : allMeals.filter((m) =>
          m.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          (m.description ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase())
        );

  const isLoading = mealsQuery.isLoading;
  const isError = mealsQuery.isError;

  const plans = mealPlansQuery.data?.plans ?? [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>Meals</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#555" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search saved meals..."
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Meal Plans Section ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meal Plans</Text>
          <TouchableOpacity
            style={styles.createPlanBtn}
            onPress={() =>
              Alert.alert('Coming Soon', 'Meal plan creation will be available soon.')
            }
          >
            <Ionicons name="add" size={14} color="#6C63FF" />
            <Text style={styles.createPlanBtnText}>Create Plan</Text>
          </TouchableOpacity>
        </View>

        {mealPlansQuery.isLoading ? (
          <ActivityIndicator color="#6C63FF" style={{ marginVertical: 20 }} />
        ) : mealPlansQuery.isError ? (
          <View style={styles.sectionError}>
            <Text style={styles.sectionErrorText}>Failed to load meal plans.</Text>
            <TouchableOpacity onPress={() => mealPlansQuery.refetch()}>
              <Text style={styles.sectionRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.emptyPlans}>
            <Ionicons name="calendar-outline" size={32} color="#333" />
            <Text style={styles.emptyPlansText}>No meal plans yet</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.plansCarousel}
          >
            {plans.map((plan) => (
              <MealPlanCard
                key={plan.id}
                plan={plan}
                onPress={() => router.push(`/(app)/meals/${plan.id}` as any)}
              />
            ))}
          </ScrollView>
        )}

        {/* ── Saved Meals Section ── */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Saved Meals</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#6C63FF" style={{ marginVertical: 20 }} />
        ) : isError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load meals.</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => mealsQuery.refetch()}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredMeals.length === 0 && searchQuery.trim().length > 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="search-outline" size={36} color="#333" />
            <Text style={styles.emptyText}>No meals match "{searchQuery}"</Text>
          </View>
        ) : filteredMeals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="restaurant-outline" size={40} color="#333" />
            <Text style={styles.emptyText}>No saved meals yet</Text>
            <Text style={styles.emptySubText}>
              Create your first meal to build your personal food library
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.countLabel}>
              {filteredMeals.length} meal{filteredMeals.length !== 1 ? 's' : ''}
            </Text>
            {filteredMeals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onDelete={() => handleDelete(meal.id, meal.name)}
                isDeleting={
                  deleteMealMutation.isPending &&
                  deleteMealMutation.variables === meal.id
                }
              />
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/meals/new' as any)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function MealPlanCard({
  plan,
  onPress,
}: {
  plan: MealPlanListItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.planCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.planCardTop}>
        <View style={styles.planIconWrap}>
          <Ionicons name="calendar-outline" size={18} color="#6C63FF" />
        </View>
        <Ionicons name="chevron-forward" size={16} color="#444" />
      </View>
      <Text style={styles.planCardName} numberOfLines={2}>
        {plan.name}
      </Text>
      {plan.description ? (
        <Text style={styles.planCardDesc} numberOfLines={1}>
          {plan.description}
        </Text>
      ) : null}
      <View style={styles.planCardMeta}>
        <View style={styles.planMetaChip}>
          <Ionicons name="calendar-outline" size={11} color="#888" />
          <Text style={styles.planMetaText}>
            {plan.totalDays} day{plan.totalDays !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={[styles.planMetaChip, styles.planMetaChipAccent]}>
          <Ionicons name="flame-outline" size={11} color="#6C63FF" />
          <Text style={[styles.planMetaText, { color: '#6C63FF' }]}>
            {plan.calorieTarget} kcal
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MealCard({
  meal,
  onDelete,
  isDeleting,
}: {
  meal: SavedMeal;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const totalCalories = (meal.ingredients ?? []).reduce(
    (sum, ing) => sum + (ing.calories ?? 0),
    0
  );
  const totalProtein = (meal.ingredients ?? []).reduce(
    (sum, ing) => sum + (ing.protein ?? 0),
    0
  );
  const totalCarbs = (meal.ingredients ?? []).reduce(
    (sum, ing) => sum + (ing.carbs ?? 0),
    0
  );
  const totalFat = (meal.ingredients ?? []).reduce(
    (sum, ing) => sum + (ing.fat ?? 0),
    0
  );

  return (
    <View style={styles.mealCard}>
      <View style={styles.mealCardContent}>
        <View style={styles.mealInfo}>
          <Text style={styles.mealName}>{meal.name}</Text>
          {meal.description ? (
            <Text style={styles.mealDesc} numberOfLines={1}>
              {meal.description}
            </Text>
          ) : null}
          <View style={styles.mealMacrosRow}>
            <Text style={styles.mealCalories}>{Math.round(totalCalories)} kcal</Text>
            {totalProtein > 0 && (
              <Text style={styles.macroText}>P {Math.round(totalProtein)}g</Text>
            )}
            {totalCarbs > 0 && (
              <Text style={styles.macroText}>C {Math.round(totalCarbs)}g</Text>
            )}
            {totalFat > 0 && (
              <Text style={styles.macroText}>F {Math.round(totalFat)}g</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={onDelete}
          disabled={isDeleting}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.deleteBtn}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#555" />
          ) : (
            <Ionicons name="trash-outline" size={18} color="#555" />
          )}
        </TouchableOpacity>
      </View>

      {/* Ingredients */}
      {(meal.ingredients ?? []).length > 0 && (
        <View style={styles.ingredientsList}>
          {(meal.ingredients ?? []).slice(0, 3).map((ing, idx) => (
            <View key={idx} style={styles.ingredientRow}>
              <Ionicons name="ellipse" size={5} color="#444" />
              <Text style={styles.ingredientText}>
                {ing.name}
                {ing.amount ? ` — ${ing.amount}${ing.unit ? ' ' + ing.unit : ''}` : ''}
              </Text>
            </View>
          ))}
          {(meal.ingredients ?? []).length > 3 && (
            <Text style={styles.moreText}>
              +{(meal.ingredients ?? []).length - 3} more
            </Text>
          )}
        </View>
      )}
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
  heading: { fontSize: 20, fontWeight: '700', color: '#fff' },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  createPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6C63FF22',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  createPlanBtnText: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },

  // Section error
  sectionError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  sectionErrorText: { color: '#888', fontSize: 13 },
  sectionRetryText: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },

  // Empty plans
  emptyPlans: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  emptyPlansText: { color: '#555', fontSize: 14 },

  // Plans carousel
  plansCarousel: {
    paddingRight: 16,
    gap: 12,
  },

  // Plan card
  planCard: {
    width: 168,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 8,
  },
  planCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#6C63FF22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCardName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  planCardDesc: {
    color: '#666',
    fontSize: 12,
  },
  planCardMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  planMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#111',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  planMetaChipAccent: { borderColor: '#6C63FF33', backgroundColor: '#6C63FF11' },
  planMetaText: { color: '#888', fontSize: 11, fontWeight: '500' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 12,
  },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  countLabel: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: { color: '#555', fontSize: 16, fontWeight: '600' },
  emptySubText: {
    color: '#444',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorText: { color: '#888', fontSize: 15 },
  retryBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  mealCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  mealCardContent: { flexDirection: 'row', alignItems: 'flex-start' },
  mealInfo: { flex: 1 },
  mealName: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 3 },
  mealDesc: { color: '#666', fontSize: 13, marginBottom: 6 },
  mealMacrosRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealCalories: { color: '#6C63FF', fontSize: 14, fontWeight: '700' },
  macroText: { color: '#555', fontSize: 12 },
  deleteBtn: { padding: 4 },
  ingredientsList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    gap: 5,
  },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ingredientText: { color: '#666', fontSize: 12, flex: 1 },
  moreText: { color: '#555', fontSize: 12, fontStyle: 'italic', marginTop: 2 },
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
});
