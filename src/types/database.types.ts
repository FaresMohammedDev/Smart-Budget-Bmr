/**
 * تعريفات جداول وقواعد بيانات Supabase لمشروع Smart Budget
 */

export type UserRole = 'customer' | 'cashier' | 'admin';
export type GenderType = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type MealKind = 'main' | 'side' | 'drink' | 'dessert';
export type PortionType = 'individual' | 'shareable';
export type OrderStatus = 'pending' | 'paid' | 'cancelled';
export type OrderMode = 'smart_budget' | 'quick_menu';

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FoodItemRow {
  id: string;
  name_ar: string;
  name_en: string;
  unit: 'g' | 'ml' | 'piece';
  kcal_per_unit: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealRow {
  id: string;
  category_id: string | null;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  image_url: string;
  price: number;
  discount_price: number | null;
  is_expiring_soon: boolean;
  kind: MealKind;
  portion_type: PortionType;
  servings: number;
  total_kcal: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealItemRow {
  meal_id: string;
  food_item_id: string;
  quantity: number;
}

export interface SavedGroupRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMemberRow {
  id: string;
  group_id: string;
  name: string;
  age: number;
  gender: GenderType;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  sort_order: number;
  created_at: string;
}

export interface OrderRow {
  id: string;
  order_number: number;
  user_id: string;
  group_id: string | null;
  order_mode: OrderMode;
  people_count: number;
  budget: number | null;
  meal_fraction: number | null;
  daily_tdee_total: number | null;
  required_kcal: number | null;
  total_kcal: number;
  total_price: number;
  status: OrderStatus;
  paid_at: string | null;
  created_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  meal_id: string | null;
  meal_name_ar: string;
  meal_name_en: string;
  portion_type: PortionType;
  unit_price: number;
  quantity: number;
  unit_kcal: number;
  line_total: number;
  components: {
    name_ar: string;
    name_en: string;
    quantity: number;
    unit: string;
    kcal: number;
  }[];
}

export interface OrderPersonRow {
  id: string;
  order_id: string;
  name: string;
  age: number;
  gender: GenderType;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  bmr: number;
  tdee: number;
  target_kcal: number;
  share_percent: number;
  share_kcal: number;
  share_details: {
    meal_name_ar: string;
    portion_description: string;
  }[];
}
