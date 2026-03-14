import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Platform, Modal, FlatList, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type Sex = 'male' | 'female' | 'other';
type Goal =
  | 'Build Muscle'
  | 'Lose Fat'
  | 'Get Stronger'
  | 'Improve Fitness'
  | 'Athletic Performance';
type TrainingLevel = 'Beginner' | 'Intermediate' | 'Advanced';
type Equipment =
  | 'Barbell'
  | 'Dumbbell'
  | 'Machine'
  | 'Cable'
  | 'Bodyweight'
  | 'Kettlebell'
  | 'Resistance Band'
  | 'Smith Machine'
  | 'Other';

interface OnboardingData {
  sex: Sex | null;
  dateOfBirth: { year: number; month: number; day: number } | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: Goal | null;
  trainingLevel: TrainingLevel | null;
  daysPerWeek: number;
  equipment: Equipment[];
}

const TOTAL_STEPS = 5;

const GOALS: { label: Goal; icon: string }[] = [
  { label: 'Build Muscle', icon: 'barbell-outline' },
  { label: 'Lose Fat', icon: 'flame-outline' },
  { label: 'Get Stronger', icon: 'trending-up-outline' },
  { label: 'Improve Fitness', icon: 'heart-outline' },
  { label: 'Athletic Performance', icon: 'trophy-outline' },
];

const TRAINING_LEVELS: { label: TrainingLevel; description: string }[] = [
  { label: 'Beginner', description: 'Less than 1 year of consistent training' },
  { label: 'Intermediate', description: '1–3 years of consistent training' },
  { label: 'Advanced', description: '3+ years of consistent training' },
];

const EQUIPMENT_OPTIONS: Equipment[] = [
  'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight',
  'Kettlebell', 'Resistance Band', 'Smith Machine', 'Other',
];

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={progressStyles.container}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            progressStyles.segment,
            i < step && progressStyles.segmentActive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Step 1: Personal Info ────────────────────────────────────────────────────

function StepPersonalInfo({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
  const currentYear = new Date().getFullYear();

  const setDOBField = (field: 'year' | 'month' | 'day', value: number) => {
    const existing = data.dateOfBirth ?? { year: 1990, month: 1, day: 1 };
    onChange({ dateOfBirth: { ...existing, [field]: value } });
  };

  const SEX_OPTIONS: { label: string; value: Sex }[] = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={stepStyles.heading}>Tell us about yourself</Text>
      <Text style={stepStyles.subheading}>We'll personalise your experience.</Text>

      {/* Sex */}
      <Text style={stepStyles.label}>Sex</Text>
      <View style={stepStyles.row}>
        {SEX_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[stepStyles.chipButton, data.sex === opt.value && stepStyles.chipButtonActive]}
            onPress={() => onChange({ sex: opt.value })}
          >
            <Text style={[stepStyles.chipText, data.sex === opt.value && stepStyles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date of Birth */}
      <Text style={stepStyles.label}>Date of Birth</Text>
      <View style={stepStyles.row}>
        <NumberStepper
          label="Year"
          value={data.dateOfBirth?.year ?? currentYear - 25}
          min={currentYear - 100}
          max={currentYear - 13}
          onChange={(v) => setDOBField('year', v)}
          style={{ flex: 2 }}
          editable
        />
        <DropdownPicker
          label="Month"
          value={data.dateOfBirth?.month ?? 1}
          items={MONTHS}
          onChange={(v) => setDOBField('month', v)}
          style={{ flex: 2 }}
        />
        <DropdownPicker
          label="Day"
          value={data.dateOfBirth?.day ?? 1}
          items={Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: i + 1 }))}
          onChange={(v) => setDOBField('day', v)}
          style={{ flex: 1.5 }}
        />
      </View>

      {/* Height */}
      <Text style={stepStyles.label}>Height (cm)</Text>
      <NumberStepper
        label=""
        value={data.heightCm ?? 170}
        min={100}
        max={250}
        onChange={(v) => onChange({ heightCm: v })}
        step={1}
        unit="cm"
        editable
      />

      {/* Weight */}
      <Text style={[stepStyles.label, { marginTop: 16 }]}>Weight (kg)</Text>
      <NumberStepper
        label=""
        value={data.weightKg ?? 70}
        min={30}
        max={300}
        onChange={(v) => onChange({ weightKg: v })}
        step={0.5}
        unit="kg"
        editable
        decimal
      />
    </ScrollView>
  );
}

// ─── Dropdown Picker ──────────────────────────────────────────────────────────

