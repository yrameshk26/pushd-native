import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api/client';

// ─── Types ─────────────────────────────────────────────────────────────────

type ProgramLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

interface ProgramExercise {
  name: string;
  targetSets: number;
  targetReps?: number;
  notes?: string;
}

interface WeeklyDay {
  day: string;
  exercises: ProgramExercise[];
}

interface ProgramWeek {
  week: number;
  days: WeeklyDay[];
}

interface ProgramDetail {
  id: string;
  name: string;
  description: string;
  durationWeeks: number;
  daysPerWeek: number;
  level: ProgramLevel;
  estimatedMinutes?: number;
  equipment: string[];
  author?: string;
  exercises: ProgramExercise[];
  weeklySchedule?: ProgramWeek[];
}

// ─── Constants ─────────────────────────────────────────────────────────────

const LEVEL_BADGE: Record<ProgramLevel, { bg: string; text: string; label: string }> = {
  BEGINNER: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', label: 'Beginner' },
  INTERMEDIATE: { bg: 'rgba(234,179,8,0.12)', text: '#eab308', label: 'Intermediate' },
  ADVANCED: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', label: 'Advanced' },
};

const EQUIPMENT_LABELS: Record<string, string> = {
  BARBELL: 'Barbell',
  DUMBBELL: 'Dumbbell',
  CABLE: 'Cable',
  MACHINE: 'Machine',
  BODYWEIGHT: 'Bodyweight',
  KETTLEBELL: 'Kettlebell',
  RESISTANCE_BAND: 'Bands',
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

function useProgram(id: string) {
  return useQuery<ProgramDetail>({
    queryKey: ['program', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/programs/${id}`);
      return data?.data ?? data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Toast helper ──────────────────────────────────────────────────────────

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('', message, [{ text: 'OK' }]);
  }
}

// ─── Stat card ─────────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <View style={statStyles.card}>
      <Ionicons name={icon as any} size={18} color="#888" />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a', gap: 4,
  },
  value: { color: '#fff', fontSize: 17, fontWeight: '800' },
  label: { color: '#666', fontSize: 11 },
});

// ─── Exercise row ─────────────────────────────────────────────────────────

function ExerciseRow({ exercise, index }: { exercise: ProgramExercise; index: number }) {
  return (
    <View style={exStyles.row}>
      <View style={exStyles.badge}>
        <Text style={exStyles.badgeText}>{index + 1}</Text>
      </View>
      <View style={exStyles.info}>
        <Text style={exStyles.name}>{exercise.name}</Text>
        <Text style={exStyles.meta}>
          {exercise.targetSets} sets
          {exercise.targetReps != null ? ` × ${exercise.targetReps} reps` : ''}
          {exercise.notes ? ` · ${exercise.notes}` : ''}
        </Text>
      </View>
    </View>
  );
}

const exStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  badge: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(108,99,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#6C63FF', fontSize: 13, fontWeight: '700' },
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  meta: { color: '#666', fontSize: 13 },
});

// ─── Weekly schedule ──────────────────────────────────────────────────────

function WeeklyScheduleSection({ schedule }: { schedule: ProgramWeek[] }) {
  return (
    <View>
      <Text style={sectionStyles.label}>WEEKLY SCHEDULE</Text>
      {schedule.map((week) => (
        <View key={week.week} style={schedStyles.weekBlock}>
          <Text style={schedStyles.weekTitle}>Week {week.week}</Text>
          {week.days.map((day) => (
            <View key={day.day} style={schedStyles.dayBlock}>
              <Text style={schedStyles.dayName}>{day.day}</Text>
              {day.exercises.map((ex, i) => (
                <Text key={i} style={schedStyles.dayExercise}>
                  {ex.name} — {ex.targetSets} sets
                  {ex.targetReps != null ? ` × ${ex.targetReps}` : ''}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const schedStyles = StyleSheet.create({
  weekBlock: { marginBottom: 16 },
  weekTitle: { color: '#6C63FF', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  dayBlock: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a',
  },
  dayName: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  dayExercise: { color: '#888', fontSize: 13, lineHeight: 20 },
});

const sectionStyles = StyleSheet.create({
  label: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
});

// ─── Main screen ──────────────────────────────────────────────────────────

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: program, isLoading, isError, refetch } = useProgram(id);
  const [added, setAdded] = useState(false);

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/programs/${id}/add`);
      return data;
    },
    onSuccess: (data) => {
      setAdded(true);
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      showToast('Program added to your routines!');
      const routineId = data?.data?.id ?? data?.id;
      if (routineId) {
        setTimeout(() => router.push(`/(screens)/routines/${routineId}` as any), 600);
      } else {
        setTimeout(() => router.push('/(app)/routines'), 600);
      }
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error ?? 'Failed to add program. Please try again.';
      Alert.alert('Error', message);
    },
  });

  function handleAdd() {
    if (added || addMutation.isPending) return;
    addMutation.mutate();
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Program</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 48 }} />
      </SafeAreaView>
    );
  }

  if (isError || !program) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Program</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={44} color="#333" />
          <Text style={styles.errorText}>Program not found</Text>
          <TouchableOpacity onPress={() => router.push('/(screens)/programs')} style={styles.browseBtn}>
            <Text style={styles.browseBtnText}>Browse Programs</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const badge = LEVEL_BADGE[program.level];
  const isPending = addMutation.isPending;

  return (
    <SafeAreaView style={styles.container}>
      {/* Sticky header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{program.name}</Text>
        <TouchableOpacity
          style={[styles.addBtnSmall, (isPending || added) && styles.addBtnSmallDone]}
          onPress={handleAdd}
          disabled={isPending || added}
          activeOpacity={0.8}
        >
          {added ? (
            <Ionicons name="checkmark" size={16} color="#fff" />
          ) : isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="add" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Metadata row */}
        <View style={styles.metaBadgeRow}>
          <View style={[styles.levelBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.levelBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
          {program.equipment.map((eq) => (
            <View key={eq} style={styles.equipChip}>
              <Text style={styles.equipChipText}>{EQUIPMENT_LABELS[eq] ?? eq}</Text>
            </View>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.description}>{program.description}</Text>

        {/* Author */}
        {program.author ? (
          <View style={styles.authorRow}>
            <Ionicons name="person-circle-outline" size={16} color="#555" />
            <Text style={styles.authorText}>By {program.author}</Text>
          </View>
        ) : null}

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="barbell-outline" label="Exercises" value={program.exercises.length} />
          {program.estimatedMinutes ? (
            <StatCard icon="time-outline" label="Duration" value={`~${program.estimatedMinutes}m`} />
          ) : null}
          <StatCard icon="calendar-outline" label="Days/week" value={program.daysPerWeek} />
          {program.durationWeeks ? (
            <StatCard icon="layers-outline" label="Weeks" value={program.durationWeeks} />
          ) : null}
        </View>

        {/* Weekly schedule (if provided by API) */}
        {program.weeklySchedule && program.weeklySchedule.length > 0 ? (
          <WeeklyScheduleSection schedule={program.weeklySchedule} />
        ) : (
          <>
            <Text style={sectionStyles.label}>EXERCISES</Text>
            <View style={styles.exerciseList}>
              {program.exercises.map((ex, i) => (
                <ExerciseRow key={i} exercise={ex} index={i} />
              ))}
            </View>
          </>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.addBtn, (isPending || added) && styles.addBtnSuccess]}
          onPress={handleAdd}
          disabled={isPending || added}
          activeOpacity={0.8}
        >
          {added ? (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Added to My Routines!</Text>
            </>
          ) : isPending ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.addBtnText}>Adding...</Text>
            </>
          ) : (
            <>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add to My Routines</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.addHint}>
          This will be saved to your routines where you can edit and customise it.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  addBtnSmall: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#6C63FF',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnSmallDone: { backgroundColor: '#22c55e' },
  content: { padding: 20, paddingBottom: 40 },
  metaBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  levelBadgeText: { fontSize: 12, fontWeight: '700' },
  equipChip: { backgroundColor: '#1a1a1a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#2a2a2a' },
  equipChipText: { color: '#888', fontSize: 11 },
  description: { color: '#aaa', fontSize: 15, lineHeight: 23, marginBottom: 10 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  authorText: { color: '#555', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  exerciseList: { marginBottom: 24 },
  addBtn: {
    backgroundColor: '#6C63FF', borderRadius: 14, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 10,
  },
  addBtnSuccess: { backgroundColor: '#22c55e' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  addHint: { color: '#555', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: '#555', fontSize: 16 },
  browseBtn: { marginTop: 4 },
  browseBtnText: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },
});
