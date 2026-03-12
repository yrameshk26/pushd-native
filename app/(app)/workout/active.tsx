import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../../../src/store/workout';
import { useWorkoutTimer, formatDuration } from '../../../src/hooks/useWorkoutTimer';
import { ExercisePicker } from '../../../src/components/ExercisePicker';
import { Exercise } from '../../../src/types';

export default function ActiveWorkoutScreen() {
  const { active, elapsedSeconds, addExercise, removeExercise, addSet, removeSet, updateSet, toggleSetComplete, finishWorkout, discardWorkout } = useWorkoutStore();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useWorkoutTimer();

  if (!active) {
    router.replace('/(app)/workout');
    return null;
  }

  const handleAddExercise = (ex: Exercise) => {
    addExercise({
      exerciseId: ex.id,
      exerciseName: ex.name,
      order: active.exercises.length,
      sets: [],
    });
  };

  const handleFinish = () => {
    Alert.alert('Finish Workout', 'Save and finish this workout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish', style: 'default',
        onPress: async () => {
          setFinishing(true);
          try {
            await finishWorkout();
            router.replace('/(app)/dashboard');
          } catch {
            Alert.alert('Error', 'Could not save workout. Please try again.');
          } finally {
            setFinishing(false);
          }
        },
      },
    ]);
  };

  const handleDiscard = () => {
    Alert.alert('Discard Workout', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { discardWorkout(); router.replace('/(app)/workout'); } },
    ]);
  };

  const completedSets = active.exercises.reduce((acc, e) => acc + e.sets.filter((s) => s.isCompleted).length, 0);
  const totalSets = active.exercises.reduce((acc, e) => acc + e.sets.length, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{active.title}</Text>
          <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
            <Ionicons name="trash-outline" size={18} color="#ff4444" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} disabled={finishing}>
            {finishing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.finishText}>Finish</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : '0%' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {active.exercises.map((exercise) => (
          <View key={exercise.localId} style={styles.exerciseCard}>
            {/* Exercise header */}
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
              <TouchableOpacity onPress={() => removeExercise(exercise.localId)}>
                <Ionicons name="close-circle" size={20} color="#444" />
              </TouchableOpacity>
            </View>

            {/* Set headers */}
            <View style={styles.setHeader}>
              <Text style={[styles.setCol, { flex: 0.5 }]}>SET</Text>
              <Text style={styles.setCol}>KG</Text>
              <Text style={styles.setCol}>REPS</Text>
              <Text style={[styles.setCol, { flex: 0.5 }]}></Text>
            </View>

            {/* Sets */}
            {exercise.sets.map((s, i) => (
              <View key={i} style={[styles.setRow, s.isCompleted && styles.setRowDone]}>
                <Text style={[styles.setCol, { flex: 0.5, color: '#666' }]}>{i + 1}</Text>
                <TextInput
                  style={styles.setInput}
                  keyboardType="numeric"
                  placeholder="–"
                  placeholderTextColor="#444"
                  value={s.weight !== undefined ? String(s.weight) : ''}
                  onChangeText={(v) => updateSet(exercise.localId, i, { weight: v ? parseFloat(v) : undefined })}
                />
                <TextInput
                  style={styles.setInput}
                  keyboardType="numeric"
                  placeholder="–"
                  placeholderTextColor="#444"
                  value={s.reps !== undefined ? String(s.reps) : ''}
                  onChangeText={(v) => updateSet(exercise.localId, i, { reps: v ? parseInt(v) : undefined })}
                />
                <TouchableOpacity
                  style={[styles.checkBtn, s.isCompleted && styles.checkBtnDone]}
                  onPress={() => toggleSetComplete(exercise.localId, i)}
                >
                  <Ionicons name="checkmark" size={16} color={s.isCompleted ? '#fff' : '#444'} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add set */}
            <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(exercise.localId)}>
              <Ionicons name="add" size={16} color="#6C63FF" />
              <Text style={styles.addSetText}>Add Set</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Add exercise */}
        <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setPickerVisible(true)}>
          <Ionicons name="add-circle-outline" size={20} color="#6C63FF" />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      <ExercisePicker
        visible={pickerVisible}
        onSelect={handleAddExercise}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  timer: { color: '#6C63FF', fontSize: 14, fontWeight: '600', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  discardBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: '#1a1a1a',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ff4444',
  },
  finishBtn: {
    backgroundColor: '#6C63FF', borderRadius: 10,
    paddingHorizontal: 18, height: 38, justifyContent: 'center', alignItems: 'center',
  },
  finishText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  progressBar: { height: 3, backgroundColor: '#1a1a1a', marginHorizontal: 20, borderRadius: 2, marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#6C63FF', borderRadius: 2 },
  content: { padding: 16, paddingBottom: 40 },
  exerciseCard: {
    backgroundColor: '#111', borderRadius: 14, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#1e1e1e',
  },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  exerciseName: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  setHeader: { flexDirection: 'row', marginBottom: 6 },
  setCol: { flex: 1, color: '#555', fontSize: 11, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5 },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderRadius: 8, paddingVertical: 4 },
  setRowDone: { backgroundColor: '#0d1a0d' },
  setInput: {
    flex: 1, color: '#fff', fontSize: 16, fontWeight: '600',
    textAlign: 'center', paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#1a1a1a',  marginHorizontal: 3,
  },
  checkBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#1a1a1a',
    justifyContent: 'center', alignItems: 'center', flex: 0.5,
  },
  checkBtnDone: { backgroundColor: '#22c55e' },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6, marginTop: 4 },
  addSetText: { color: '#6C63FF', fontWeight: '600', fontSize: 14 },
  addExerciseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14, borderWidth: 1,
    borderColor: '#6C63FF', borderStyle: 'dashed',
  },
  addExerciseText: { color: '#6C63FF', fontWeight: '600', fontSize: 15 },
});
