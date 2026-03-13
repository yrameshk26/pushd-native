import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchExerciseById } from '../../../src/api/exercises';
import { fetchExercise1RM, fetchExerciseSessions } from '../../../src/api/progress';
import { useWorkoutStore } from '../../../src/store/workout';
import type { ExerciseSession } from '../../../src/api/progress';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: exercise,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['exercise', id],
    queryFn: () => fetchExerciseById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });

  const { data: oneRMData } = useQuery({
    queryKey: ['exercise-1rm', id],
    queryFn: () => fetchExercise1RM(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: sessions } = useQuery({
    queryKey: ['exercise-sessions', id],
    queryFn: () => fetchExerciseSessions(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const { active, addExercise } = useWorkoutStore();

  function handleAddToWorkout() {
    if (!exercise) return;
    addExercise({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      order: active?.exercises.length ?? 0,
    });
    Alert.alert(
      'Added',
      `${exercise.name} added to your workout.`,
      [
        { text: 'Continue Browsing' },
        { text: 'Go to Workout', onPress: () => router.push('/(screens)/workout/active') },
      ],
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centeredState}>
          <ActivityIndicator color="#6C63FF" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (isError || !exercise) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centeredState}>
          <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" />
          <Text style={styles.errorText}>Could not load exercise</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Content ───────────────────────────────────────────────────────────────

  const primaryColor = getMuscleColor(exercise.primaryMuscle);
  const secondaryMuscles = (exercise.muscleGroups ?? []).filter(
    (m: string) => m !== exercise.primaryMuscle,
  );
  const instructions = exercise.instructions ?? [];
  const recentSessions: ExerciseSession[] = (sessions ?? []).slice(0, 5);
  const estimated1RM = oneRMData?.estimated1RM;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Sticky header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{exercise.name}</Text>
        {exercise.isCustom ? (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push(`/(screens)/exercises/edit?id=${id}`)}
          >
            <Ionicons name="pencil-outline" size={18} color="#6C63FF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero image or placeholder */}
        <View style={[styles.hero, { backgroundColor: primaryColor + '22' }]}>
          {exercise.gifUrl ? (
            <Image
              source={{ uri: exercise.gifUrl }}
              style={styles.heroImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.heroDumbbellCircle, { backgroundColor: primaryColor + '33' }]}>
              <Ionicons name="barbell" size={64} color={primaryColor} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          {/* Name */}
          <Text style={styles.name}>{exercise.name}</Text>

          {/* Tags row */}
          <View style={styles.tagsRow}>
            {/* Primary muscle */}
            <View style={[styles.tag, { backgroundColor: primaryColor + '33' }]}>
              <Text style={[styles.tagText, { color: primaryColor }]}>
                {formatLabel(exercise.primaryMuscle)}
              </Text>
            </View>

            {/* Secondary muscles */}
            {secondaryMuscles.slice(0, 3).map((m: string) => (
              <View key={m} style={styles.tagOutline}>
                <Text style={styles.tagOutlineText}>{formatLabel(m)}</Text>
              </View>
            ))}

            {/* Equipment */}
            <View style={styles.tagOutline}>
              <Ionicons name="barbell-outline" size={11} color="#888" style={{ marginRight: 3 }} />
              <Text style={styles.tagOutlineText}>{formatLabel(exercise.equipment)}</Text>
            </View>

            {/* Difficulty */}
            {exercise.difficulty ? (
              <View style={styles.tagOutline}>
                <Text style={styles.tagOutlineText}>{formatLabel(exercise.difficulty)}</Text>
              </View>
            ) : null}
          </View>

          {/* Estimated 1RM */}
          {estimated1RM && estimated1RM > 0 ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="trophy-outline" size={16} color="#6C63FF" />
                <Text style={styles.cardTitle}>Estimated 1RM</Text>
              </View>
              <Text style={styles.oneRMValue}>{Math.round(estimated1RM)} kg</Text>
              <Text style={styles.oneRMSubtext}>Based on your best recent set</Text>
            </View>
          ) : null}

          {/* Description */}
          {exercise.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.descriptionText}>{exercise.description}</Text>
            </View>
          ) : null}

          {/* Instructions */}
          {instructions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="information-circle-outline" size={16} color="#888" />
                <Text style={styles.sectionTitle}>Instructions</Text>
              </View>
              {instructions.map((step: string, index: number) => (
                <View key={index} style={styles.instructionRow}>
                  <View style={[styles.stepBadge, { backgroundColor: primaryColor + '33' }]}>
                    <Text style={[styles.stepNumber, { color: primaryColor }]}>{index + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {/* No content placeholder */}
          {instructions.length === 0 && !exercise.description && !estimated1RM && (
            <View style={styles.noHistoryState}>
              <Ionicons name="barbell-outline" size={36} color="#333" />
              <Text style={styles.noHistoryText}>No details available for this exercise yet</Text>
            </View>
          )}

          {/* Recent sessions */}
          {recentSessions.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Previous Sessions</Text>
              <View style={styles.card}>
                {recentSessions.map((session, idx) => (
                  <View
                    key={session.id}
                    style={[
                      styles.sessionRow,
                      idx < recentSessions.length - 1 && styles.sessionRowBorder,
                    ]}
                  >
                    <View style={styles.sessionLeft}>
                      <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                      <Text style={styles.sessionMeta}>
                        {session.topWeight} kg × {session.topReps} reps
                      </Text>
                    </View>
                    <View style={styles.sessionRight}>
                      <Text style={styles.sessionVolume}>
                        {Math.round(session.totalVolume)} kg
                      </Text>
                      <Text style={styles.sessionVolumeLabel}>volume</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.noHistoryState}>
              <Text style={styles.noHistoryText}>
                No history yet — add this exercise to a workout to start tracking
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add to workout button — only shown when a workout is active */}
      {active && (
        <View style={styles.fabContainer}>
          <TouchableOpacity style={styles.addToWorkoutBtn} onPress={handleAddToWorkout} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addToWorkoutText}>Add to Workout</Text>
          </TouchableOpacity>
        </View>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#6C63FF22',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: { width: '100%', height: '100%' },
  heroDumbbellCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Body
  scrollContent: { paddingBottom: 120 },
  body: { padding: 20 },
  name: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 12 },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  tag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, fontWeight: '700' },
  tagOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  tagOutlineText: { color: '#888', fontSize: 12 },

  // Card
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 16,
    marginBottom: 20,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  cardTitle: { color: '#ccc', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },

  // 1RM
  oneRMValue: { color: '#6C63FF', fontSize: 32, fontWeight: '800', marginBottom: 4 },
  oneRMSubtext: { color: '#555', fontSize: 12 },

  // Sections
  section: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  descriptionText: { color: '#999', fontSize: 14, lineHeight: 22 },

  // Instructions
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumber: { fontSize: 13, fontWeight: '800' },
  instructionText: { flex: 1, color: '#bbb', fontSize: 14, lineHeight: 22 },

  // Sessions
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sessionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  sessionLeft: { flex: 1 },
  sessionDate: { color: '#888', fontSize: 12, marginBottom: 2 },
  sessionMeta: { color: '#fff', fontSize: 14, fontWeight: '600' },
  sessionRight: { alignItems: 'flex-end' },
  sessionVolume: { color: '#6C63FF', fontSize: 14, fontWeight: '700' },
  sessionVolumeLabel: { color: '#555', fontSize: 11 },

  // States
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
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
  noHistoryState: { alignItems: 'center', paddingTop: 40, gap: 10, marginBottom: 20 },
  noHistoryText: { color: '#555', fontSize: 14, textAlign: 'center' },

  // FAB / add to workout
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  addToWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  addToWorkoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
