import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchExerciseProgress } from '../../../src/api/progress';
import { api } from '../../../src/api/client';
import { PRBadge } from '../../../src/components/PRBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawSessionSet {
  weight: number | null;
  reps: number | null;
  isPR?: boolean;
}

interface RawSession {
  workoutId: string;
  date: string;
  sets: RawSessionSet[];
}

interface NormalizedSession {
  workoutId: string;
  date: string;
  topWeight: number;
  topReps: number;
  totalVolume: number;
  hasPR: boolean;
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchSessions(exerciseId: string, limit = 50): Promise<NormalizedSession[]> {
  const { data } = await api.get<{ data: RawSession[] }>(
    `/api/progress/${exerciseId}/sessions?limit=${limit}`,
  );
  const raw: RawSession[] = data?.data ?? [];
  return raw.map((session) => {
    const validSets = session.sets.filter((s) => s.weight && s.reps);
    const topByWeight = validSets.reduce<{ weight: number; reps: number }>(
      (best, s) => ((s.weight ?? 0) > best.weight ? { weight: s.weight ?? 0, reps: s.reps ?? 0 } : best),
      { weight: 0, reps: 0 },
    );
    const totalVolume = validSets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
    const hasPR = session.sets.some((s) => (s as RawSessionSet & { isPR?: boolean }).isPR);
    return {
      workoutId: session.workoutId,
      date: session.date,
      topWeight: topByWeight.weight,
      topReps: topByWeight.reps,
      totalVolume,
      hasPR,
    };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg).toLocaleString()}kg`;
}

// Strength standards: bodyweight multiplier ratios
const LIFT_STANDARDS: Record<
  string,
  { beginner: number; novice: number; intermediate: number; advanced: number; elite: number }
> = {
  'bench press':    { beginner: 0.5,  novice: 0.75, intermediate: 1.0,  advanced: 1.5,  elite: 2.0 },
  squat:            { beginner: 0.75, novice: 1.0,  intermediate: 1.5,  advanced: 2.0,  elite: 2.5 },
  deadlift:         { beginner: 1.0,  novice: 1.25, intermediate: 1.75, advanced: 2.25, elite: 3.0 },
  'overhead press': { beginner: 0.35, novice: 0.5,  intermediate: 0.75, advanced: 1.0,  elite: 1.35 },
  'barbell row':    { beginner: 0.5,  novice: 0.75, intermediate: 1.0,  advanced: 1.5,  elite: 2.0 },
};

const LIFT_SEARCH_TERMS: Record<string, string[]> = {
  'bench press':    ['bench press', 'barbell bench'],
  squat:            ['barbell squat', 'back squat', 'front squat', 'squat'],
  deadlift:         ['deadlift'],
  'overhead press': ['overhead press', 'military press', 'ohp', 'shoulder press'],
  'barbell row':    ['barbell row', 'bent over row'],
};

type Level = 'Beginner' | 'Novice' | 'Intermediate' | 'Advanced' | 'Elite';
const LEVELS: Level[] = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];

const LEVEL_COLORS: Record<Level, string> = {
  Beginner:     '#6B7280',
  Novice:       '#10B981',
  Intermediate: '#3B82F6',
  Advanced:     '#8B5CF6',
  Elite:        '#F59E0B',
};

function getLiftKey(exerciseName: string): string | null {
  const lower = exerciseName.toLowerCase();
  for (const [key, terms] of Object.entries(LIFT_SEARCH_TERMS)) {
    if (terms.some((t) => lower.includes(t))) return key;
  }
  return null;
}

function getLevelFromRatio(
  ratio: number,
  standards: { beginner: number; novice: number; intermediate: number; advanced: number; elite: number },
): Level {
  if (ratio >= standards.elite) return 'Elite';
  if (ratio >= standards.advanced) return 'Advanced';
  if (ratio >= standards.intermediate) return 'Intermediate';
  if (ratio >= standards.novice) return 'Novice';
  return 'Beginner';
}

function getLevelIndex(level: Level): number {
  return LEVELS.indexOf(level);
}

interface StrengthBarProps {
  exerciseName: string;
  estimated1RM: number;
}

function StrengthStandardsCard({ exerciseName, estimated1RM }: StrengthBarProps) {
  const liftKey = getLiftKey(exerciseName);
  if (!liftKey || estimated1RM <= 0) return null;

  // Without bodyweight we can't compute a ratio — show a prompt instead
  const standards = LIFT_STANDARDS[liftKey];
  if (!standards) return null;

  const levelNames: Level[] = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];

  return (
    <View style={stdStyles.card}>
      <Text style={stdStyles.cardTitle}>Strength Standards</Text>
      <Text style={stdStyles.cardSub}>
        Log your body weight in the Body Weight screen to see your level.
      </Text>
      {/* Marker bar showing where each threshold sits */}
      <View style={stdStyles.barWrap}>
        {levelNames.map((level, i) => (
          <View
            key={level}
            style={[
              stdStyles.barSegment,
              { backgroundColor: LEVEL_COLORS[level] },
            ]}
          />
        ))}
      </View>
      <View style={stdStyles.legendRow}>
        {levelNames.map((level) => (
          <Text key={level} style={[stdStyles.legendItem, { color: LEVEL_COLORS[level] }]}>
            {level}
          </Text>
        ))}
      </View>
    </View>
  );
}

interface StrengthLevelCardProps {
  exerciseName: string;
  estimated1RM: number;
  bodyWeightKg: number;
}

function StrengthLevelCard({ exerciseName, estimated1RM, bodyWeightKg }: StrengthLevelCardProps) {
  const liftKey = getLiftKey(exerciseName);
  if (!liftKey || estimated1RM <= 0 || bodyWeightKg <= 0) return null;
  const standards = LIFT_STANDARDS[liftKey];
  if (!standards) return null;

  const ratio = estimated1RM / bodyWeightKg;
  const level = getLevelFromRatio(ratio, standards);
  const levelIdx = getLevelIndex(level);
  const levelColor = LEVEL_COLORS[level];

  const levelNames: Level[] = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];

  return (
    <View style={stdStyles.card}>
      <View style={stdStyles.cardHeader}>
        <Text style={stdStyles.cardTitle}>Strength Standards</Text>
        <View style={[stdStyles.levelBadge, { backgroundColor: levelColor + '22', borderColor: levelColor }]}>
          <Text style={[stdStyles.levelBadgeText, { color: levelColor }]}>{level}</Text>
        </View>
      </View>
      <Text style={stdStyles.ratioText}>
        {ratio.toFixed(2)}× bodyweight
      </Text>
      {/* Progress bar */}
      <View style={stdStyles.barWrap}>
        {levelNames.map((lvl, i) => (
          <View
            key={lvl}
            style={[
              stdStyles.barSegment,
              {
                backgroundColor: i <= levelIdx ? LEVEL_COLORS[lvl] : '#162540',
              },
            ]}
          />
        ))}
      </View>
      <View style={stdStyles.legendRow}>
        {levelNames.map((lvl) => (
          <Text
            key={lvl}
            style={[
              stdStyles.legendItem,
              { color: lvl === level ? LEVEL_COLORS[lvl] : '#4A6080' },
            ]}
          >
            {lvl}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function ExerciseProgressScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const router = useRouter();

  const { data: summary, isLoading: summaryLoading, isError } = useQuery({
    queryKey: ['exercise-progress', exerciseId],
    queryFn: () => fetchExerciseProgress(exerciseId!),
    enabled: !!exerciseId,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['exercise-sessions-v2', exerciseId],
    queryFn: () => fetchSessions(exerciseId!),
    enabled: !!exerciseId,
  });

  const isLoading = summaryLoading || sessionsLoading;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {summary?.exerciseName ?? 'Exercise Progress'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#3B82F6" style={{ marginTop: 60 }} />
      ) : isError ? (
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#718FAF" />
          <Text style={styles.errorText}>Could not load progress data.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Best Stats Row: Best Weight, Best Reps, Best Volume, Estimated 1RM */}
          <Text style={styles.sectionTitle}>Best Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {(summary?.bestWeight ?? 0) > 0 ? `${summary!.bestWeight}kg` : '—'}
              </Text>
              <Text style={styles.statLabel}>Best Weight</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {(summary?.bestReps ?? 0) > 0 ? `${summary!.bestReps}` : '—'}
              </Text>
              <Text style={styles.statLabel}>Best Reps</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {(summary?.bestVolume ?? 0) > 0 ? formatVolume(summary!.bestVolume) : '—'}
              </Text>
              <Text style={styles.statLabel}>Best Volume</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#3B82F6' }]}>
                {(summary?.estimated1RM ?? 0) > 0 ? `${summary!.estimated1RM}kg` : '—'}
              </Text>
              <Text style={styles.statLabel}>Est. 1RM</Text>
            </View>
          </View>

          {/* Strength Standards */}
          {(summary?.estimated1RM ?? 0) > 0 && summary?.exerciseName && (
            <View style={styles.standardsWrap}>
              <StrengthStandardsCard
                exerciseName={summary.exerciseName}
                estimated1RM={summary.estimated1RM}
              />
            </View>
          )}

          {/* Session History */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Session History</Text>
          {(sessions?.length ?? 0) === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No sessions recorded yet.</Text>
            </View>
          ) : (
            sessions!.map((session) => (
                <TouchableOpacity
                  key={session.workoutId + session.date}
                  style={styles.sessionRow}
                  onPress={() => {
                    if (session.workoutId) {
                      router.push(`/(screens)/workout/${session.workoutId}` as any);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.sessionLeft}>
                    <View style={styles.sessionDateRow}>
                      <Text style={styles.sessionDate}>{formatLongDate(session.date)}</Text>
                      {session.hasPR && <PRBadge size="sm" />}
                    </View>
                    <Text style={styles.sessionSet}>
                      Top set: {session.topWeight}kg × {session.topReps} reps
                    </Text>
                  </View>
                  <View style={styles.sessionRight}>
                    <Text style={styles.sessionVolume}>{formatVolume(session.totalVolume)}</Text>
                    <Text style={styles.sessionVolumeLabel}>volume</Text>
                    <Ionicons name="chevron-forward" size={14} color="#718FAF" style={{ marginTop: 2 }} />
                  </View>
                </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0B1326',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontFamily: 'BarlowCondensed-Bold', textAlign: 'center' },
  headerRight: { width: 40 },

  content: { padding: 20, paddingBottom: 40 },

  sectionTitle: {
    color: '#718FAF',
    fontSize: 11,
    fontFamily: 'BarlowCondensed-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#0B1326',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#162540',
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'BarlowCondensed-ExtraBold',
    marginBottom: 4,
  },
  statLabel: { color: '#718FAF', fontSize: 11, fontFamily: 'DMSans-Medium', textTransform: 'uppercase', letterSpacing: 0.5 },

  standardsWrap: { marginBottom: 24 },

  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B1326',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#162540',
  },
  sessionLeft: { flex: 1 },
  sessionDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  sessionDate: { color: '#fff', fontSize: 14, fontFamily: 'DMSans-SemiBold' },
  sessionSet: { color: '#718FAF', fontSize: 13, fontFamily: 'DMSans-Regular' },
  sessionRight: { alignItems: 'flex-end', gap: 2 },
  sessionVolume: { color: '#3B82F6', fontSize: 15, fontFamily: 'DMSans-Bold' },
  sessionVolumeLabel: { color: '#4A6080', fontSize: 11, fontFamily: 'DMSans-Regular' },

  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: '#718FAF', fontSize: 15, fontFamily: 'DMSans-Regular' },

  emptyWrap: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: '#4A6080', fontSize: 15, fontFamily: 'DMSans-Regular' },
});

const stdStyles = StyleSheet.create({
  card: {
    backgroundColor: '#0B1326',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#162540',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: { color: '#fff', fontSize: 14, fontFamily: 'DMSans-SemiBold' },
  cardSub: { color: '#4A6080', fontSize: 12, marginBottom: 12, fontFamily: 'DMSans-Regular' },
  levelBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelBadgeText: { fontSize: 12, fontFamily: 'DMSans-Bold' },
  ratioText: { color: '#718FAF', fontSize: 13, marginBottom: 12, fontFamily: 'DMSans-Regular' },
  barWrap: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
    marginBottom: 8,
  },
  barSegment: { flex: 1, height: '100%', borderRadius: 2 },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: { fontSize: 9, fontFamily: 'DMSans-SemiBold' },
});
