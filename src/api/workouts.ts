import { api } from './client';
import { Workout, SavedWorkoutExercise, WorkoutListItem, Comment } from '../types';

export interface WorkoutsResponse {
  workouts: WorkoutListItem[];
  nextCursor?: string;
}

export interface CommentsResponse {
  comments: Comment[];
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function fetchWorkouts(cursor?: string, limit = 20): Promise<WorkoutsResponse> {
  const params: Record<string, string | number> = { limit };
  if (cursor) params.cursor = cursor;
  const { data: envelope } = await api.get('/api/workouts', { params });

  // API returns { data: [...], total, hasMore } (no cursor) or
  // { data: [...] } when cursor param is provided.
  // Normalise to our WorkoutsResponse shape.
  const rawItems: Record<string, unknown>[] = envelope.data ?? envelope.workouts ?? [];

  const workouts: WorkoutListItem[] = rawItems.map((w) => ({
    id: w.id as string,
    title: w.title as string,
    completedAt: (w.completedAt ?? w.startTime) as string,
    duration: (w.duration ?? 0) as number,
    volume: (w.totalVolume ?? w.volume ?? 0) as number,
    prCount: (w.prCount ?? 0) as number,
    exercises: ((w.exercises ?? []) as Record<string, unknown>[]).map((ex) => ({
      exerciseName:
        (ex.exerciseName as string | undefined) ??
        ((ex.exercise as Record<string, unknown> | undefined)?.name as string | undefined) ??
        '',
    })),
    likesCount: ((w._count as Record<string, unknown> | undefined)?.likes ?? w.likesCount ?? 0) as number,
    commentsCount: ((w._count as Record<string, unknown> | undefined)?.comments ?? w.commentsCount ?? 0) as number,
  }));

  // Derive nextCursor: when cursor is provided the API skips the cursor item,
  // so if we got back `limit` items there may be more.
  let nextCursor: string | undefined;
  if (envelope.hasMore && workouts.length > 0) {
    nextCursor = workouts[workouts.length - 1].id;
  } else if (cursor && workouts.length === limit) {
    nextCursor = workouts[workouts.length - 1].id;
  }

  return { workouts, nextCursor };
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export async function fetchWorkout(id: string): Promise<Workout> {
  const { data: envelope } = await api.get(`/api/workouts/${id}`);
  // API returns { data: workout }
  const w = envelope.data ?? envelope;

  const normalized: Workout = {
    ...w,
    completedAt: w.completedAt ?? w.startTime,
    duration: w.duration ?? null,
    volume: w.totalVolume ?? w.volume ?? 0,
    prCount: w.prCount ?? 0,
    likesCount: w._count?.likes ?? w.likesCount ?? 0,
    commentsCount: w._count?.comments ?? w.commentsCount ?? 0,
    isLiked: w.isLiked ?? false,
    exercises: (w.exercises ?? []).map(
      (ex: SavedWorkoutExercise & { exercise?: { id?: string; name: string; primaryMuscle: string; gifUrl?: string | null } }) => ({
        ...ex,
        exerciseName: ex.exerciseName ?? ex.exercise?.name ?? '',
        exercise: ex.exercise ?? {
          id: ex.exerciseId,
          name: ex.exerciseName ?? '',
          primaryMuscle: '',
          gifUrl: null,
        },
      }),
    ),
  };
  return normalized;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

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
