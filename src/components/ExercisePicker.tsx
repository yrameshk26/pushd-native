import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, Modal, ActivityIndicator, Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { fetchExercises } from '../api/exercises';
import { Exercise } from '../types';

const MUSCLES = ['', 'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'CORE', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES'];

const MUSCLE_LABELS: Record<string, string> = {
  '': 'All', CHEST: 'Chest', BACK: 'Back', SHOULDERS: 'Shoulders',
  BICEPS: 'Biceps', TRICEPS: 'Triceps', CORE: 'Core',
  QUADS: 'Quads', HAMSTRINGS: 'Hamstrings', GLUTES: 'Glutes', CALVES: 'Calves',
};

const MUSCLE_COLORS: Record<string, string> = {
  CHEST: '#ef4444', BACK: '#3b82f6', SHOULDERS: '#a855f7',
  BICEPS: '#3b82f6', TRICEPS: '#eab308', CORE: '#06b6d4',
  GLUTES: '#ec4899', QUADS: '#10b981', HAMSTRINGS: '#14b8a6',
  CALVES: '#6366f1',
};

function getMuscleColor(muscle: string): string {
  return MUSCLE_COLORS[muscle] ?? '#6b7280';
}

interface Props {
  visible: boolean;
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExercisePicker({ visible, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['exercises', search, muscle],
    queryFn: () => fetchExercises({ search: search || undefined, muscle: muscle || undefined }),
    enabled: visible,
    staleTime: 5 * 60 * 1000,
  });

  const handleSelect = useCallback((ex: Exercise) => {
    onSelect(ex);
    setSearch('');
    setMuscle('');
    onClose();
  }, [onSelect, onClose]);

  const exercises = data?.exercises ?? [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add Exercise</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color="#718FAF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor="#4A6080"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#4A6080" />
            </TouchableOpacity>
          )}
        </View>

        {/* Muscle filter pills */}
        <View style={styles.filterWrapper}>
          <FlatList
            data={MUSCLES}
            horizontal
            keyExtractor={(m) => m || 'all'}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            renderItem={({ item }) => {
              const isActive = muscle === item;
              const color = item ? getMuscleColor(item) : '#3b82f6';
              return (
                <TouchableOpacity
                  style={[
                    styles.chip,
                    isActive && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => setMuscle(muscle === item ? '' : item)}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {MUSCLE_LABELS[item]}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Exercise list */}
        {isLoading ? (
          <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(e) => e.id}
            style={styles.exerciseList}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const imgUrl = item.thumbnailUrl ?? item.gifUrl ?? null;
              const muscleColor = getMuscleColor(item.primaryMuscle);
              const muscleLabel = MUSCLE_LABELS[item.primaryMuscle] ?? item.primaryMuscle;
              const equipmentLabel = item.equipment.toLowerCase().replace(/_/g, ' ');

              return (
                <TouchableOpacity
                  style={styles.exerciseRow}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  {imgUrl ? (
                    <Image
                      source={{ uri: imgUrl }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.thumbnailFallback, { backgroundColor: muscleColor + '33' }]}>
                      <Text style={[styles.thumbnailFallbackText, { color: muscleColor }]}>
                        {item.primaryMuscle.slice(0, 2)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.exerciseMeta}>
                      <View style={[styles.badge, { backgroundColor: muscleColor + '33' }]}>
                        <Text style={[styles.badgeText, { color: muscleColor }]}>
                          {muscleLabel.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.equipmentText}>{equipmentLabel}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.empty}>No exercises found</Text>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060C1B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'BarlowCondensed-Bold',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111D36',
    marginHorizontal: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#3b82f6',
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    padding: 0,
    fontFamily: 'DMSans-Regular',
  },
  filterWrapper: {
    height: 52,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  exerciseList: {
    flex: 1,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#162540',
    backgroundColor: 'transparent',
  },
  chipText: {
    color: '#718FAF',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'DMSans-Medium',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'DMSans-SemiBold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111D36',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#111D36',
  },
  thumbnailFallback: {
    width: 48,
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailFallbackText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'DMSans-Bold',
  },
  exerciseInfo: {
    flex: 1,
    gap: 4,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'DMSans-SemiBold',
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontFamily: 'BarlowCondensed-Bold',
  },
  equipmentText: {
    color: '#718FAF',
    fontSize: 12,
    textTransform: 'capitalize',
    fontFamily: 'DMSans-Regular',
  },
  empty: {
    color: '#4A6080',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
  },
});
