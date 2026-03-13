export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: string;
  equipment: string;
  gifUrl?: string;
  thumbnailUrl?: string;
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
  thumbnailUrl?: string | null;
  gifUrl?: string | null;
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
  weight?: number | null;
  reps?: number | null;
  isCompleted: boolean;
  isPR: boolean;
}

export interface SavedWorkoutExercise {
  id: string;
  exerciseId: string;
  /** Convenience alias kept for backward compat; prefer exercise.name */
  exerciseName: string;
  order: number;
  sets: SavedWorkoutSet[];
  notes?: string;
  exercise: {
    id: string;
    name: string;
    primaryMuscle: string;
    gifUrl?: string | null;
  };
}

export interface Workout {
  id: string;
  title: string;
  /** ISO date string of when the workout was saved/completed */
  completedAt: string;
  startTime: string;
  /** Duration in seconds */
  duration: number | null;
  /** Total volume in kg — may be computed client-side */
  volume: number;
  prCount: number;
  exercises: SavedWorkoutExercise[];
  notes?: string | null;
  workoutTag?: string | null;
  photoUrl?: string | null;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  _count?: { likes: number; comments: number };
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
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
  timing?: string;
  taken: boolean;
  loggedAt: string;
}

export interface MealTemplate {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servingSize?: string;
}

export interface MealIngredient {
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  amount?: string;
  unit?: string;
}

export interface SavedMeal {
  id: string;
  name: string;
  description?: string;
  ingredients?: MealIngredient[];
  createdAt: string;
}

export interface CalorieBurnEntry {
  id: string;
  title: string;
  duration?: number;
  estimated: number;
}

export interface CalorieBurnResponse {
  entries: CalorieBurnEntry[];
  totalBurned: number;
}

export interface BarcodeFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
}

// ─── Meal Plan Types ─────────────────────────────────────────────────────────

export interface MealPlanMeal {
  id: string;
  name: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description?: string;
}

export interface MealPlanDay {
  dayNumber: number;
  label: string; // e.g. "Day 1", "Monday"
  meals: MealPlanMeal[];
}

export interface MealPlan {
  id: string;
  name: string;
  description?: string;
  totalDays: number;
  calorieTarget: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatTarget?: number;
  days: MealPlanDay[];
  createdAt: string;
}

export interface MealPlanListItem {
  id: string;
  name: string;
  description?: string;
  totalDays: number;
  calorieTarget: number;
  createdAt: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: 'PRODUCE' | 'PROTEINS' | 'DAIRY' | 'GRAINS' | 'OTHER';
}

export interface GroceryList {
  planId: string;
  items: GroceryItem[];
}
