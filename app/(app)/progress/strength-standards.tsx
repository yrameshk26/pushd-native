import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity,
  TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchStrengthStandards, StrengthStandard } from '../../../src/api/progress';

interface MainLift {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const MAIN_LIFTS: MainLift[] = [
  { id: 'squat', name: 'Squat', icon: 'body-outline' },
  { id: 'bench-press', name: 'Bench Press', icon: 'barbell-outline' },
  { id: 'deadlift', name: 'Deadlift', icon: 'git-pull-request-outline' },
  { id: 'overhead-press', name: 'Overhead Press', icon: 'arrow-up-outline' },
];

const LEVELS = ['untested', 'novice', 'intermediate', 'advanced', 'elite'] as const;
type Level = typeof LEVELS[number];

const LEVEL_COLORS: Record<Level, string> = {
  untested: '#555',
  novice: '#10B981',
  intermediate: '#6C63FF',
  advanced: '#F59E0B',
  elite: '#EF4444',
};

const LEVEL_LABELS: Record<Level, string> = {
  untested: 'Untested',
  novice: 'Novice',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Elite',
};

function getUserLevel(ratio: number, standards: StrengthStandard['standards']): Level {
  if (ratio >= standards.elite) return 'elite';
  if (ratio >= standards.advanced) return 'advanced';
  if (ratio >= standards.intermediate) return 'intermediate';
  if (ratio >= standards.novice) return 'novice';
  return 'untested';
}

function getLevelBarWidth(ratio: number, standards: StrengthStandard['standards']): number {
  const max = standards.elite * 1.1;
  return Math.min((ratio / max) * 100, 100);
}

interface StandardsDisplayProps {
  standard: StrengthStandard;
  bodyweight: number;
}

function StandardsDisplay({ standard, bodyweight }: StandardsDisplayProps) {
  const ratio = bodyweight > 0 ? (standard.userRatio ?? 0) : 0;
  const userLevel = getUserLevel(ratio, standard.standards);
  const barWidth = getLevelBarWidth(ratio, standard.standards);
  const levelColor = LEVEL_COLORS[userLevel];

  return (
    <View style={stdStyles.card}>
      <Text style={stdStyles.exName}>{standard.exerciseName}</Text>

      {/* Level Indicator */}
      <View style={stdStyles.levelRow}>
        <View style={[stdStyles.levelBadge, { backgroundColor: levelColor + '22' }]}>
          <Text style={[stdStyles.levelText, { color: levelColor }]}>
            {LEVEL_LABELS[userLevel]}
          </Text>
        </View>
        {ratio > 0 && (
          <Text style={stdStyles.ratioText}>{ratio.toFixed(2)}x BW</Text>
        )}
      </View>

      {/* Progress Bar */}
      <View style={stdStyles.barContainer}>
        <View style={stdStyles.barBg}>
          {ratio > 0 && (
            <View style={[stdStyles.barFill, { width: `${barWidth}%` as any, backgroundColor: levelColor }]} />
          )}
        </View>
        {/* Level Markers */}
        <View style={stdStyles.markers}>
          {LEVELS.filter((l) => l !== 'untested').map((level) => {
            const val = standard.standards[level];
            const pos = Math.min((val / (standard.standards.elite * 1.1)) * 100, 95);
            return (
              <View key={level} style={[stdStyles.marker, { left: `${pos}%` as any }]}>
                <View style={[stdStyles.markerLine, { backgroundColor: LEVEL_COLORS[level] }]} />
              </View>
            );
          })}
        </View>
      </View>

      {/* Standard Values Table */}
      <View style={stdStyles.table}>
        {(LEVELS.filter((l) => l !== 'untested') as Level[]).map((level) => {
          const val = standard.standards[level];
          const weightForLevel = bodyweight > 0 ? (val * bodyweight).toFixed(1) : '—';
          const isUser = userLevel === level;
          return (
            <View key={level} style={[stdStyles.tableRow, isUser && stdStyles.tableRowActive]}>
              <View style={[stdStyles.dot, { backgroundColor: LEVEL_COLORS[level] }]} />
              <Text style={[stdStyles.tableLevel, isUser && { color: LEVEL_COLORS[level] }]}>
                {LEVEL_LABELS[level]}
              </Text>
              <Text style={[stdStyles.tableRatio, isUser && { color: LEVEL_COLORS[level] }]}>
                {val.toFixed(2)}x
              </Text>
              <Text style={[stdStyles.tableWeight, isUser && { color: '#fff' }]}>
                {weightForLevel}kg
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function StrengthStandardsScreen() {
  const router = useRouter();
  const [selectedLift, setSelectedLift] = useState<MainLift>(MAIN_LIFTS[0]);
  const [bodyweightInput, setBodyweightInput] = useState('');

  const bodyweight = parseFloat(bodyweightInput) || 0;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['strength-standards', selectedLift.id],
    queryFn: () => fetchStrengthStandards(selectedLift.id),
  });

  const enrichedData = data && bodyweight > 0
    ? {
        ...data,
        userRatio: data.userRatio ?? 0,
      }
    : data;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Strength Standards</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bodyweight Input */}
        <View style={styles.bwCard}>
          <Text style={styles.bwLabel}>Your Bodyweight (kg)</Text>
          <TextInput
            style={styles.bwInput}
            placeholder="e.g. 80"
            placeholderTextColor="#555"
            keyboardType="decimal-pad"
            value={bodyweightInput}
            onChangeText={setBodyweightInput}
          />
          <Text style={styles.bwHint}>Used to calculate strength-to-bodyweight ratios</Text>
        </View>

        {/* Lift Selector */}
        <Text style={styles.sectionTitle}>Select Lift</Text>
        <View style={styles.liftGrid}>
          {MAIN_LIFTS.map((lift) => {
            const isSelected = selectedLift.id === lift.id;
            return (
              <TouchableOpacity
                key={lift.id}
                style={[styles.liftBtn, isSelected && styles.liftBtnActive]}
                onPress={() => setSelectedLift(lift)}
              >
                <Ionicons
                  name={lift.icon}
                  size={20}
                  color={isSelected ? '#fff' : '#888'}
                />
                <Text style={[styles.liftBtnText, isSelected && styles.liftBtnTextActive]}>
                  {lift.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Standards Display */}
        {isLoading ? (
          <ActivityIndicator color="#6C63FF" style={{ marginTop: 40 }} />
        ) : isError ? (
          <View style={styles.errorWrap}>
            <Ionicons name="alert-circle-outline" size={48} color="#888" />
            <Text style={styles.errorText}>Could not load standards.</Text>
          </View>
        ) : enrichedData ? (
          <StandardsDisplay standard={enrichedData} bodyweight={bodyweight} />
        ) : null}

        {/* Info Note */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color="#6C63FF" />
          <Text style={styles.infoText}>
            Strength standards are based on 1-rep max relative to bodyweight. Enter your bodyweight
            above to see how much weight corresponds to each level.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },

  content: { padding: 20, paddingBottom: 40 },

  bwCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 10,
  },
  bwLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  bwInput: {
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  bwHint: { color: '#555', fontSize: 12 },

  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  liftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  liftBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  liftBtnActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  liftBtnText: { color: '#888', fontSize: 13, fontWeight: '600' },
  liftBtnTextActive: { color: '#fff' },

  errorWrap: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  errorText: { color: '#888', fontSize: 15 },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#6C63FF11',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#6C63FF33',
    alignItems: 'flex-start',
  },
  infoText: { color: '#888', fontSize: 13, flex: 1, lineHeight: 18 },
});

const stdStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 14,
  },
  exName: { color: '#fff', fontSize: 18, fontWeight: '700' },

  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  levelText: { fontSize: 13, fontWeight: '700' },
  ratioText: { color: '#888', fontSize: 13 },

  barContainer: { position: 'relative' },
  barBg: {
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  markers: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
  },
  marker: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 8,
  },
  markerLine: {
    width: 2,
    height: '100%',
    opacity: 0.8,
  },

  table: { gap: 8 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  tableRowActive: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tableLevel: { color: '#888', fontSize: 13, flex: 1 },
  tableRatio: { color: '#888', fontSize: 13, width: 48, textAlign: 'right' },
  tableWeight: { color: '#888', fontSize: 13, width: 70, textAlign: 'right' },
});
