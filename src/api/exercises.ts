import { api } from './client';
import { Exercise } from '../types';

export interface ExerciseListResponse {
  exercises: Exercise[];
  total: number;
}

export async function fetchExercises(params: {
  search?: string;
  muscle?: string;
  equipment?: string;
  page?: number;
}): Promise<ExerciseListResponse> {
  const { data } = await api.get('/api/exercises', { params: { pageSize: 30, ...params } });
  return data;
}

export interface ExerciseDetail extends Exercise {
  muscleGroups?: string[];
  equipment: string;
  instructions?: string[];
  description?: string;
  difficulty?: string;
  isCustom?: boolean;
}

export async function fetchExerciseById(id: string): Promise<ExerciseDetail> {
  const { data } = await api.get(`/api/exercises/${id}`);
  // API may wrap in a data envelope or return directly
  return data?.data ?? data;
}

export interface CreateExercisePayload {
  name: string;
  primaryMuscle: string;
  muscleGroups: string[];
  equipment: string;
  instructions: string[];
  description?: string;
  isCustom: true;
}

export async function createCustomExercise(payload: CreateExercisePayload): Promise<ExerciseDetail> {
  const { data } = await api.post('/api/exercises', payload);
  return data?.data ?? data;
}
