import { create } from 'zustand';
import { ActiveWorkout, WorkoutExercise, WorkoutSet } from '../types';
import { api } from '../api/client';

let localIdCounter = 0;
const newLocalId = () => `local-${++localIdCounter}`;

interface WorkoutStore {
  active: ActiveWorkout | null;
  elapsedSeconds: number;

  startWorkout: (title: string) => void;
  startFromRoutine: (routineId: string, routineName: string, exercises: Omit<WorkoutExercise, 'localId'>[]) => void;
  addExercise: (exercise: Omit<WorkoutExercise, 'localId' | 'sets'>) => void;
  removeExercise: (localId: string) => void;
  reorderExercise: (localId: string, direction: 'up' | 'down') => void;
  replaceExercise: (localId: string, newExercise: { exerciseId: string; exerciseName: string }) => void;
  addSet: (localId: string) => void;
  removeSet: (localId: string, setIndex: number) => void;
  updateSet: (localId: string, setIndex: number, patch: Partial<WorkoutSet>) => void;
  toggleSetComplete: (localId: string, setIndex: number) => void;
  updateTitle: (title: string) => void;
  tick: () => void;
  finishWorkout: () => Promise<void>;
  discardWorkout: () => void;
}

const defaultSet = (order: number): WorkoutSet => ({
  order,
  type: 'NORMAL',
  isCompleted: false,
  weight: undefined,
  reps: undefined,
});

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  active: null,
  elapsedSeconds: 0,

  startWorkout: (title) => {
    set({
      active: { title, startTime: new Date(), exercises: [] },
      elapsedSeconds: 0,
    });
  },

  startFromRoutine: (routineId, routineName, exercises) => {
    set({
      active: {
        title: routineName,
        startTime: new Date(),
        exercises: exercises.map((e) => ({
          ...e,
          localId: newLocalId(),
          sets: Array.from({ length: e.sets?.length || 3 }, (_, i) => defaultSet(i)),
        })),
      },
      elapsedSeconds: 0,
    });
  },

  addExercise: (exercise) => {
    const active = get().active;
    if (!active) return;
    set({
      active: {
        ...active,
        exercises: [
          ...active.exercises,
          { ...exercise, localId: newLocalId(), sets: [defaultSet(0)] },
        ],
      },
    });
  },

  removeExercise: (localId) => {
    const active = get().active;
    if (!active) return;
    set({
      active: {
        ...active,
        exercises: active.exercises.filter((e) => e.localId !== localId),
      },
    });
  },

  reorderExercise: (localId, direction) => {
    const active = get().active;
    if (!active) return;
    const exercises = active.exercises;
    const index = exercises.findIndex((e) => e.localId === localId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= exercises.length) return;
    const reordered = exercises.map((e, i) => {
      if (i === index) return { ...exercises[targetIndex], order: index };
      if (i === targetIndex) return { ...exercises[index], order: targetIndex };
      return e;
    });
    set({ active: { ...active, exercises: reordered } });
  },

  replaceExercise: (localId, newExercise) => {
    const active = get().active;
    if (!active) return;
    set({
      active: {
        ...active,
        exercises: active.exercises.map((e) =>
          e.localId !== localId
            ? e
            : { ...e, exerciseId: newExercise.exerciseId, exerciseName: newExercise.exerciseName },
        ),
      },
    });
  },

  addSet: (localId) => {
    const active = get().active;
    if (!active) return;
    set({
      active: {
        ...active,
        exercises: active.exercises.map((e) =>
          e.localId !== localId ? e : { ...e, sets: [...e.sets, defaultSet(e.sets.length)] },
        ),
      },
    });
  },

  removeSet: (localId, setIndex) => {
    const active = get().active;
    if (!active) return;
    set({
      active: {
        ...active,
        exercises: active.exercises.map((e) =>
          e.localId !== localId ? e : { ...e, sets: e.sets.filter((_, i) => i !== setIndex) },
        ),
      },
    });
  },

  updateSet: (localId, setIndex, patch) => {
    const active = get().active;
    if (!active) return;
    set({
      active: {
        ...active,
        exercises: active.exercises.map((e) =>
          e.localId !== localId ? e : {
            ...e,
            sets: e.sets.map((s, i) => i === setIndex ? { ...s, ...patch } : s),
          },
        ),
      },
    });
  },

  toggleSetComplete: (localId, setIndex) => {
    const active = get().active;
    if (!active) return;
    set({
      active: {
        ...active,
        exercises: active.exercises.map((e) =>
          e.localId !== localId ? e : {
            ...e,
            sets: e.sets.map((s, i) => i === setIndex ? { ...s, isCompleted: !s.isCompleted } : s),
          },
        ),
      },
    });
  },

  updateTitle: (title) => {
    const active = get().active;
    if (!active) return;
    set({ active: { ...active, title } });
  },

  tick: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),

  finishWorkout: async () => {
    const { active } = get();
    if (!active) return;

    await api.post('/api/workouts', {
      title: active.title,
      startTime: active.startTime.toISOString(),
      exercises: active.exercises.map((e, ei) => ({
        exerciseId: e.exerciseId,
        order: ei,
        notes: e.notes,
        sets: e.sets.map((s, si) => ({
          order: si,
          type: s.type,
          weight: s.weight,
          reps: s.reps,
          isCompleted: s.isCompleted,
        })),
      })),
    });

    set({ active: null, elapsedSeconds: 0 });
  },

  discardWorkout: () => set({ active: null, elapsedSeconds: 0 }),
}));
