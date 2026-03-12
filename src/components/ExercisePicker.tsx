import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, Modal, ActivityIndicator,
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
  });

  const handleSelect = useCallback((ex: Exercise) => {
    onSelect(ex);
    setSearch('');
    setMuscle('');
    onClose();
  }, [onSelect, onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add Exercise</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color="#666" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor="#555"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>

        {/* Muscle filter */}
        <FlatList
          data={MUSCLES}
          horizontal
          keyExtractor={(m) => m || 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, muscle === item && styles.chipActive]}
              onPress={() => setMuscle(item)}
            >
              <Text style={[styles.chipText, muscle === item && styles.chipTextActive]}>
                {MUSCLE_LABELS[item]}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Results */}
        {isLoading ? (
          <ActivityIndicator color="#6C63FF" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={data?.exercises ?? []}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.exerciseRow} onPress={() => handleSelect(item)}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {item.primaryMuscle.replace('_', ' ')} · {item.equipment.replace('_', ' ')}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={22} color="#6C63FF" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No exercises found</Text>}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 24,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a',
    marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#2a2a2a',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 12 },
  filterRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
  },
  chipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  chipText: { color: '#888', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  exerciseRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 3 },
  exerciseMeta: { color: '#666', fontSize: 13, textTransform: 'capitalize' },
  empty: { color: '#555', textAlign: 'center', marginTop: 40 },
});
