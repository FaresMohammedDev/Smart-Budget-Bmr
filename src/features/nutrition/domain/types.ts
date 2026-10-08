/**
 * أنواع بيانات التغذية والحسابات الحيوية
 */

export type Gender = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface PersonInput {
  id?: string;
  name: string;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
}

export interface PersonNutrition {
  id: string;
  name: string;
  bmr: number;
  tdee: number;
  targetKcal: number;
  sharePercent: number;
}
