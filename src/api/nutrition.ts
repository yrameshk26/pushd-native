import { api } from './client';
import {
  NutritionGoals,
  FoodLog,
  WaterLog,
  NutritionSummary,
  SupplementLog,
  BarcodeFood,
  MealType,
} from '../types';

export interface FoodLogsResponse {
  logs: FoodLog[];
  summary: NutritionSummary;
}

export interface WaterLogsResponse {
  logs: WaterLog[];
  totalMl: number;
}

export interface SupplementsResponse {
  logs: SupplementLog[];
}

export interface LogFoodPayload {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  date: string;
}

export interface LogSupplementPayload {
  name: string;
  dosage?: string;
  date: string;
}

export async function fetchNutritionGoals(): Promise<NutritionGoals> {
  const { data } = await api.get('/api/nutrition/goals');
  return data;
}

export async function saveNutritionGoals(goals: NutritionGoals): Promise<NutritionGoals> {
  const { data } = await api.post('/api/nutrition/goals', goals);
  return data;
}

export async function fetchFoodLogs(date: string): Promise<FoodLogsResponse> {
  const { data } = await api.get('/api/nutrition', { params: { date } });
  return data;
}

export async function logFood(payload: LogFoodPayload): Promise<FoodLog> {
  const { data } = await api.post('/api/nutrition', payload);
  return data;
}

export async function deleteFood(id: string): Promise<void> {
  await api.delete(`/api/nutrition/${id}`);
}

export async function fetchWaterLogs(date: string): Promise<WaterLogsResponse> {
  const { data } = await api.get('/api/nutrition/water', { params: { date } });
  return data;
}

export async function logWater(amountMl: number, date: string): Promise<WaterLog> {
  const { data } = await api.post('/api/nutrition/water', { amountMl, date });
  return data;
}

export async function deleteWater(id: string): Promise<void> {
  await api.delete(`/api/nutrition/water/${id}`);
}

export async function fetchSupplements(date: string): Promise<SupplementsResponse> {
  const { data } = await api.get('/api/nutrition/supplements', { params: { date } });
  return data;
}

export async function logSupplement(payload: LogSupplementPayload): Promise<SupplementLog> {
  const { data } = await api.post('/api/nutrition/supplements', payload);
  return data;
}

export async function lookupBarcode(barcode: string): Promise<BarcodeFood | null> {
  const { data } = await api.get('/api/nutrition/barcode', { params: { barcode } });
  return data;
}
