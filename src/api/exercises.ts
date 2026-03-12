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
