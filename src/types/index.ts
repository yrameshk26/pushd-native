export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: string;
  equipment: string;
  gifUrl?: string;
}

export interface WorkoutSet {
  id?: string;
  order: number;
  type: 'NORMAL' | 'WARMUP' | 'DROP' | 'FAILURE';
  weight?: number;
  reps?: number;
  isCompleted: boolean;
}

export interface WorkoutExercise {
  localId: string; // temp ID before saving
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: WorkoutSet[];
  notes?: string;
}

export interface ActiveWorkout {
  id?: string; // set after API creates it
  title: string;
  startTime: Date;
  exercises: WorkoutExercise[];
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  _count: { exercises: number };
  exercises?: RoutineExercise[];
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  order: number;
  targetSets: number;
  targetReps?: number;
  notes?: string;
}
