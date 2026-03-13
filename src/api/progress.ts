import { api } from './client';

export interface ProgressSummary {
  totalWorkouts: number;
  totalVolume: number;
  totalPRs: number;
  currentStreak: number;
  recentPRs: PREntry[];
  popularExercises: PopularExercise[];
  achievementCount: number;
}

export interface PREntry {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  achievedAt: string;
}

export interface PopularExercise {
  exerciseId: string;
  exerciseName: string;
  sessionCount: number;
}

export interface ExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  estimated1RM: number;
  bestWeight: number;
  bestReps: number;
  bestVolume: number;
  sessions: ExerciseSession[];
}

export interface ExerciseSession {
  id: string;
  date: string;
  topWeight: number;
  topReps: number;
  totalVolume: number;
}

export interface OneRMData {
  exerciseId: string;
  exerciseName: string;
  estimated1RM: number;
  history: { date: string; value: number }[];
}

export interface BodyWeightEntry {
  id: string;
  weight: number;
  bodyFat?: number;
  recordedAt: string;
}

export interface BodyWeightResponse {
  entries: BodyWeightEntry[];
}

export interface StrengthStandard {
  exerciseId: string;
  exerciseName: string;
  standards: {
    untested: number;
    novice: number;
    intermediate: number;
    advanced: number;
    elite: number;
  };
  userRatio?: number;
  userLevel?: string;
}

export interface UserStreak {
  streak: number;
  lastWorkoutDate?: string;
}

export interface UserStats {
  totalWorkouts: number;
  totalVolume: number;
  totalPRs: number;
  achievements: Achievement[];
  earnedAchievementCount: number;
  totalAchievementCount: number;
}

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  icon: string;
  earnedAt?: string;
  isEarned: boolean;
}

export async function fetchProgressSummary(): Promise<ProgressSummary> {
  const { data } = await api.get('/api/progress/overview');
  return data;
}

export async function fetchExerciseProgress(exerciseId: string): Promise<ExerciseProgress> {
  const { data } = await api.get(`/api/progress/${exerciseId}`);
  return data;
}

export async function fetchExercise1RM(exerciseId: string): Promise<OneRMData> {
  const { data } = await api.get(`/api/progress/${exerciseId}/1rm`);
  return data;
}

export async function fetchExerciseSessions(exerciseId: string): Promise<ExerciseSession[]> {
  const { data } = await api.get(`/api/progress/${exerciseId}/sessions`);
  return data.sessions ?? data;
}

export async function fetchBodyWeights(): Promise<BodyWeightResponse> {
  const { data } = await api.get('/api/bodyweight');
  return data;
}

export async function addBodyWeight(weight: number, bodyFat?: number): Promise<BodyWeightEntry> {
  const { data } = await api.post('/api/bodyweight', { weight, bodyFat });
  return data;
}

export async function fetchStrengthStandards(liftId: string): Promise<StrengthStandard> {
  const { data } = await api.get<{ bodyweight: number | null; lifts: any[] }>(
    '/api/progress/strength-standards',
  );
  const lifts: any[] = data?.lifts ?? [];
  // liftId may be hyphenated ('bench-press') while API uses spaces ('bench press')
  const normalizedId = liftId.replace(/-/g, ' ');
  const lift = lifts.find((l) => l.exercise === normalizedId) ?? lifts[0];
  if (!lift) throw new Error('Lift not found');

  const s = lift.standards ?? {};
  return {
    exerciseId: lift.exercise,
    exerciseName: lift.displayName,
    standards: {
      // API uses 'beginner', native UI uses 'untested'
      untested: s.beginner ?? 0.5,
      novice: s.novice ?? 0.75,
      intermediate: s.intermediate ?? 1.0,
      advanced: s.advanced ?? 1.5,
      elite: s.elite ?? 2.0,
    },
    userRatio: lift.ratio ?? undefined,
    userLevel: lift.level ?? undefined,
  };
}

export async function fetchUserStreak(): Promise<UserStreak> {
  const { data } = await api.get('/api/users/streak');
  return data;
}

export async function fetchUserStats(): Promise<UserStats> {
  const { data } = await api.get('/api/users/me/stats');
  return data;
}
