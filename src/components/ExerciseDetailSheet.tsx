import { useEffect, useState } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchExerciseById, ExerciseDetail } from '../api/exercises';

const MUSCLE_COLORS: Record<string, string> = {
  CHEST: '#ef4444', BACK: '#3b82f6', SHOULDERS: '#a855f7',
  BICEPS: '#3b82f6', TRICEPS: '#eab308', CORE: '#06b6d4',
  GLUTES: '#ec4899', QUADS: '#10b981', HAMSTRINGS: '#14b8a6',
  CALVES: '#6366f1', FULL_BODY: '#f97316', CARDIO: '#f43f5e',
};

const MUSCLE_LABELS: Record<string, string> = {
  CHEST: 'Chest', BACK: 'Back', SHOULDERS: 'Shoulders', BICEPS: 'Biceps',
  TRICEPS: 'Triceps', CORE: 'Core', GLUTES: 'Glutes', QUADS: 'Quads',
  HAMSTRINGS: 'Hamstrings', CALVES: 'Calves', FULL_BODY: 'Full Body', CARDIO: 'Cardio',
};

interface Props {
  exerciseId: string | null;
  onClose: () => void;
}

export function ExerciseDetailSheet({ exerciseId, onClose }: Props) {
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!exerciseId) {
      setExercise(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    fetchExerciseById(exerciseId)
      .then(setExercise)
      .catch(() => setError('Could not load exercise details.'))
      .finally(() => setIsLoading(false));
  }, [exerciseId]);

  const visible = !!exerciseId;
  const muscleColor = exercise ? (MUSCLE_COLORS[exercise.primaryMuscle] ?? '#6b7280') : '#6b7280';
  const muscleLabel = exercise ? (MUSCLE_LABELS[exercise.primaryMuscle] ?? exercise.primaryMuscle) : '';
  const imgUrl = exercise?.gifUrl ?? exercise?.thumbnailUrl ?? null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {exercise?.name ?? 'Exercise Details'}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#ff4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : exercise ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Image */}
            {imgUrl ? (
              <Image
                source={{ uri: imgUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imageFallback}>
                <Ionicons name="barbell-outline" size={48} color="#4a5568" />
              </View>
            )}

            {/* Badges */}
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: muscleColor + '33' }]}>
                <Text style={[styles.badgeText, { color: muscleColor }]}>
                  {muscleLabel.toUpperCase()}
                </Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {exercise.equipment.toLowerCase().replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
              {exercise.difficulty && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{exercise.difficulty}</Text>
                </View>
              )}
            </View>

            {/* All targeted muscles */}
            {exercise.muscleGroups && exercise.muscleGroups.length > 1 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MUSCLES TARGETED</Text>
                <View style={styles.muscleChips}>
                  {exercise.muscleGroups.map((m) => (
                    <View
                      key={m}
                      style={[styles.muscleChip, { backgroundColor: (MUSCLE_COLORS[m] ?? '#6b7280') + '22' }]}
                    >
                      <Text style={[styles.muscleChipText, { color: MUSCLE_COLORS[m] ?? '#9ca3af' }]}>
                        {MUSCLE_LABELS[m] ?? m}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Description */}
            {exercise.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>DESCRIPTION</Text>
                <Text style={styles.descriptionText}>{exercise.description}</Text>
              </View>
            )}

            {/* Instructions */}
            {exercise.instructions && exercise.instructions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>HOW TO PERFORM</Text>
                {exercise.instructions.map((step, i) => (
                  <View key={i} style={styles.instructionRow}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.instructionText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#fff', flex: 1, marginRight: 12 },
  content: { paddingBottom: 40 },
  image: {
    width: '100%', height: 220,
    backgroundColor: '#161b22',
  },
  imageFallback: {
    width: '100%', height: 220,
    backgroundColor: '#161b22',
    justifyContent: 'center', alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 20, paddingTop: 16,
  },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6, backgroundColor: '#1e2a3a',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5 },
  section: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#4b5563', letterSpacing: 1 },
  muscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muscleChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  muscleChipText: { fontSize: 12, fontWeight: '600' },
  descriptionText: { color: '#9ca3af', fontSize: 14, lineHeight: 22 },
  instructionRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNumber: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#6C63FF',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1,
  },
  stepNumberText: { color: '#6C63FF', fontSize: 11, fontWeight: '700' },
  instructionText: { color: '#d1d5db', fontSize: 14, lineHeight: 22, flex: 1 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 20, padding: 16, backgroundColor: '#1a0a0a',
    borderRadius: 12, borderWidth: 1, borderColor: '#ff4444',
  },
  errorText: { color: '#ff6666', fontSize: 14, flex: 1 },
});
