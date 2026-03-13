import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActiveWorkout } from '../types';

interface Props {
  visible: boolean;
  workout: ActiveWorkout | null;
  elapsedSeconds: number;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  isSaving: boolean;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

function calcVolume(workout: ActiveWorkout): number {
  return workout.exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((setTotal, s) => {
      if (!s.isCompleted) return setTotal;
      return setTotal + (s.weight ?? 0) * (s.reps ?? 0);
    }, 0);
  }, 0);
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}kg`;
}

const MOTIVATIONAL_MESSAGES = [
  'You crushed it! Every rep counts.',
  'Consistency is the key to greatness.',
  'Another workout in the books. Keep going!',
  'Your future self will thank you.',
  'Progress over perfection. Well done!',
];

function getMotivationalMessage(seed: number): string {
  return MOTIVATIONAL_MESSAGES[seed % MOTIVATIONAL_MESSAGES.length];
}

export function WorkoutSummaryModal({ visible, workout, elapsedSeconds, onSave, onDiscard, isSaving }: Props) {
  if (!workout) return null;

  const totalSets = workout.exercises.reduce((acc, e) => acc + e.sets.filter((s) => s.isCompleted).length, 0);
  const volume = calcVolume(workout);
  const message = getMotivationalMessage(workout.exercises.length + totalSets);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Trophy icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="trophy" size={48} color="#FFD700" />
        </View>

        <Text style={styles.heading}>Great work!</Text>
        <Text style={styles.message}>{message}</Text>

        {/* Workout title */}
        <Text style={styles.workoutTitle}>{workout.title}</Text>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Ionicons name="time-outline" size={22} color="#3B82F6" />
            <Text style={styles.statValue}>{formatDuration(elapsedSeconds)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Ionicons name="barbell-outline" size={22} color="#3B82F6" />
            <Text style={styles.statValue}>{formatVolume(volume)}</Text>
            <Text style={styles.statLabel}>Volume</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Ionicons name="layers-outline" size={22} color="#3B82F6" />
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>Sets</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Ionicons name="body-outline" size={22} color="#3B82F6" />
            <Text style={styles.statValue}>{workout.exercises.length}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
        </View>

        {/* Exercise list summary */}
        <View style={styles.exerciseList}>
          {workout.exercises.map((ex) => {
            const completedSets = ex.sets.filter((s) => s.isCompleted).length;
            return (
              <View key={ex.localId} style={styles.exerciseRow}>
                <Text style={styles.exerciseName} numberOfLines={1}>{ex.exerciseName}</Text>
                <Text style={styles.exerciseSets}>{completedSets} sets</Text>
              </View>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Workout</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.discardBtn} onPress={onDiscard} disabled={isSaving}>
            <Text style={styles.discardBtnText}>Discard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#060C1B',
    alignItems: 'center', padding: 32, paddingTop: 60,
  },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#1a1500', justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: '#3a3000',
  },
  heading: { color: '#fff', fontSize: 30, fontWeight: '800', fontFamily: 'BarlowCondensed-Bold', marginBottom: 8 },
  message: { color: '#718FAF', fontSize: 15, textAlign: 'center', marginBottom: 20, lineHeight: 22, fontFamily: 'DMSans-Regular' },
  workoutTitle: { color: '#3B82F6', fontSize: 18, fontWeight: '700', fontFamily: 'BarlowCondensed-Bold', marginBottom: 28 },
  statsGrid: {
    flexDirection: 'row', width: '100%',
    backgroundColor: '#0B1326', borderRadius: 16,
    borderWidth: 1, borderColor: '#162540',
    marginBottom: 12, overflow: 'hidden',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 18, gap: 4 },
  statDivider: { width: 1, backgroundColor: '#162540', marginVertical: 14 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '800', fontFamily: 'BarlowCondensed-ExtraBold' },
  statLabel: { color: '#718FAF', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'BarlowCondensed-SemiBold' },
  exerciseList: {
    width: '100%', backgroundColor: '#0B1326', borderRadius: 14,
    borderWidth: 1, borderColor: '#162540', marginBottom: 32, overflow: 'hidden',
  },
  exerciseRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#162540',
  },
  exerciseName: { color: '#A8BDD4', fontSize: 14, flex: 1, fontFamily: 'DMSans-Regular' },
  exerciseSets: { color: '#718FAF', fontSize: 13, fontFamily: 'DMSans-Regular' },
  actions: { width: '100%', gap: 12 },
  saveBtn: {
    backgroundColor: '#3B82F6', borderRadius: 14,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  discardBtn: {
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  discardBtnText: { color: '#4A6080', fontSize: 15, fontWeight: '500', fontFamily: 'DMSans-Medium' },
});
