import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type Focus = 'Full Body' | 'Push' | 'Pull' | 'Legs' | 'Upper Body' | 'Shoulders & Arms' | 'Core';
type Goal  = 'muscle' | 'strength' | 'fat_loss' | 'general';
type Level = 'beginner' | 'intermediate' | 'advanced';
type Duration = 30 | 45 | 60 | 75;

interface RoutineExercise {
  exercise: { name: string; primaryMuscle: string };
  targetSets: number;
  targetReps: number;
  notes: string | null;
}

interface GeneratedRoutine {
  id: string;
  name: string;
  description: string | null;
  exercises: RoutineExercise[];
}

// ─── Options ──────────────────────────────────────────────────────────────────

const FOCUS_OPTIONS: { value: Focus; emoji: string }[] = [
  { value: 'Full Body',        emoji: '💪' },
  { value: 'Push',             emoji: '🫸' },
  { value: 'Pull',             emoji: '🫷' },
  { value: 'Legs',             emoji: '🦵' },
  { value: 'Upper Body',       emoji: '🏋️' },
  { value: 'Shoulders & Arms', emoji: '🦾' },
  { value: 'Core',             emoji: '🎯' },
];

const GOAL_OPTIONS: { value: Goal; label: string; sub: string; icon: string }[] = [
  { value: 'muscle',   label: 'Build Muscle',    sub: 'Hypertrophy volume', icon: 'barbell-outline' },
  { value: 'strength', label: 'Get Stronger',    sub: 'Heavy compounds',    icon: 'flash-outline' },
  { value: 'fat_loss', label: 'Burn Fat',        sub: 'High reps, less rest', icon: 'flame-outline' },
  { value: 'general',  label: 'General Fitness', sub: 'Balanced training',  icon: 'fitness-outline' },
];

const LEVEL_OPTIONS: { value: Level; label: string; sub: string }[] = [
  { value: 'beginner',     label: 'Beginner',     sub: '< 1 year training' },
  { value: 'intermediate', label: 'Intermediate', sub: '1–3 years training' },
  { value: 'advanced',     label: 'Advanced',     sub: '3+ years training' },
];

const DURATION_OPTIONS: { value: Duration; label: string }[] = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 75, label: '75+ min' },
];

const EQUIPMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'BARBELL',         label: 'Barbell' },
  { value: 'DUMBBELL',        label: 'Dumbbell' },
  { value: 'CABLE',           label: 'Cable' },
  { value: 'MACHINE',         label: 'Machine' },
  { value: 'BODYWEIGHT',      label: 'Bodyweight' },
  { value: 'KETTLEBELL',      label: 'Kettlebell' },
  { value: 'RESISTANCE_BAND', label: 'Bands' },
  { value: 'SMITH_MACHINE',   label: 'Smith Machine' },
];

const LOADING_TIPS = [
  'Analysing your goals…',
  'Selecting best exercises…',
  'Balancing sets & reps…',
  'Building your routine…',
];

