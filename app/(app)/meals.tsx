import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api/client';

interface MealPlan {
  id: string;
  name: string;
  goal: 'DEFICIT' | 'SURPLUS' | 'MAINTAIN';
  targetCalories: number;
  createdAt: string;
  _count?: { days: number };
  totalDays?: number;
}

const GOAL_LABEL: Record<string, string> = {
  DEFICIT: 'Calorie Deficit',
  SURPLUS: 'Calorie Surplus',
  MAINTAIN: 'Maintenance',
};

const GOAL_STYLE: Record<string, { color: string; bg: string }> = {
  DEFICIT: { color: '#60a5fa', bg: 'rgba(59,130,246,0.1)' },
  SURPLUS: { color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  MAINTAIN: { color: '#fbbf24', bg: 'rgba(245,158,11,0.1)' },
};

export default function MealsScreen() {
  const { data, isLoading, isError, refetch } = useQuery<MealPlan[]>({
    queryKey: ['meal-plans'],
    queryFn: async () => {
      const { data } = await api.get('/api/meal-plans');
      // API returns { data: [...] } envelope
      const raw = data?.data ?? data?.plans ?? data ?? [];
      return Array.isArray(raw) ? raw : [];
    },
  });

  const plans = data ?? [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Meals</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => router.push('/(screens)/nutrition' as never)}
          >
            <Text style={styles.outlineBtnText}>🍽️ Log Food</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(screens)/meals/new' as never)}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>New Plan</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#3B82F6" size="large" />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Failed to load meal plans.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="restaurant-outline" size={32} color="#4A6080" />
            </View>
            <Text style={styles.emptyTitle}>No meal plans yet</Text>
            <Text style={styles.emptySub}>
              Create your first AI-generated meal plan tailored to your goals
            </Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push('/(screens)/meals/new' as never)}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.createBtnText}>Create Meal Plan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          plans.map((plan) => {
            const days = plan._count?.days ?? plan.totalDays ?? 0;
            const goalStyle = GOAL_STYLE[plan.goal] ?? GOAL_STYLE.MAINTAIN;
            const date = new Date(plan.createdAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric',
            });

            return (
              <View key={plan.id} style={styles.planCard}>
                <TouchableOpacity
                  style={styles.planCardBody}
                  onPress={() => router.push(`/(screens)/meals/${plan.id}` as never)}
                  activeOpacity={0.8}
                >
                  <View style={styles.planCardLeft}>
                    <Text style={styles.planName} numberOfLines={1}>{plan.name}</Text>
                    <View style={styles.planMeta}>
                      <View style={[styles.goalBadge, { backgroundColor: goalStyle.bg }]}>
                        <Text style={[styles.goalText, { color: goalStyle.color }]}>
                          {GOAL_LABEL[plan.goal]}
                        </Text>
                      </View>
                      <Text style={styles.planDays}>{days} days</Text>
                    </View>
                  </View>
                  <View style={styles.planCardRight}>
                    <View style={styles.calorieRow}>
                      <Ionicons name="flame" size={14} color="#fb923c" />
                      <Text style={styles.calorieValue}>{plan.targetCalories}</Text>
                      <Text style={styles.calorieUnit}>kcal</Text>
                    </View>
                    <Text style={styles.planDate}>{date}</Text>
                  </View>
                </TouchableOpacity>

                {/* Grocery list shortcut */}
                <View style={styles.groceryRow}>
                  <TouchableOpacity
                    style={styles.groceryLink}
                    onPress={() => router.push(`/(screens)/meals/grocery-list?planId=${plan.id}` as never)}
                  >
                    <Ionicons name="cart-outline" size={14} color="#60a5fa" />
                    <Text style={styles.groceryText}>Grocery List</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff', fontFamily: 'BarlowCondensed-Bold' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },

  outlineBtn: {
    borderWidth: 1, borderColor: '#162540', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  outlineBtnText: { color: '#A8BDD4', fontSize: 13, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#3B82F6', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'DMSans-Bold' },

  content: { paddingHorizontal: 20, paddingTop: 8 },

  center: { alignItems: 'center', paddingTop: 80, gap: 16 },
  errorText: { color: '#718FAF', fontSize: 15, fontFamily: 'DMSans-Regular' },
  retryBtn: { backgroundColor: '#3B82F6', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600', fontFamily: 'DMSans-SemiBold' },

  emptyState: { alignItems: 'center', paddingTop: 80, paddingBottom: 40, gap: 12 },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#0B1326', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff', fontFamily: 'BarlowCondensed-Bold' },
  emptySub: { fontSize: 13, color: '#718FAF', textAlign: 'center', paddingHorizontal: 32, lineHeight: 18, fontFamily: 'DMSans-Regular' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4,
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'DMSans-Bold' },

  planCard: {
    backgroundColor: '#0B1326', borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#162540', overflow: 'hidden',
  },
  planCardBody: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 16, gap: 12,
  },
  planCardLeft: { flex: 1, minWidth: 0 },
  planName: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8, fontFamily: 'DMSans-Bold' },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  goalText: { fontSize: 11, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  planDays: { fontSize: 11, color: '#718FAF', fontFamily: 'DMSans-Regular' },

  planCardRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  calorieRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  calorieValue: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  calorieUnit: { color: '#718FAF', fontSize: 11, fontFamily: 'DMSans-Regular' },
  planDate: { color: '#718FAF', fontSize: 11, fontFamily: 'DMSans-Regular' },

  groceryRow: {
    paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  groceryLink: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  groceryText: { fontSize: 12, color: '#60a5fa', fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
});
