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
  const { data } = await api.get('/api/progress/summary');
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

export async function fetchStrengthStandards(exerciseId: string): Promise<StrengthStandard> {
  const { data } = await api.get('/api/progress/strength-standards', { params: { exerciseId } });
  return data;
}

export async function fetchUserStreak(): Promise<UserStreak> {
  const { data } = await api.get('/api/users/streak');
  return data;
}

export async function fetchUserStats(): Promise<UserStats> {
  const { data } = await api.get('/api/users/me/stats');
  return data;
}
