/**
 * أنواع بيانات الترشيحات والوجبات وتقسيم الحصص
 */

export type MealKind = 'main' | 'side' | 'drink' | 'dessert';
export type PortionType = 'individual' | 'shareable';

export interface FoodComponent {
  name_ar: string;
  name_en: string;
  quantity: number;
  unit: string;
  kcal: number;
}

export interface Meal {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar?: string | null;
  description_en?: string | null;
  price: number;
  discount_price?: number | null;
  is_expiring_soon: boolean;
  is_available: boolean;
  total_kcal: number;
  kind: MealKind;
  portion_type: PortionType;
  servings: number;
  image_url: string;
  components?: FoodComponent[];
}

export interface ComboItem {
  meal: Meal;
  quantity: number;
}

export type RecommendationBadge =
  | 'special_offer' // عرض خاص فتح الله (قربت الصلاحية / خصم فوري)
  | 'best_fit' // الأنسب علمياً لاحتياج السعرات
  | 'saving' // الأوفر في الميزانية
  | 'filling'; // الأكثر إشباعاً

export interface RecommendationOption {
  id: string;
  title_ar: string;
  badge: RecommendationBadge;
  items: ComboItem[];
  totalPrice: number;
  totalKcal: number;
  kcalDifference: number; // الفرق عن المستهدف
  score: number;
  isExpiringSoonOffer: boolean;
}

export interface PersonShareDetail {
  personName: string;
  sharePercent: number;
  shareKcal: number;
  allocatedItems: {
    mealNameAr: string;
    portionDescription: string; // "2 ساندوتش" أو "35% من الصينية"
  }[];
}

export type EngineResult =
  | {
      status: 'success';
      targetKcal: number;
      budget: number;
      recommendations: RecommendationOption[];
      sharesByPerson?: PersonShareDetail[];
    }
  | {
      status: 'low_budget';
      budget: number;
      cheapestMealPrice: number;
      missingAmount: number;
      apologyMessageAr: string;
      suggestedSides: ComboItem[];
      sidesTotalPrice: number;
      sidesTotalKcal: number;
    };
