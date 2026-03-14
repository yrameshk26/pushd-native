import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkoutStore } from '../../../src/store/workout';
import { useWorkoutTimer, formatDuration } from '../../../src/hooks/useWorkoutTimer';
import { ExercisePicker } from '../../../src/components/ExercisePicker';
import { RestTimer } from '../../../src/components/RestTimer';
import { WorkoutSummaryModal } from '../../../src/components/WorkoutSummaryModal';
import { ExerciseSubstitutionSheet } from '../../../src/components/ExerciseSubstitutionSheet';
import { NLWorkoutInput, ParsedExercise } from '../../../src/components/NLWorkoutInput';
import { FormAnalysisSheet } from '../../../src/components/FormAnalysisSheet';
import { ExerciseDetailSheet } from '../../../src/components/ExerciseDetailSheet';
import { Exercise } from '../../../src/types';
import { api } from '../../../src/api/client';

// Weight unit helpers
const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number) => Math.round(lbs / 2.20462 * 100) / 100;

function useWeightUnit() {
  const [unit, setUnit] = useState<'KG' | 'LBS'>('KG');
  useEffect(() => {
    api.get('/api/users/me').then(({ data }) => {
      const u = data?.data ?? data;
      if (u?.weightUnit === 'LBS') setUnit('LBS');
    }).catch(() => {});
  }, []);
  return unit;
}

const DEFAULT_REST_SECONDS = 90;

