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
  isPR?: boolean;
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

// Saved (completed) workout types for history & detail views

export interface SavedWorkoutSet {
  id: string;
  order: number;
  type: 'NORMAL' | 'WARMUP' | 'DROP' | 'FAILURE';
  weight?: number;
  reps?: number;
  isCompleted: boolean;
  isPR: boolean;
}

export interface SavedWorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: SavedWorkoutSet[];
  notes?: string;
}

export interface Workout {
  id: string;
  title: string;
  completedAt: string;
  startTime: string;
  duration: number; // seconds
  volume: number; // total kg lifted
  prCount: number;
  exercises: SavedWorkoutExercise[];
  notes?: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface WorkoutListItem {
  id: string;
  title: string;
  completedAt: string;
  duration: number;
  volume: number;
  prCount: number;
  exercises: { exerciseName: string }[];
  likesCount: number;
  commentsCount: number;
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

// ─── Nutrition Types ────────────────────────────────────────────────────────

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
}

export interface FoodLog {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  createdAt: string;
}

export interface WaterLog {
  id: string;
  amountMl: number;
  loggedAt: string;
}

export interface NutritionSummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalWater: number;
}

export interface SupplementLog {
  id: string;
  name: string;
  dosage?: string;
  loggedAt: string;
}

export interface BarcodeFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
}
