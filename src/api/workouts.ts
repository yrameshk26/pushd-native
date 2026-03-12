import { api } from './client';
import { Workout, WorkoutListItem, Comment } from '../types';

export interface WorkoutsResponse {
  workouts: WorkoutListItem[];
  nextCursor?: string;
}

export interface CommentsResponse {
  comments: Comment[];
}

export async function fetchWorkouts(cursor?: string, limit = 20): Promise<WorkoutsResponse> {
  const params: Record<string, string | number> = { limit };
  if (cursor) params.cursor = cursor;
  const { data } = await api.get('/api/workouts', { params });
  return data;
}

export async function fetchWorkout(id: string): Promise<Workout> {
  const { data } = await api.get(`/api/workouts/${id}`);
  return data;
}

export async function deleteWorkout(id: string): Promise<void> {
  await api.delete(`/api/workouts/${id}`);
}

export async function likeWorkout(id: string): Promise<{ liked: boolean; likesCount: number }> {
  const { data } = await api.post(`/api/workouts/${id}/like`);
  return data;
}

export async function fetchComments(workoutId: string): Promise<CommentsResponse> {
  const { data } = await api.get(`/api/workouts/${workoutId}/comments`);
  return data;
}

export async function addComment(workoutId: string, content: string): Promise<Comment> {
  const { data } = await api.post(`/api/workouts/${workoutId}/comments`, { content });
  return data;
}

export async function saveAsTemplate(id: string, name: string): Promise<void> {
  await api.post(`/api/workouts/${id}/save-as-template`, { name });
}
