import { useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ListRenderItemInfo,
  Animated,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { api } from '../../src/api/client';

// ─── API ──────────────────────────────────────────────────────────────────────

interface RoutineListItem {
  id: string;
  name: string;
  description?: string | null;
  lastPerformedAt?: string | null;
  _count: { exercises: number };
}

async function fetchRoutines(): Promise<RoutineListItem[]> {
  const { data } = await api.get('/api/routines');
  return Array.isArray(data) ? data : (data?.data ?? []);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Never performed';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AIPlannerCard() {
  return (
    <TouchableOpacity
      style={styles.ctaCard}
      onPress={() => router.push('/(screens)/ai-planner')}
      activeOpacity={0.8}
    >
      <View style={styles.ctaIconAI}>
        <Ionicons name="sparkles" size={20} color="#fff" />
      </View>
      <View style={styles.ctaBody}>
        <Text style={styles.ctaTitle}>AI Workout Planner</Text>
        <Text style={styles.ctaSubtitle}>Get a personalised plan built just for you</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#718FAF" />
    </TouchableOpacity>
  );
}

function ProgramsCard() {
  return (
    <TouchableOpacity
      style={[styles.ctaCard, styles.ctaCardBlue]}
      onPress={() => router.push('/(screens)/programs')}
      activeOpacity={0.8}
    >
      <View style={styles.ctaIconBlue}>
        <Ionicons name="bookmark-outline" size={20} color="#fff" />
      </View>
      <View style={styles.ctaBody}>
        <Text style={styles.ctaTitle}>Browse Programs</Text>
        <Text style={styles.ctaSubtitle}>Pre-built Push, Pull, Legs, Full Body & more</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#718FAF" />
    </TouchableOpacity>
  );
}

interface RoutineCardProps {
  routine: RoutineListItem;
  onDelete: (id: string) => void;
}

const CARD_WIDTH = 80;
const FULL_SWIPE_THRESHOLD = 200;

function RoutineCard({ routine, onDelete }: RoutineCardProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const bgColor = dragX.interpolate({
      inputRange: [-FULL_SWIPE_THRESHOLD, -CARD_WIDTH],
      outputRange: ['#b91c1c', '#ef4444'],
      extrapolate: 'clamp',
    });
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={[styles.deleteAction, { backgroundColor: bgColor }]}>
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center', gap: 4 }}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </Animated.View>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={CARD_WIDTH}
      overshootRight={false}
      onSwipeableWillOpen={() => {
        // full swipe detected — delete immediately
        swipeableRef.current?.close();
        onDelete(routine.id);
      }}
    >
      <TouchableOpacity
        style={styles.routineCard}
        onPress={() => router.push(`/(screens)/routines/${routine.id}`)}
        activeOpacity={0.75}
      >
        <View style={styles.routineCardLeft}>
          <Text style={styles.routineName} numberOfLines={1}>{routine.name}</Text>
          <View style={styles.routineMeta}>
            <Ionicons name="barbell-outline" size={13} color="#3B82F6" />
            <Text style={styles.routineMetaText}>
              {routine._count.exercises} exercise{routine._count.exercises !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.routineMetaDot}>·</Text>
            <Text style={styles.routineMetaText}>{formatDate(routine.lastPerformedAt)}</Text>
          </View>
          {routine.description ? (
            <Text style={styles.routineDesc} numberOfLines={1}>{routine.description}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color="#4A6080" />
      </TouchableOpacity>
    </Swipeable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RoutinesScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<RoutineListItem[]>({
    queryKey: ['routines'],
    queryFn: fetchRoutines,
    staleTime: 2 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/api/routines/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routines'] }),
    onError: () => {},
  });

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  const routines = data ?? [];

  const renderItem = ({ item }: ListRenderItemInfo<RoutineListItem>) => (
    <RoutineCard routine={item} onDelete={handleDelete} />
  );

  const EmptyComponent = (
    <View style={styles.emptyState}>
      <Ionicons name="book-outline" size={56} color="#162540" />
      <Text style={styles.emptyTitle}>No routines yet</Text>
      <Text style={styles.emptySubtitle}>Create your first routine or use the AI Planner</Text>
      <TouchableOpacity
        style={styles.emptyCreateBtn}
        onPress={() => router.push('/(screens)/routines/create')}
      >
        <Text style={styles.emptyCreateText}>Create First Routine</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Routines</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/(screens)/routines/create')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* CTA cards always visible regardless of loading/error state */}
      <View style={styles.ctaSection}>
        <AIPlannerCard />
        <ProgramsCard />
      </View>

      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      ) : isError ? (
        <View style={styles.centeredState}>
          <Ionicons name="alert-circle-outline" size={40} color="#e74c3c" />
          <Text style={styles.errorText}>Failed to load routines</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()} accessibilityRole="button">
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={routines}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          ListHeaderComponent={routines.length > 0 ? <Text style={styles.sectionLabel}>MY ROUTINES</Text> : null}
          ListEmptyComponent={EmptyComponent}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff', fontFamily: 'BarlowCondensed-Bold' },
  createBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  ctaSection: { paddingHorizontal: 20, paddingTop: 8 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // CTA cards
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111D36',
    borderWidth: 1,
    borderColor: '#3B82F644',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    marginTop: 10,
  },
  ctaCardBlue: {
    backgroundColor: '#111D36',
    borderColor: '#3B82F644',
    marginTop: 0,
  },
  ctaIconAI: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ctaIconBlue: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ctaBody: { flex: 1 },
  ctaTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2, fontFamily: 'DMSans-SemiBold' },
  ctaSubtitle: { color: '#718FAF', fontSize: 12, fontFamily: 'DMSans-Regular' },

  // Section label
  sectionLabel: {
    color: '#718FAF', fontSize: 11, fontWeight: '700',
    letterSpacing: 1, marginTop: 16, marginBottom: 10,
    fontFamily: 'BarlowCondensed-SemiBold',
  },

  // Routine card
  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1326',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#162540',
    padding: 16,
    marginBottom: 10,
  },
  routineCardLeft: { flex: 1, marginRight: 8 },
  routineName: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6, fontFamily: 'DMSans-Bold' },
  routineMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  routineMetaText: { color: '#718FAF', fontSize: 12, fontFamily: 'DMSans-Regular' },
  routineMetaDot: { color: '#4A6080', fontSize: 12 },
  routineDesc: { color: '#718FAF', fontSize: 12, marginTop: 2, fontFamily: 'DMSans-Regular' },

  // Swipe delete action
  deleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 14,
    marginBottom: 10,
    gap: 4,
  },
  deleteActionText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyTitle: { color: '#718FAF', fontSize: 17, fontWeight: '700', fontFamily: 'BarlowCondensed-Bold' },
  emptySubtitle: { color: '#718FAF', fontSize: 13, textAlign: 'center', maxWidth: 260, fontFamily: 'DMSans-Regular' },
  emptyCreateBtn: {
    marginTop: 12, backgroundColor: '#3B82F6',
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyCreateText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'DMSans-Bold' },

  // States
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: '#e74c3c', fontSize: 15, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  retryBtn: {
    backgroundColor: '#0B1326', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: '#162540',
  },
  retryText: { color: '#3B82F6', fontWeight: '600', fontSize: 14, fontFamily: 'DMSans-SemiBold' },
});