function DropdownPicker({
  label, value, items, onChange, style,
}: {
  label: string;
  value: number;
  items: { label: string; value: number }[];
  onChange: (v: number) => void;
  style?: object;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.value === value);

  return (
    <View style={[dropdownStyles.container, style]}>
      {label ? <Text style={dropdownStyles.label}>{label}</Text> : null}
      <TouchableOpacity style={dropdownStyles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={dropdownStyles.triggerText}>{selected?.label ?? value}</Text>
        <Ionicons name="chevron-down" size={14} color="#718FAF" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={dropdownStyles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={dropdownStyles.sheet}>
            <Text style={dropdownStyles.sheetTitle}>{label}</Text>
            <FlatList
              data={items}
              keyExtractor={(i) => String(i.value)}
              showsVerticalScrollIndicator={false}
              getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
              initialScrollIndex={Math.max(0, items.findIndex((i) => i.value === value))}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[dropdownStyles.option, item.value === value && dropdownStyles.optionActive]}
                  onPress={() => { onChange(item.value); setOpen(false); }}
                >
                  <Text style={[dropdownStyles.optionText, item.value === value && dropdownStyles.optionTextActive]}>
                    {item.label}
                  </Text>
                  {item.value === value && <Ionicons name="checkmark" size={16} color="#3B82F6" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map((label, i) => ({ label, value: i + 1 }));

const dropdownStyles = StyleSheet.create({
  container: { marginBottom: 0 },
  label: { color: '#718FAF', fontSize: 12, marginBottom: 4 },
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0B1326', borderRadius: 12, borderWidth: 1, borderColor: '#162540',
    paddingHorizontal: 12, height: 48,
  },
  triggerText: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0B1326', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 16, paddingHorizontal: 16, paddingBottom: 40, maxHeight: '60%',
  },
  sheetTitle: { color: '#718FAF', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  option: { height: 48, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#162540' },
  optionActive: { backgroundColor: 'rgba(59,130,246,0.08)' },
  optionText: { color: '#fff', fontSize: 16, flex: 1 },
  optionTextActive: { color: '#3B82F6', fontWeight: '700' },
});

// ─── Number Stepper ───────────────────────────────────────────────────────────

function NumberStepper({
  label, value, min, max, step = 1, unit = '', onChange, style, compact = false, editable = false, decimal = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  style?: object;
  compact?: boolean;
  editable?: boolean;
  decimal?: boolean;
}) {
  const [inputText, setInputText] = useState('');
  const [editing, setEditing] = useState(false);

  const decrement = () => {
    const next = Math.round((value - step) * 100) / 100;
    if (next >= min) onChange(next);
  };
  const increment = () => {
    const next = Math.round((value + step) * 100) / 100;
    if (next <= max) onChange(next);
  };

  const handleInputChange = (text: string) => {
    setInputText(decimal ? text.replace(/[^0-9.]/g, '') : text.replace(/[^0-9]/g, ''));
  };

  const commitInput = () => {
    const num = decimal ? parseFloat(inputText) : parseInt(inputText, 10);
    if (!isNaN(num) && num >= min && num <= max) onChange(num);
    setEditing(false);
    setInputText('');
  };

  const btnStyle = compact ? [stepperStyles.btn, stepperStyles.btnCompact] : stepperStyles.btn;
  const iconSize = compact ? 16 : 20;

  return (
    <View style={[stepperStyles.container, style]}>
      {label ? <Text style={stepperStyles.label}>{label}</Text> : null}
      <View style={stepperStyles.controls}>
        <TouchableOpacity style={btnStyle} onPress={decrement}>
          <Ionicons name="remove" size={iconSize} color="#fff" />
        </TouchableOpacity>
        {editable && editing ? (
          <TextInput
            style={stepperStyles.valueInput}
            value={inputText}
            onChangeText={handleInputChange}
            onBlur={commitInput}
            onSubmitEditing={commitInput}
            keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
            maxLength={decimal ? 6 : 4}
            autoFocus
            selectTextOnFocus
          />
        ) : editable ? (
          <TouchableOpacity style={{ flex: 1 }} onPress={() => { setInputText(String(value)); setEditing(true); }}>
            <Text style={stepperStyles.value}>{value}{unit}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={stepperStyles.value}>{value}{unit}</Text>
        )}
        <TouchableOpacity style={btnStyle} onPress={increment}>
          <Ionicons name="add" size={iconSize} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Step 2: Goal ─────────────────────────────────────────────────────────────

function StepGoal({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={stepStyles.heading}>What's your main goal?</Text>
      <Text style={stepStyles.subheading}>Choose what matters most to you right now.</Text>

      <View style={goalStyles.grid}>
        {GOALS.map(({ label, icon }) => (
          <TouchableOpacity
            key={label}
            style={[goalStyles.card, data.goal === label && goalStyles.cardActive]}
            onPress={() => onChange({ goal: label })}
          >
            <Ionicons
              name={icon as keyof typeof Ionicons.glyphMap}
              size={28}
              color={data.goal === label ? '#3B82F6' : '#718FAF'}
              style={{ marginBottom: 10 }}
            />
            <Text style={[goalStyles.cardText, data.goal === label && goalStyles.cardTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Step 3: Training Level ───────────────────────────────────────────────────

function StepTrainingLevel({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
  return (
    <View>
      <Text style={stepStyles.heading}>Experience level</Text>
      <Text style={stepStyles.subheading}>Be honest — we'll calibrate your plan accordingly.</Text>

      {TRAINING_LEVELS.map(({ label, description }) => (
        <TouchableOpacity
          key={label}
          style={[levelStyles.card, data.trainingLevel === label && levelStyles.cardActive]}
          onPress={() => onChange({ trainingLevel: label })}
        >
          <View style={levelStyles.cardContent}>
            <Text style={[levelStyles.cardTitle, data.trainingLevel === label && levelStyles.cardTitleActive]}>
              {label}
            </Text>
            <Text style={levelStyles.cardDesc}>{description}</Text>
          </View>
          {data.trainingLevel === label && (
            <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Step 4: Schedule ─────────────────────────────────────────────────────────

function StepSchedule({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
  return (
    <View>
      <Text style={stepStyles.heading}>Training schedule</Text>
      <Text style={stepStyles.subheading}>How many days per week can you commit to training?</Text>

      <View style={scheduleStyles.grid}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <TouchableOpacity
            key={d}
            style={[scheduleStyles.dayButton, data.daysPerWeek === d && scheduleStyles.dayButtonActive]}
            onPress={() => onChange({ daysPerWeek: d })}
          >
            <Text style={[scheduleStyles.dayNumber, data.daysPerWeek === d && scheduleStyles.dayNumberActive]}>
              {d}
            </Text>
            <Text style={[scheduleStyles.dayLabel, data.daysPerWeek === d && scheduleStyles.dayLabelActive]}>
              {d === 1 ? 'day' : 'days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={scheduleStyles.hint}>
        {data.daysPerWeek <= 2
          ? 'Full-body workouts are ideal for this schedule.'
          : data.daysPerWeek <= 4
          ? 'Upper/lower or push-pull-legs splits work great here.'
          : 'High-frequency splits will be programmed for you.'}
      </Text>
    </View>
  );
}

// ─── Step 5: Equipment ────────────────────────────────────────────────────────

function StepEquipment({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
  const toggle = (item: Equipment) => {
    const current = data.equipment;
    const updated = current.includes(item)
      ? current.filter((e) => e !== item)
      : [...current, item];
    onChange({ equipment: updated });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={stepStyles.heading}>Available equipment</Text>
      <Text style={stepStyles.subheading}>Select everything available to you. You can change this later.</Text>

      <View style={equipStyles.grid}>
        {EQUIPMENT_OPTIONS.map((item) => {
          const selected = data.equipment.includes(item);
          return (
            <TouchableOpacity
              key={item}
              style={[equipStyles.chip, selected && equipStyles.chipActive]}
              onPress={() => toggle(item)}
            >
              {selected && (
                <Ionicons name="checkmark-circle" size={14} color="#3B82F6" style={{ marginRight: 6 }} />
              )}
              <Text style={[equipStyles.chipText, selected && equipStyles.chipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Main Onboarding Screen ───────────────────────────────────────────────────

const INITIAL_DATA: OnboardingData = {
  sex: null,
  dateOfBirth: null,
  heightCm: 170,
  weightKg: 70,
  goal: null,
  trainingLevel: null,
  daysPerWeek: 4,
  equipment: ['Barbell', 'Dumbbell'],
};

function validateStep(step: number, data: OnboardingData): string | null {
  if (step === 1) {
    if (!data.sex) return 'Please select your sex.';
    if (!data.dateOfBirth) return 'Please set your date of birth.';
    if (!data.heightCm) return 'Please set your height.';
    if (!data.weightKg) return 'Please set your weight.';
  }
  if (step === 2 && !data.goal) return 'Please select a goal.';
  if (step === 3 && !data.trainingLevel) return 'Please select your training level.';
  if (step === 5 && data.equipment.length === 0) return 'Please select at least one type of equipment.';
  return null;
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);

  const update = (patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  };

  const handleNext = () => {
    const error = validateStep(step, data);
    if (error) {
      Alert.alert('Almost there', error);
      return;
    }
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const dob = data.dateOfBirth
        ? `${data.dateOfBirth.year}-${String(data.dateOfBirth.month).padStart(2, '0')}-${String(data.dateOfBirth.day).padStart(2, '0')}`
        : undefined;

      await api.patch('/api/users/onboarding', {
        sex: data.sex,
        dateOfBirth: dob,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        goal: data.goal,
        trainingLevel: data.trainingLevel,
        daysPerWeek: data.daysPerWeek,
        equipment: data.equipment,
      });

      router.replace('/(app)/dashboard');
    } catch {
      Alert.alert('Error', 'Could not save your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabel = [
    'Personal Info',
    'Your Goal',
    'Experience',
    'Schedule',
    'Equipment',
  ][step - 1];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.headerBack, step === 1 && styles.headerBackHidden]}
          disabled={step === 1}
        >
          <Ionicons name="arrow-back" size={22} color="#718FAF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.stepLabel}>{stepLabel}</Text>
          <Text style={styles.stepCount}>{step} of {TOTAL_STEPS}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ProgressBar step={step} />

      {/* Step Content */}
      <View style={styles.content}>
        {step === 1 && <StepPersonalInfo data={data} onChange={update} />}
        {step === 2 && <StepGoal data={data} onChange={update} />}
        {step === 3 && <StepTrainingLevel data={data} onChange={update} />}
        {step === 4 && <StepSchedule data={data} onChange={update} />}
        {step === 5 && <StepEquipment data={data} onChange={update} />}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, loading && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === TOTAL_STEPS ? 'Get Started' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 8 : 0, paddingBottom: 8,
  },
  headerBack: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerBackHidden: { opacity: 0 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 40 },
  stepLabel: { color: '#fff', fontSize: 15, fontWeight: '700',
    fontFamily: 'DMSans-Bold' },
  stepCount: { color: '#718FAF', fontSize: 12, marginTop: 2 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 12 },
  nextButton: {
    backgroundColor: '#3B82F6', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  nextButtonDisabled: { opacity: 0.6 },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '700',
    fontFamily: 'DMSans-Bold' },
});

const progressStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', gap: 4, paddingHorizontal: 24,
    marginBottom: 16,
  },
  segment: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: '#0B1326',
  },
  segmentActive: { backgroundColor: '#3B82F6' },
});

const stepStyles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: '800',
    fontFamily: 'BarlowCondensed-ExtraBold',
    fontFamily: 'BarlowCondensed-ExtraBold', color: '#fff', marginBottom: 6 },
  subheading: { fontSize: 14, color: '#718FAF', marginBottom: 24, lineHeight: 20 },
  label: {
    fontSize: 12, fontWeight: '600', color: '#718FAF', marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  chipButton: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#0B1326', borderWidth: 1, borderColor: '#162540',
  },
  chipButtonActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246,0.1)' },
  chipText: { color: '#718FAF', fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#3B82F6' },
});

const stepperStyles = StyleSheet.create({
  container: { marginBottom: 0 },
  label: { color: '#718FAF', fontSize: 12, marginBottom: 4 },
  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0B1326', borderRadius: 12,
    borderWidth: 1, borderColor: '#162540', padding: 4,
  },
  btn: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: '#162540',
    alignItems: 'center', justifyContent: 'center',
  },
  btnCompact: {
    width: 32, height: 32, borderRadius: 6,
  },
  value: { color: '#fff', fontSize: 18, fontWeight: '700',
    fontFamily: 'BarlowCondensed-Bold', flex: 1, textAlign: 'center' },
  valueInput: {
    color: '#fff', fontSize: 18, fontWeight: '700',
    fontFamily: 'BarlowCondensed-Bold', flex: 1, textAlign: 'center',
    borderBottomWidth: 1, borderBottomColor: '#3B82F6',
  },
});

const goalStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  card: {
    width: '47%', backgroundColor: '#0B1326', borderRadius: 14,
    padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#162540',
  },
  cardActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246,0.08)' },
  cardText: { color: '#718FAF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  cardTextActive: { color: '#fff' },
});

const levelStyles = StyleSheet.create({
  card: {
    backgroundColor: '#0B1326', borderRadius: 14, padding: 20,
    marginBottom: 12, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#162540',
  },
  cardActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246,0.08)' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#718FAF', marginBottom: 4 },
  cardTitleActive: { color: '#fff' },
  cardDesc: { fontSize: 13, color: '#718FAF', lineHeight: 18 },
});

const scheduleStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24,
  },
  dayButton: {
    width: '12%', minWidth: 44, aspectRatio: 1,
    backgroundColor: '#0B1326', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#162540', flex: 1,
  },
  dayButtonActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246,0.1)' },
  dayNumber: { fontSize: 18, fontWeight: '800', color: '#718FAF' ,
    fontFamily: 'BarlowCondensed-ExtraBold'},
  dayNumberActive: { color: '#3B82F6' },
  dayLabel: { fontSize: 10, color: '#4A6080' },
  dayLabelActive: { color: '#3B82F6' },
  hint: { color: '#718FAF', fontSize: 14, lineHeight: 20, backgroundColor: '#0B1326', padding: 16, borderRadius: 12 },
});

const equipStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#0B1326', borderRadius: 100,
    borderWidth: 1, borderColor: '#162540',
  },
  chipActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246,0.08)' },
  chipText: { fontSize: 14, color: '#718FAF', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
});