const TOTAL_STEPS = 4;

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BuildRoutineScreen() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [routine, setRoutine] = useState<GeneratedRoutine | null>(null);
  const [error, setError] = useState<string | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (generating) {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [generating, spinAnim]);

  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => setTipIndex((i) => (i + 1) % LOADING_TIPS.length), 2200);
    return () => clearInterval(t);
  }, [generating]);

  function toggleEquipment(value: string) {
    setEquipment((prev) => prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value]);
  }

  async function handleGenerate() {
    if (!focus || !goal || !level || !duration || equipment.length === 0) {
      setError('Please answer all questions first.');
      return;
    }
    setError(null);
    setGenerating(true);
    setTipIndex(0);
    try {
      const { data } = await api.post('/api/ai/build-routine', {
        focus, goal, level, durationMins: duration, equipment,
        notes: notes.trim() || undefined,
      });
      setRoutine(data.routine);
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      setStep(5);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  const canStep1 = !!focus && !!goal;
  const canStep2 = !!level && !!duration;
  const canStep3 = equipment.length > 0;
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step <= 1 || step === 5 ? router.back() : setStep((s) => s - 1)} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>✨ Build a Routine</Text>
          {step < 5 && <Text style={styles.headerSub}>Step {step} of {TOTAL_STEPS}</Text>}
        </View>
        {step < 5 ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 52 }} />
        )}
      </View>

      {/* Progress dots */}
      {step < 5 && (
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={[styles.progressDot, i < step && styles.progressDotActive]} />
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Step 1: Focus + Goal ── */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>What are you training?</Text>
            <Text style={styles.stepSub}>Pick a focus area for this routine.</Text>
            <View style={styles.grid2}>
              {FOCUS_OPTIONS.map(({ value, emoji }) => (
                <TouchableOpacity key={value} style={[styles.chipCard, focus === value && styles.chipCardActive]} onPress={() => setFocus(value)}>
                  <Text style={styles.chipEmoji}>{emoji}</Text>
                  <Text style={[styles.chipLabel, focus === value && styles.chipLabelActive]}>{value}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.stepTitle, { marginTop: 24 }]}>Primary goal</Text>
            <Text style={styles.stepSub}>What do you want from this session?</Text>
            <View style={styles.grid2}>
              {GOAL_OPTIONS.map(({ value, label, sub, icon }) => (
                <TouchableOpacity key={value} style={[styles.goalCard, goal === value && styles.goalCardActive]} onPress={() => setGoal(value)}>
                  <Ionicons name={icon as any} size={20} color={goal === value ? '#3B82F6' : '#718FAF'} />
                  <Text style={[styles.goalLabel, goal === value && styles.goalLabelActive]}>{label}</Text>
                  <Text style={styles.goalSub}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.continueBtn, !canStep1 && styles.continueBtnDisabled]} onPress={() => canStep1 && setStep(2)} disabled={!canStep1}>
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: Level + Duration ── */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Your experience level</Text>
            <Text style={styles.stepSub}>{"We'll tailor exercise difficulty to match."}</Text>
            {LEVEL_OPTIONS.map(({ value, label, sub }) => (
              <TouchableOpacity key={value} style={[styles.rowCard, level === value && styles.rowCardActive]} onPress={() => setLevel(value)}>
                <View>
                  <Text style={[styles.rowCardLabel, level === value && styles.rowCardLabelActive]}>{label}</Text>
                  <Text style={styles.rowCardSub}>{sub}</Text>
                </View>
                {level === value && <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />}
              </TouchableOpacity>
            ))}

            <Text style={[styles.stepTitle, { marginTop: 24 }]}>How long do you have?</Text>
            <Text style={styles.stepSub}>This sets the number of exercises.</Text>
            <View style={styles.grid4}>
              {DURATION_OPTIONS.map(({ value, label }) => (
                <TouchableOpacity key={value} style={[styles.durationBtn, duration === value && styles.durationBtnActive]} onPress={() => setDuration(value)}>
                  <Text style={[styles.durationBtnText, duration === value && styles.durationBtnTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.continueBtn, !canStep2 && styles.continueBtnDisabled]} onPress={() => canStep2 && setStep(3)} disabled={!canStep2}>
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 3: Equipment ── */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Available equipment</Text>
            <Text style={styles.stepSub}>Select everything you have access to.</Text>
            <TouchableOpacity
              style={[styles.pill, styles.fullGymPill, equipment.length === EQUIPMENT_OPTIONS.length && styles.pillActive]}
              onPress={() => setEquipment(equipment.length === EQUIPMENT_OPTIONS.length ? [] : EQUIPMENT_OPTIONS.map((e) => e.value))}
            >
              <Ionicons name="fitness" size={14} color={equipment.length === EQUIPMENT_OPTIONS.length ? '#3B82F6' : '#718FAF'} />
              <Text style={[styles.pillText, equipment.length === EQUIPMENT_OPTIONS.length && styles.pillTextActive]}>
                Everything (Full Gym)
              </Text>
            </TouchableOpacity>
            <View style={styles.pillsRow}>
              {EQUIPMENT_OPTIONS.map(({ value, label }) => (
                <TouchableOpacity key={value} style={[styles.pill, equipment.includes(value) && styles.pillActive]} onPress={() => toggleEquipment(value)}>
                  <Text style={[styles.pillText, equipment.includes(value) && styles.pillTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.continueBtn, !canStep3 && styles.continueBtnDisabled, { marginTop: 32 }]} onPress={() => canStep3 && setStep(4)} disabled={!canStep3}>
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 4: Notes + Generate ── */}
        {step === 4 && (
          <View>
            <Text style={styles.stepTitle}>Anything specific?</Text>
            <Text style={styles.stepSub}>Injuries, preferences, or must-have exercises. Optional.</Text>

            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. avoid squats due to knee pain, include Romanian deadlifts..."
              placeholderTextColor="#4A6080"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={400}
            />
            <Text style={styles.charCount}>{notes.length}/400</Text>

            <View style={styles.summaryCard}>
              {[
                { label: 'Focus', value: focus },
                { label: 'Goal', value: goal?.replace('_', ' ') },
                { label: 'Level', value: level },
                { label: 'Duration', value: `${duration} min` },
                { label: 'Equipment', value: equipment.map((e) => e.charAt(0) + e.slice(1).toLowerCase()).join(', ') },
              ].map(({ label, value }) => (
                <View key={label} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{label}</Text>
                  <Text style={styles.summaryValue} numberOfLines={2}>{value}</Text>
                </View>
              ))}
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity style={[styles.generateBtn, generating && styles.generateBtnDisabled]} onPress={handleGenerate} disabled={generating}>
              <View style={styles.generatingRow}>
                {generating ? (
                  <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <Ionicons name="sparkles" size={18} color="#fff" />
                  </Animated.View>
                ) : (
                  <Ionicons name="sparkles" size={18} color="#fff" />
                )}
                <Text style={styles.generateBtnText}>
                  {generating ? LOADING_TIPS[tipIndex] : 'Build My Routine'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 5: Result ── */}
        {step === 5 && routine && (
          <View>
            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
              <Text style={styles.successTitle}>Routine ready!</Text>
            </View>
            {routine.description ? <Text style={styles.successDesc}>{routine.description}</Text> : null}

            <View style={styles.routineCard}>
              <View style={styles.routineCardHeader}>
                <Ionicons name="list" size={16} color="#3B82F6" />
                <Text style={styles.routineCardName}>{routine.name}</Text>
                <Text style={styles.exerciseCount}>{routine.exercises.length} exercises</Text>
              </View>
              {routine.exercises.map((re, i) => (
                <View key={i} style={[styles.exerciseRow, i > 0 && styles.exerciseRowBorder]}>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{re.exercise.name}</Text>
                    {re.notes ? <Text style={styles.exerciseNotes}>{re.notes}</Text> : null}
                  </View>
                  <Text style={styles.exerciseSets}>{re.targetSets}×{re.targetReps}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.viewBtn} onPress={() => router.replace(`/(screens)/routines/${routine.id}` as never)}>
              <Text style={styles.viewBtnText}>View Routine</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.regenBtn} onPress={() => { setRoutine(null); setStep(4); setError(null); }}>
              <Ionicons name="refresh" size={16} color="#718FAF" />
              <Text style={styles.regenBtnText}>Regenerate</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#0B1326' },
  backBtn: { width: 36 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'BarlowCondensed-Bold' },
  headerSub: { color: '#718FAF', fontSize: 11, fontFamily: 'DMSans-Regular', marginTop: 1 },
  cancelBtn: { width: 52, alignItems: 'flex-end' },
  cancelText: { color: '#718FAF', fontSize: 13, fontFamily: 'DMSans-Regular' },

  progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 12 },
  progressDot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#162540' },
  progressDotActive: { backgroundColor: '#3B82F6' },

  scrollContent: { padding: 16, paddingBottom: 48 },

  stepTitle: { color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'BarlowCondensed-Bold', marginBottom: 4, marginTop: 8 },
  stepSub: { color: '#718FAF', fontSize: 13, fontFamily: 'DMSans-Regular', marginBottom: 16 },

  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chipCard: {
    width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0B1326', borderRadius: 12, borderWidth: 1, borderColor: '#162540', padding: 12,
  },
  chipCardActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)' },
  chipEmoji: { fontSize: 16 },
  chipLabel: { color: '#718FAF', fontSize: 13, fontWeight: '500', fontFamily: 'DMSans-Medium', flex: 1 },
  chipLabelActive: { color: '#3B82F6' },

  goalCard: {
    width: '47%', backgroundColor: '#0B1326', borderRadius: 12, borderWidth: 1,
    borderColor: '#162540', padding: 12, gap: 4,
  },
  goalCardActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.08)' },
  goalLabel: { color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: 'DMSans-SemiBold', marginTop: 4 },
  goalLabelActive: { color: '#3B82F6' },
  goalSub: { color: '#718FAF', fontSize: 11, fontFamily: 'DMSans-Regular' },

  rowCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0B1326', borderRadius: 12, borderWidth: 1, borderColor: '#162540',
    padding: 14, marginBottom: 10,
  },
  rowCardActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.08)' },
  rowCardLabel: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  rowCardLabelActive: { color: '#3B82F6' },
  rowCardSub: { color: '#718FAF', fontSize: 12, fontFamily: 'DMSans-Regular', marginTop: 2 },

  grid4: { flexDirection: 'row', gap: 8, marginTop: 4 },
  durationBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#0B1326', borderWidth: 1, borderColor: '#162540',
  },
  durationBtnActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)' },
  durationBtnText: { color: '#718FAF', fontSize: 12, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  durationBtnTextActive: { color: '#3B82F6' },

  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#162540', backgroundColor: '#0B1326' },
  fullGymPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, alignSelf: 'flex-start' },
  pillActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)' },
  pillText: { color: '#718FAF', fontSize: 13, fontWeight: '500', fontFamily: 'DMSans-Medium' },
  pillTextActive: { color: '#3B82F6' },

  notesInput: {
    backgroundColor: '#0B1326', borderRadius: 12, borderWidth: 1, borderColor: '#162540',
    padding: 14, color: '#fff', fontSize: 14, fontFamily: 'DMSans-Regular',
    minHeight: 100, marginBottom: 4,
  },
  charCount: { color: '#4A6080', fontSize: 11, textAlign: 'right', marginBottom: 16, fontFamily: 'DMSans-Regular' },

  summaryCard: {
    backgroundColor: '#0B1326', borderRadius: 14, borderWidth: 1,
    borderColor: '#162540', padding: 14, gap: 10, marginBottom: 20,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLabel: { color: '#718FAF', fontSize: 13, fontFamily: 'DMSans-Regular' },
  summaryValue: { color: '#fff', fontSize: 13, fontWeight: '500', fontFamily: 'DMSans-Medium', flex: 1, textAlign: 'right', marginLeft: 8, textTransform: 'capitalize' },

  errorText: { color: '#f87171', fontSize: 13, fontFamily: 'DMSans-Regular', marginBottom: 12 },

  continueBtn: { backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'DMSans-Bold' },

  generateBtn: { backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  generatingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  successHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  successTitle: { color: '#fff', fontSize: 20, fontWeight: '700', fontFamily: 'BarlowCondensed-Bold' },
  successDesc: { color: '#718FAF', fontSize: 13, fontFamily: 'DMSans-Regular', marginBottom: 16, lineHeight: 18 },

  routineCard: {
    backgroundColor: '#0B1326', borderRadius: 14, borderWidth: 1,
    borderColor: '#162540', marginBottom: 20, overflow: 'hidden',
  },
  routineCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#162540',
  },
  routineCardName: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  exerciseCount: { color: '#718FAF', fontSize: 12, fontFamily: 'DMSans-Regular' },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  exerciseRowBorder: { borderTopWidth: 1, borderTopColor: '#162540' },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: '#fff', fontSize: 14, fontWeight: '500', fontFamily: 'DMSans-Medium' },
  exerciseNotes: { color: '#718FAF', fontSize: 11, fontFamily: 'DMSans-Regular', marginTop: 2 },
  exerciseSets: { color: '#3B82F6', fontSize: 13, fontWeight: '700', fontFamily: 'DMSans-Bold' },

  viewBtn: { backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  viewBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  regenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: '#162540', paddingVertical: 14 },
  regenBtnText: { color: '#718FAF', fontSize: 14, fontWeight: '500', fontFamily: 'DMSans-Medium' },
});