export default function ActiveWorkoutScreen() {
  const queryClient = useQueryClient();
  const {
    active, elapsedSeconds, addExercise, removeExercise,
    reorderExercise, replaceExercise,
    addSet, removeSet, updateSet, toggleSetComplete,
    finishWorkout, discardWorkout,
  } = useWorkoutStore();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Substitution sheet state
  const [subSheetVisible, setSubSheetVisible] = useState(false);
  const [subTarget, setSubTarget] = useState<{ localId: string; exerciseId: string; exerciseName: string } | null>(null);

  // NL input modal state
  const [nlVisible, setNlVisible] = useState(false);

  // Form analysis sheet state
  const [formCheckVisible, setFormCheckVisible] = useState(false);

  // Exercise detail sheet state
  const [detailExerciseId, setDetailExerciseId] = useState<string | null>(null);

  const weightUnit = useWeightUnit();
  const isLbs = weightUnit === 'LBS';

  // Rest timer state
  const [restVisible, setRestVisible] = useState(false);
  const [restRemaining, setRestRemaining] = useState(DEFAULT_REST_SECONDS);
  const [restDuration, setRestDuration] = useState(DEFAULT_REST_SECONDS);
  const [restIntervalId, setRestIntervalId] = useState<ReturnType<typeof setInterval> | null>(null);

  useWorkoutTimer();

  useEffect(() => {
    if (!active) {
      router.replace('/(screens)/workout');
    }
  }, [active]);

  const startRestTimer = useCallback((durationSeconds: number) => {
    if (restIntervalId) clearInterval(restIntervalId);
    setRestDuration(durationSeconds);
    setRestRemaining(durationSeconds);
    setRestVisible(true);

    const id = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setRestVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setRestIntervalId(id);
  }, [restIntervalId]);

  const handleSkipRest = useCallback(() => {
    if (restIntervalId) clearInterval(restIntervalId);
    setRestVisible(false);
  }, [restIntervalId]);

  const handleChangeDuration = useCallback((seconds: number) => {
    startRestTimer(seconds);
  }, [startRestTimer]);

  const handleToggleSetComplete = useCallback(
    (localId: string, index: number) => {
      const exercise = active?.exercises.find((e) => e.localId === localId);
      if (!exercise) return;
      const set = exercise.sets[index];
      const wasCompleted = set.isCompleted;
      toggleSetComplete(localId, index);
      // Start rest timer only when completing (not un-completing) a set
      if (!wasCompleted) {
        startRestTimer(restDuration);
      }
    },
    [active, toggleSetComplete, startRestTimer, restDuration],
  );

  const handleOpenSubSheet = useCallback(
    (localId: string, exerciseId: string, exerciseName: string) => {
      setSubTarget({ localId, exerciseId, exerciseName });
      setSubSheetVisible(true);
    },
    [],
  );

  const handleSubSelect = useCallback(
    (exercise: { exerciseId: string; exerciseName: string }) => {
      if (!subTarget) return;
      replaceExercise(subTarget.localId, exercise);
      setSubSheetVisible(false);
      setSubTarget(null);
    },
    [subTarget, replaceExercise],
  );

  const handleNLParsed = useCallback(
    (exercises: ParsedExercise[]) => {
      if (!active) return;
      exercises.forEach((parsed, i) => {
        addExercise({
          exerciseId: parsed.exerciseId ?? parsed.exerciseName.toLowerCase().replace(/\s+/g, '-'),
          exerciseName: parsed.exerciseName,
          order: active.exercises.length + i,
          thumbnailUrl: parsed.thumbnailUrl ?? null,
          gifUrl: parsed.gifUrl ?? null,
          sets: Array.from({ length: parsed.sets }, (_, si) => ({
            order: si,
            type: 'NORMAL' as const,
            isCompleted: false,
            weight: parsed.weight > 0 ? parsed.weight : undefined,
            reps: parsed.reps > 0 ? parsed.reps : undefined,
          })),
        } as Parameters<typeof addExercise>[0]);
      });
    },
    [active, addExercise],
  );

  if (!active) return null;

  const handleAddExercise = (ex: Exercise) => {
    addExercise({
      exerciseId: ex.id,
      exerciseName: ex.name,
      order: active.exercises.length,
      thumbnailUrl: ex.thumbnailUrl ?? null,
      gifUrl: ex.gifUrl ?? null,
    });
  };

  const handleFinish = () => {
    setSummaryVisible(true);
  };

  const handleSaveWorkout = async () => {
    setIsSaving(true);
    try {
      await finishWorkout();
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      setSummaryVisible(false);
      router.replace('/(screens)/workout/history');
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Could not save workout. Please try again.');
      } else {
        Alert.alert('Error', 'Could not save workout. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    const doDiscard = () => {
      setSummaryVisible(false);
      discardWorkout();
      router.replace('/(screens)/workout');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Discard workout? This cannot be undone.')) doDiscard();
      return;
    }

    Alert.alert('Discard Workout', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: doDiscard },
    ]);
  };

  const completedSets = active.exercises.reduce((acc, e) => acc + e.sets.filter((s) => s.isCompleted).length, 0);
  const totalSets = active.exercises.reduce((acc, e) => acc + e.sets.length, 0);

  const restMinutes = Math.floor(restDuration / 60);
  const restSecs = restDuration % 60;
  const restLabel = restSecs === 0 ? `Rest: ${restMinutes}m` : `Rest: ${restMinutes}:${String(restSecs).padStart(2, '0')}`;

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
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishText}>Finish</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : '0%' }]} />
      </View>

      {/* Rest badge */}
      <TouchableOpacity
        style={styles.restBadge}
        onPress={() => startRestTimer(restDuration)}
      >
        <Ionicons name="timer-outline" size={14} color="#3B82F6" />
        <Text style={styles.restBadgeText}>{restLabel}</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        {active.exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="barbell-outline" size={36} color="#4a5568" />
            </View>
            <Text style={styles.emptyTitle}>No exercises yet</Text>
            <Text style={styles.emptySubtitle}>Tap "Add Exercise" to get started</Text>
          </View>
        ) : (
          active.exercises.map((exercise, exIndex) => (
            <View key={exercise.localId} style={styles.exerciseCard}>
              {/* Exercise header */}
              <View style={styles.exerciseHeader}>
                {/* Thumbnail */}
                {(exercise.thumbnailUrl ?? exercise.gifUrl) ? (
                  <Image
                    source={{ uri: (exercise.thumbnailUrl ?? exercise.gifUrl)! }}
                    style={styles.exerciseThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.exerciseThumbFallback}>
                    <Ionicons name="barbell-outline" size={18} color="#3B82F6" />
                  </View>
                )}
                <Text style={styles.exerciseName} numberOfLines={1}>{exercise.exerciseName}</Text>
                <View style={styles.exerciseActions}>
                  {/* Info */}
                  {exercise.exerciseId && !exercise.exerciseId.startsWith('local-') && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => setDetailExerciseId(exercise.exerciseId)}
                    >
                      <Ionicons name="information-circle-outline" size={16} color="#718FAF" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionBtn, exIndex === 0 && styles.actionBtnDisabled]}
                    onPress={() => reorderExercise(exercise.localId, 'up')}
                    disabled={exIndex === 0}
                  >
                    <Ionicons name="chevron-up" size={16} color={exIndex === 0 ? '#162540' : '#718FAF'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, exIndex === active.exercises.length - 1 && styles.actionBtnDisabled]}
                    onPress={() => reorderExercise(exercise.localId, 'down')}
                    disabled={exIndex === active.exercises.length - 1}
                  >
                    <Ionicons name="chevron-down" size={16} color={exIndex === active.exercises.length - 1 ? '#162540' : '#718FAF'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleOpenSubSheet(exercise.localId, exercise.exerciseId, exercise.exerciseName)}
                  >
                    <Ionicons name="swap-horizontal-outline" size={16} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => removeExercise(exercise.localId)}
                  >
                    <Ionicons name="close-circle" size={18} color="#4A6080" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Set headers */}
              <View style={styles.setHeader}>
                <Text style={[styles.setCol, { flex: 0.5 }]}>SET</Text>
                <Text style={styles.setCol}>{weightUnit}</Text>
                <Text style={styles.setCol}>REPS</Text>
                <Text style={[styles.setCol, { flex: 0.5 }]}></Text>
              </View>

              {/* Sets */}
              {exercise.sets.map((s, i) => (
                <View key={i} style={[styles.setRow, s.isCompleted && styles.setRowDone]}>
                  <Text style={[styles.setCol, { flex: 0.5, color: '#718FAF' }]}>{i + 1}</Text>
                  <TextInput
                    style={styles.setInput}
                    keyboardType="numeric"
                    placeholder="–"
                    placeholderTextColor="#4A6080"
                    value={s.weight !== undefined ? String(isLbs ? kgToLbs(s.weight) : s.weight) : ''}
                    onChangeText={(v) => {
                      const num = v ? parseFloat(v) : undefined;
                      updateSet(exercise.localId, i, { weight: num !== undefined && isLbs ? lbsToKg(num) : num });
                    }}
                  />
                  <TextInput
                    style={styles.setInput}
                    keyboardType="numeric"
                    placeholder="–"
                    placeholderTextColor="#4A6080"
                    value={s.reps !== undefined ? String(s.reps) : ''}
                    onChangeText={(v) => updateSet(exercise.localId, i, { reps: v ? parseInt(v) : undefined })}
                  />
                  <TouchableOpacity
                    style={[styles.checkBtn, s.isCompleted && styles.checkBtnDone]}
                    onPress={() => handleToggleSetComplete(exercise.localId, i)}
                  >
                    <Ionicons name="checkmark" size={16} color={s.isCompleted ? '#fff' : '#4A6080'} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add set */}
              <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(exercise.localId)}>
                <Ionicons name="add" size={16} color="#3B82F6" />
                <Text style={styles.addSetText}>Add Set</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Bottom action area — always visible */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.bottomBar}
      >
        {/* AI parse input */}
        <TouchableOpacity style={styles.nlInputRow} onPress={() => setNlVisible(true)} activeOpacity={0.7}>
          <Ionicons name="flash-outline" size={16} color="#3B82F6" />
          <Text style={styles.nlInputPlaceholder}>e.g. 3×10 bench at 80kg</Text>
        </TouchableOpacity>

        {/* Add Exercise */}
        <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setPickerVisible(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      <ExercisePicker
        visible={pickerVisible}
        onSelect={handleAddExercise}
        onClose={() => setPickerVisible(false)}
      />

      <RestTimer
        visible={restVisible}
        remaining={restRemaining}
        totalDuration={restDuration}
        onSkip={handleSkipRest}
        onChangeDuration={handleChangeDuration}
      />

      <WorkoutSummaryModal
        visible={summaryVisible}
        workout={active}
        elapsedSeconds={elapsedSeconds}
        onSave={handleSaveWorkout}
        onDiscard={handleDiscard}
        isSaving={isSaving}
      />

      {subTarget && (
        <ExerciseSubstitutionSheet
          visible={subSheetVisible}
          exerciseId={subTarget.exerciseId}
          exerciseName={subTarget.exerciseName}
          onSelect={handleSubSelect}
          onClose={() => { setSubSheetVisible(false); setSubTarget(null); }}
        />
      )}

      {nlVisible && (
        <NLWorkoutInput
          onParsed={handleNLParsed}
          onClose={() => setNlVisible(false)}
        />
      )}

      <FormAnalysisSheet
        visible={formCheckVisible}
        exerciseName={
          active.exercises.length > 0
            ? active.exercises[active.exercises.length - 1].exerciseName
            : 'Exercise'
        }
        onClose={() => setFormCheckVisible(false)}
      />

      <ExerciseDetailSheet
        exerciseId={detailExerciseId}
        onClose={() => setDetailExerciseId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  title: { color: '#fff', fontSize: 18, fontFamily: 'BarlowCondensed-Bold' },
  timer: { color: '#3B82F6', fontSize: 14, fontFamily: 'DMSans-SemiBold', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  discardBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: '#0B1326',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ff4444',
  },
  finishBtn: {
    backgroundColor: '#3B82F6', borderRadius: 10,
    paddingHorizontal: 18, height: 38, justifyContent: 'center', alignItems: 'center',
  },
  finishText: { color: '#fff', fontFamily: 'DMSans-Bold', fontSize: 14 },
  progressBar: { height: 3, backgroundColor: '#0B1326', marginHorizontal: 20, borderRadius: 2, marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 2 },
  restBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: '#111D36', borderRadius: 20, borderWidth: 1, borderColor: '#162540',
    marginBottom: 8,
  },
  restBadgeText: { color: '#3B82F6', fontSize: 12, fontFamily: 'DMSans-SemiBold' },
  content: { padding: 16, paddingBottom: 16, flexGrow: 1 },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, gap: 12,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#0B1326',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: '#fff', fontSize: 20, fontFamily: 'BarlowCondensed-Bold' },
  emptySubtitle: { color: '#718FAF', fontSize: 14, textAlign: 'center', fontFamily: 'DMSans-Regular' },
  bottomBar: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: '#0B1326',
    backgroundColor: '#060C1B', gap: 10,
  },
  nlInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#111D36', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#162540',
  },
  nlInputPlaceholder: { color: '#4A6080', fontSize: 14, flex: 1, fontFamily: 'DMSans-Regular' },
  exerciseCard: {
    backgroundColor: '#0B1326', borderRadius: 14, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#162540',
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  exerciseThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#0B1326', flexShrink: 0 },
  exerciseThumbFallback: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: '#111D36',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  exerciseName: { color: '#fff', fontSize: 15, fontFamily: 'DMSans-Bold', flex: 1 },
  exerciseActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtn: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#0B1326',
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.4 },
  setHeader: { flexDirection: 'row', marginBottom: 6 },
  setCol: { flex: 1, color: '#4A6080', fontSize: 11, fontFamily: 'DMSans-SemiBold', textAlign: 'center', letterSpacing: 0.5 },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderRadius: 8, paddingVertical: 4 },
  setRowDone: { backgroundColor: '#0d1a0d' },
  setInput: {
    flex: 1, color: '#fff', fontSize: 16, fontFamily: 'DMSans-SemiBold',
    textAlign: 'center', paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#0B1326', marginHorizontal: 3,
  },
  checkBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#0B1326',
    justifyContent: 'center', alignItems: 'center', flex: 0.5,
  },
  checkBtnDone: { backgroundColor: '#22c55e' },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6, marginTop: 4 },
  addSetText: { color: '#3B82F6', fontFamily: 'DMSans-SemiBold', fontSize: 14 },
  addExerciseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#111D36', borderWidth: 1, borderColor: '#162540',
  },
  addExerciseText: { color: '#fff', fontFamily: 'DMSans-SemiBold', fontSize: 15 },
});
