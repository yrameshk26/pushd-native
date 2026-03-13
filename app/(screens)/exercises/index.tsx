import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  ListRenderItemInfo,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchExercises } from '../../../src/api/exercises';
import type { Exercise } from '../../../src/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MUSCLE_GROUPS: { label: string; value: string }[] = [
  { label: 'Chest', value: 'CHEST' },
  { label: 'Back', value: 'BACK' },
  { label: 'Shoulders', value: 'SHOULDERS' },
  { label: 'Biceps', value: 'BICEPS' },
  { label: 'Triceps', value: 'TRICEPS' },
  { label: 'Core', value: 'CORE' },
  { label: 'Quads', value: 'QUADS' },
  { label: 'Hamstrings', value: 'HAMSTRINGS' },
  { label: 'Glutes', value: 'GLUTES' },
  { label: 'Calves', value: 'CALVES' },
  { label: 'Cardio', value: 'CARDIO' },
];

const MUSCLE_COLORS: Record<string, string> = {
  CHEST: '#e74c3c',
  BACK: '#3498db',
  SHOULDERS: '#9b59b6',
  BICEPS: '#e67e22',
  TRICEPS: '#f39c12',
  QUADS: '#2ecc71',
  HAMSTRINGS: '#1abc9c',
  GLUTES: '#27ae60',
  CALVES: '#16a085',
  CORE: '#d35400',
  CARDIO: '#c0392b',
  FULL_BODY: '#6C63FF',
};

function getMuscleColor(muscle: string): string {
  return MUSCLE_COLORS[muscle] ?? '#6C63FF';
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}

function FilterChip({ label, active, color, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        active && { backgroundColor: color ?? '#6C63FF', borderColor: color ?? '#6C63FF' },
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface ExerciseRowProps {
  exercise: Exercise;
  onPress: () => void;
}

function ExerciseRow({ exercise, onPress }: ExerciseRowProps) {
  const muscleColor = getMuscleColor(exercise.primaryMuscle);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {exercise.gifUrl ? (
        <Image source={{ uri: exercise.gifUrl }} style={styles.rowThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.rowThumb, styles.rowThumbPlaceholder, { backgroundColor: muscleColor + '33' }]}>
          <Text style={[styles.rowThumbLabel, { color: muscleColor }]}>
            {exercise.primaryMuscle.slice(0, 2)}
          </Text>
        </View>
      )}

      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>{exercise.name}</Text>
        <View style={styles.rowMeta}>
          <View style={[styles.muscleBadge, { backgroundColor: muscleColor + '33' }]}>
            <Text style={[styles.muscleBadgeText, { color: muscleColor }]}>
              {formatLabel(exercise.primaryMuscle)}
            </Text>
          </View>
          <Text style={styles.equipmentText}>
            {formatLabel(exercise.equipment)}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#555" />
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExercisesScreen() {
  const [search, setSearch] = useState('');
  const [activeMuscle, setActiveMuscle] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['exercises', search, activeMuscle],
    queryFn: () =>
      fetchExercises({
        search: search || undefined,
        muscle: activeMuscle ?? undefined,
        page: 1,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const exercises: Exercise[] = data?.exercises ?? [];

  const handleMuscleToggle = useCallback((value: string) => {
    setActiveMuscle((prev) => (prev === value ? null : value));
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Exercise>) => (
      <ExerciseRow
        exercise={item}
        onPress={() => router.push(`/(screens)/exercises/${item.id}`)}
      />
    ),
    [],
  );

  const keyExtractor = useCallback((item: Exercise) => item.id, []);

  const ListHeader = (
    <>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#555" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises..."
          placeholderTextColor="#555"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Muscle group filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipScrollContent}
      >
        <FilterChip
          label="All"
          active={activeMuscle === null}
          color="#6C63FF"
          onPress={() => setActiveMuscle(null)}
        />
        {MUSCLE_GROUPS.map((mg) => (
          <FilterChip
            key={mg.value}
            label={mg.label}
            active={activeMuscle === mg.value}
            color={getMuscleColor(mg.value)}
            onPress={() => handleMuscleToggle(mg.value)}
          />
        ))}
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Exercises</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/(screens)/exercises/create')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator color="#6C63FF" size="large" />
        </View>
      ) : isError ? (
        <View style={styles.centeredState}>
          <Ionicons name="alert-circle-outline" size={40} color="#e74c3c" />
          <Text style={styles.errorText}>Failed to load exercises</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()} accessibilityRole="button">
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          windowSize={10}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>No exercises found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff' },
  createBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },

  // Filters
  chipScroll: { marginBottom: 12 },
  chipScrollContent: { paddingLeft: 20, paddingRight: 8 },

  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipText: { color: '#888', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  // List
  list: { flex: 1 },
  listContent: { paddingBottom: 100 },

  // Exercise row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 12,
  },
  rowThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    marginRight: 12,
  },
  rowThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowThumbLabel: { fontSize: 14, fontWeight: '800' },
  rowBody: { flex: 1, marginRight: 8 },
  rowName: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muscleBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  muscleBadgeText: { fontSize: 11, fontWeight: '600' },
  equipmentText: { color: '#666', fontSize: 12 },

  // States
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: { color: '#e74c3c', fontSize: 15, fontWeight: '600' },
  retryBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  retryText: { color: '#6C63FF', fontWeight: '600', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: '#555', fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 13 },
});
