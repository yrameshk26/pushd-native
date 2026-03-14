import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Animated,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api/client';
import { useWorkoutStore } from '../../src/store/workout';
import { VolumeChart } from '../../src/components/VolumeChart';
import { StreakCalendar } from '../../src/components/StreakCalendar';
import { RecoveryWidget } from '../../src/components/RecoveryWidget';
import { DeloadRecommendationCard } from '../../src/components/DeloadRecommendationCard';
import { WeeklyReviewCard } from '../../src/components/WeeklyReviewCard';
import type { RecoveryData } from '../../src/components/RecoveryWidget';
import type { WeeklyReview } from '../../src/components/WeeklyReviewCard';
import type { DeloadResult } from '../../src/components/DeloadRecommendationCard';
import type { Routine, WorkoutListItem } from '../../src/types/index';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeData {
  displayName: string;
  username: string;
}

interface StreakData {
  streak: number;
  lastWorkoutDate?: string;
  activeDates?: string[];
}

interface VolumeWeek {
  week: string;
  volume: number;
}

interface PREntry {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  achievedAt: string;
}

interface ProgressSummary {
  recentPRs: PREntry[];
  totalWorkouts: number;
  totalVolume: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  return `${weeks} weeks ago`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const opacity = React.useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius,
          backgroundColor: '#162540',
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Ionicons name={icon as never} size={14} color="#718FAF" style={{ marginRight: 6 }} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Start Workout Sheet ──────────────────────────────────────────────────────

interface StartWorkoutSheetProps {
  visible: boolean;
  onClose: () => void;
  routines: Routine[];
  onStartEmpty: () => void;
  onStartRoutine: (routine: Routine) => void;
}

function StartWorkoutSheet({
  visible,
  onClose,
  routines,
  onStartEmpty,
  onStartRoutine,
}: StartWorkoutSheetProps) {
  type SheetItem =
    | { type: 'empty' }
    | { type: 'header' }
    | { type: 'routine'; routine: Routine };

  const items: SheetItem[] = [
    { type: 'empty' },
    ...(routines.length > 0 ? [{ type: 'header' } as SheetItem] : []),
    ...routines.map((r) => ({ type: 'routine', routine: r } as SheetItem)),
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Drag indicator */}
        <View style={styles.sheetHandle} />

        <View style={styles.sheetTitleRow}>
          <Text style={styles.sheetTitle}>Start Workout</Text>
          <Pressable onPress={onClose} style={styles.sheetCloseBtn} accessibilityLabel="Close">
            <Ionicons name="close" size={20} color="#718FAF" />
          </Pressable>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item, index) => {
            if (item.type === 'empty') return 'empty';
            if (item.type === 'header') return 'header';
            return item.routine.id;
          }}
          renderItem={({ item }) => {
            if (item.type === 'empty') {
              return (
                <TouchableOpacity
                  style={styles.sheetEmptyOption}
                  onPress={onStartEmpty}
                  activeOpacity={0.8}
                >
                  <View style={styles.sheetEmptyIcon}>
                    <Ionicons name="add-circle-outline" size={22} color="#3B82F6" />
                  </View>
                  <Text style={styles.sheetEmptyText}>Empty Workout</Text>
                </TouchableOpacity>
              );
            }
            if (item.type === 'header') {
              return <Text style={styles.sheetRoutinesHeader}>YOUR ROUTINES</Text>;
            }
            const routine = item.routine;
            const exCount =
              routine._count?.exercises ?? routine.exercises?.length ?? 0;
            return (
              <TouchableOpacity
                style={styles.sheetRoutineRow}
                onPress={() => onStartRoutine(routine)}
                activeOpacity={0.75}
              >
                <View style={styles.sheetRoutineInfo}>
                  <Text style={styles.sheetRoutineName} numberOfLines={1}>
                    {routine.name}
                  </Text>
                  <Text style={styles.sheetRoutineMeta}>
                    {exCount} exercise{exCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Ionicons name="play-circle-outline" size={22} color="#3B82F6" />
              </TouchableOpacity>
            );
          }}
          style={styles.sheetList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const queryClient = useQueryClient();
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const startFromRoutine = useWorkoutStore((s) => s.startFromRoutine);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // ── Parallel queries ─────────────────────────────────────────────────────

  const { data: me, isLoading: meLoading } = useQuery<MeData>({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/api/users/me')).data,
    retry: 1,
  });

  const { data: streakData, isLoading: streakLoading } = useQuery<StreakData>({
    queryKey: ['user-streak'],
    queryFn: async () => (await api.get('/api/users/streak')).data,
    retry: 1,
  });

  const { data: volumeData, isLoading: volumeLoading } = useQuery<VolumeWeek[]>({
    queryKey: ['volume-8w'],
    queryFn: async () => {
      const res = await api.get('/api/progress/volume', { params: { weeks: 8 } });
      return res.data.weeks ?? res.data ?? [];
    },
    retry: 1,
  });

  const { data: deloadData, isLoading: deloadLoading } = useQuery<DeloadResult>({
    queryKey: ['deload-check'],
    queryFn: async () => {
      const res = await api.get('/api/ai/deload-check');
      return res.data.data ?? res.data;
    },
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  const { data: weeklyReview, isLoading: reviewLoading } = useQuery<WeeklyReview>({
    queryKey: ['weekly-review'],
    queryFn: async () => {
      const res = await api.get('/api/weekly-review/latest');
      return res.data.data ?? res.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: recoveryData, isLoading: recoveryLoading } = useQuery<RecoveryData>({
    queryKey: ['recovery'],
    queryFn: async () => {
      const res = await api.get('/api/ai/recovery');
      return res.data.data ?? res.data;
    },
    retry: 1,
  });

  const { data: progressSummary, isLoading: progressLoading } = useQuery<ProgressSummary>({
    queryKey: ['progress-summary'],
    queryFn: async () => (await api.get('/api/progress/summary')).data,
    retry: 1,
  });

  const { data: routinesData, isLoading: routinesLoading } = useQuery<{ routines: Routine[] }>({
    queryKey: ['routines-dashboard'],
    queryFn: async () => {
      const res = await api.get('/api/routines');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data?.routines ?? []);
      return { routines: list };
    },
    retry: 1,
  });

  const { data: recentWorkoutsData, isLoading: recentWorkoutsLoading } = useQuery<{ workouts: WorkoutListItem[] }>({
    queryKey: ['recent-workouts'],
    queryFn: async () => (await api.get('/api/workouts', { params: { limit: 3 } })).data,
    retry: 1,
  });

  // ── Derived values ────────────────────────────────────────────────────────

  const routines: Routine[] = routinesData?.routines ?? [];
  const suggestedRoutine: Routine | null = routines[0] ?? null;
  const recentPRs: PREntry[] = progressSummary?.recentPRs ?? [];
  const activeDates: string[] = streakData?.activeDates ?? [];
  const streak: number = streakData?.streak ?? 0;
  const chartData: VolumeWeek[] = volumeData ?? [];
  const recentWorkouts: WorkoutListItem[] = recentWorkoutsData?.workouts ?? [];

  // ── Pull-to-refresh ───────────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  // ── Workout handlers ──────────────────────────────────────────────────────

  function handleStartEmpty() {
    setSheetOpen(false);
    startWorkout('Workout');
    router.push('/(screens)/workout/active');
  }

  function handleStartRoutine(routine: Routine) {
    setSheetOpen(false);
    const exercises = (routine.exercises ?? []).map((e) => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exercise?.name ?? e.exerciseId,
      order: e.order,
      sets: [],
      notes: e.notes,
    }));
    startFromRoutine(routine.id, routine.name, exercises);
    router.push('/(screens)/workout/active');
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
      >
        {/* ── Section 0: Header ───────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good to see you,</Text>
            {meLoading ? (
              <Skeleton width={140} height={28} borderRadius={6} style={{ marginTop: 4 }} />
            ) : (
              <Text style={styles.displayName}>
                {me?.displayName ?? me?.username ?? 'Athlete'}
              </Text>
            )}
          </View>

          {/* Streak badge */}
          {!streakLoading && streak > 0 && (
            <View style={styles.streakBadge}>
              <Ionicons name="flame-outline" size={16} color="#60a5fa" />
              <Text style={styles.streakCount}>{streak}</Text>
            </View>
          )}
        </View>

        {/* ── Section 1: START WORKOUT button ─────────────────────────── */}
        <TouchableOpacity
          style={styles.startWorkoutBtn}
          onPress={() => setSheetOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="play" size={20} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.startWorkoutText}>START WORKOUT</Text>
        </TouchableOpacity>

        {/* ── Section 2: Recovery Widget ───────────────────────────────── */}
        {recoveryLoading ? (
          <Skeleton height={170} borderRadius={14} style={styles.cardGap} />
        ) : recoveryData ? (
          <View style={styles.cardGap}>
            <RecoveryWidget data={recoveryData} />
          </View>
        ) : null}

        {/* ── Section 3: Deload Card ───────────────────────────────────── */}
        {!deloadLoading && deloadData?.shouldDeload ? (
          <View style={styles.cardGap}>
            <DeloadRecommendationCard data={deloadData} />
          </View>
        ) : null}

        {/* ── Section 4: Weekly Review Card ───────────────────────────── */}
        {reviewLoading ? (
          <Skeleton height={140} borderRadius={14} style={styles.cardGap} />
        ) : weeklyReview ? (
          <View style={styles.cardGap}>
            <WeeklyReviewCard review={weeklyReview} />
          </View>
        ) : null}

        {/* ── Section 5: Suggested Today ───────────────────────────────── */}
        {routinesLoading ? (
          <Skeleton height={80} borderRadius={14} style={styles.sectionGap} />
        ) : suggestedRoutine ? (
          <View style={styles.sectionGap}>
            <SectionHeader icon="flash-outline" title="SUGGESTED TODAY" />
            <View style={styles.routineCard}>
              <View style={styles.routineInfo}>
                <Text style={styles.routineName} numberOfLines={1}>
                  {suggestedRoutine.name}
                </Text>
                {suggestedRoutine.exercises && suggestedRoutine.exercises.length > 0 && (
                  <Text style={styles.routineExercises} numberOfLines={1}>
                    {suggestedRoutine.exercises
                      .slice(0, 4)
                      .map((e) => e.exercise?.name ?? e.exerciseId)
                      .join(' · ')}
                    {suggestedRoutine.exercises.length > 4 ? ' …' : ''}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => handleStartRoutine(suggestedRoutine)}
                activeOpacity={0.8}
              >
                <Text style={styles.startBtnText}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* ── Section 6: Recent PRs ────────────────────────────────────── */}
        {progressLoading ? (
          <Skeleton height={90} borderRadius={14} style={styles.sectionGap} />
        ) : recentPRs.length > 0 ? (
          <View style={styles.sectionGap}>
            <SectionHeader icon="trophy-outline" title="RECENT PRs" />
            <View style={styles.card}>
              {recentPRs.slice(0, 3).map((pr, index) => (
                <TouchableOpacity
                  key={pr.id}
                  style={[
                    styles.prRow,
                    index < Math.min(recentPRs.length, 3) - 1 && styles.prRowBorder,
                  ]}
                  onPress={() =>
                    router.push(`/(screens)/progress/${pr.exerciseId}` as never)
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.prName} numberOfLines={1}>
                    {pr.exerciseName}
                  </Text>
                  <Text style={styles.prValue}>
                    {pr.weight}kg × {pr.reps}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Section 7: Weekly Volume chart ──────────────────────────── */}
        <View style={styles.sectionGap}>
          <SectionHeader icon="flash-outline" title="WEEKLY VOLUME" />
          <View style={styles.card}>
            {volumeLoading ? (
              <Skeleton height={160} borderRadius={8} />
            ) : (
              <VolumeChart data={chartData} />
            )}
          </View>
        </View>

        {/* ── Section 8: Activity calendar ────────────────────────────── */}
        <View style={styles.sectionGap}>
          <SectionHeader icon="flame-outline" title="ACTIVITY" />
          {streakLoading ? (
            <Skeleton height={130} borderRadius={14} />
          ) : (
            <View style={styles.card}>
              <StreakCalendar activeDates={activeDates} weeks={16} />
            </View>
          )}
        </View>

        {/* ── Section 9: Recent Workouts ──────────────────────────────── */}
        {recentWorkoutsLoading ? (
          <Skeleton height={160} borderRadius={14} style={styles.sectionGap} />
        ) : recentWorkouts.length > 0 ? (
          <View style={styles.sectionGap}>
            <View style={styles.recentWorkoutsHeader}>
              <Text style={styles.recentWorkoutsTitle}>Recent Workouts</Text>
              <TouchableOpacity
                onPress={() => router.push('/(screens)/workout/history' as never)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Text style={styles.seeAllLink}>See all →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              {recentWorkouts.map((w, index) => (
                <TouchableOpacity
                  key={w.id}
                  style={[
                    styles.workoutRow,
                    index < recentWorkouts.length - 1 && styles.workoutRowBorder,
                  ]}
                  onPress={() => router.push(`/(screens)/workout/${w.id}` as never)}
                  activeOpacity={0.7}
                >
                  <View style={styles.workoutRowInfo}>
                    <Text style={styles.workoutTitle} numberOfLines={1}>
                      {w.title}
                    </Text>
                    <Text style={styles.workoutMeta} numberOfLines={1}>
                      {w.exercises
                        .map((e) => e.exerciseName)
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  </View>
                  <Text style={styles.workoutDate}>{timeAgo(w.completedAt)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {/* Bottom padding */}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Start Workout Sheet ──────────────────────────────────────── */}
      <StartWorkoutSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        routines={routines}
        onStartEmpty={handleStartEmpty}
        onStartRoutine={handleStartRoutine}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060C1B',
  },
  content: {
    padding: 20,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    color: '#718FAF',
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'DMSans-Regular',
  },
  displayName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.4,
    fontFamily: 'BarlowCondensed-Bold',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: '#3B82F630',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  streakCount: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'BarlowCondensed-ExtraBold',
  },

  // ── Start workout button ──────────────────────────────────────────────────
  startWorkoutBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  startWorkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'DMSans-Bold',
  },

  // ── Spacing helpers ───────────────────────────────────────────────────────
  cardGap: {
    marginBottom: 16,
  },
  sectionGap: {
    marginBottom: 24,
  },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#718FAF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'BarlowCondensed-SemiBold',
  },

  // ── Generic card ─────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#0B1326',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#162540',
    padding: 14,
    overflow: 'hidden',
  },

  // ── Suggested routine ────────────────────────────────────────────────────
  routineCard: {
    backgroundColor: '#0B1326',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#162540',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routineInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  routineName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: 'DMSans-Bold',
  },
  routineExercises: {
    color: '#718FAF',
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
  },
  startBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexShrink: 0,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'DMSans-Bold',
  },

  // ── Recent PRs ───────────────────────────────────────────────────────────
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  prRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#162540',
  },
  prName: {
    color: '#A8BDD4',
    fontSize: 13,
    flex: 1,
    marginRight: 10,
    fontFamily: 'DMSans-Regular',
  },
  prValue: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 0,
    fontFamily: 'DMSans-Bold',
  },

  // ── Recent workouts ───────────────────────────────────────────────────────
  recentWorkoutsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recentWorkoutsTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'DMSans-SemiBold',
  },
  seeAllLink: {
    color: '#60a5fa',
    fontSize: 13,
    fontFamily: 'DMSans-Regular',
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  workoutRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#162540',
  },
  workoutRowInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  workoutTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
    fontFamily: 'DMSans-Medium',
  },
  workoutMeta: {
    color: '#718FAF',
    fontSize: 11,
    fontFamily: 'DMSans-Regular',
  },
  workoutDate: {
    color: '#718FAF',
    fontSize: 11,
    flexShrink: 0,
    fontFamily: 'DMSans-Regular',
  },

  // ── Start workout sheet ───────────────────────────────────────────────────
  sheetBackdrop: {
    flex: 1,
    backgroundColor: '#00000080',
  },
  sheet: {
    backgroundColor: '#0B1326',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#162540',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'BarlowCondensed-Bold',
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetList: {
    flexGrow: 0,
  },
  sheetEmptyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#111D36',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sheetEmptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetEmptyText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'DMSans-SemiBold',
  },
  sheetRoutinesHeader: {
    color: '#718FAF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    fontFamily: 'BarlowCondensed-SemiBold',
  },
  sheetRoutineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#162540',
  },
  sheetRoutineInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  sheetRoutineName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: 'DMSans-SemiBold',
  },
  sheetRoutineMeta: {
    color: '#718FAF',
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
  },
});
