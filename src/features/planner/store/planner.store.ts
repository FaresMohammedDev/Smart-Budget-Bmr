import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PersonInput, MealTime } from '../../nutrition/domain/types';
import { Meal, RecommendationOption, PersonShareDetail } from '../../recommendations/domain/types';
import { getDefaultMealTime } from '../../nutrition/domain/meal-fraction';

export interface CartItem {
  meal: Meal;
  quantity: number;
}

interface PlannerState {
  // وضع الطلب: حساب ذكي بالسعرات والميزانية أم منيو سريع E-commerce
  orderMode: 'smart_budget' | 'quick_menu';
  setOrderMode: (mode: 'smart_budget' | 'quick_menu') => void;

  // خطوة الأفراد
  peopleCount: number;
  setPeopleCount: (count: number) => void;
  people: PersonInput[];
  updatePerson: (index: number, person: Partial<PersonInput>) => void;
  setPeople: (people: PersonInput[]) => void;

  // خطوة الميزانية وتوقيت الوجبة
  budget: number;
  setBudget: (budget: number) => void;
  mealTime: MealTime;
  setMealTime: (time: MealTime) => void;

  // الوجبة المختارة للترشيح الذكي وحصص الأفراد الخاصة بها
  selectedRecommendation: RecommendationOption | null;
  setSelectedRecommendation: (rec: RecommendationOption | null) => void;
  selectedShares: PersonShareDetail[];
  setSelectedShares: (shares: PersonShareDetail[]) => void;

  // سلة الشراء لوضع E-Commerce (الطلب السريع)
  cart: CartItem[];
  addToCart: (meal: Meal) => void;
  removeFromCart: (mealId: string) => void;
  updateCartQuantity: (mealId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => { totalPrice: number; totalKcal: number };
  // معرف المجموعة المحفوظة المختارة
  savedGroupId: string | null;
  setSavedGroupId: (id: string | null) => void;

  // إعادة ضبط الكيوسك
  resetKiosk: () => void;
}

const initialPerson: PersonInput = {
  name: 'شخص 1',
  age: 30,
  gender: 'male',
  heightCm: 175,
  weightKg: 75,
  activityLevel: 'moderate',
};

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      orderMode: 'smart_budget',
      setOrderMode: (orderMode) => set({ orderMode }),

      peopleCount: 1,
      setPeopleCount: (peopleCount) => {
        const currentPeople = get().people;
        const newPeople: PersonInput[] = [];
        for (let i = 0; i < peopleCount; i++) {
          newPeople.push(
            currentPeople[i] ?? {
              ...initialPerson,
              name: `شخص ${i + 1}`,
            }
          );
        }
        set({ peopleCount, people: newPeople });
      },

      people: [initialPerson],
      updatePerson: (index, personUpdate) => {
        const currentPeople = [...get().people];
        if (currentPeople[index]) {
          currentPeople[index] = { ...currentPeople[index]!, ...personUpdate };
          set({ people: currentPeople });
        }
      },
      setPeople: (people) => set({ people, peopleCount: people.length }),

      budget: 150,
      setBudget: (budget) => set({ budget }),

      mealTime: getDefaultMealTime(),
      setMealTime: (mealTime) => set({ mealTime }),

      selectedRecommendation: null,
      setSelectedRecommendation: (selectedRecommendation) =>
        set({ selectedRecommendation }),

      selectedShares: [],
      setSelectedShares: (selectedShares) => set({ selectedShares }),

      cart: [],
      addToCart: (meal) => {
        const currentCart = [...get().cart];
        const existing = currentCart.find((i) => i.meal.id === meal.id);
        if (existing) {
          existing.quantity += 1;
        } else {
          currentCart.push({ meal, quantity: 1 });
        }
        set({ cart: currentCart });
      },
      removeFromCart: (mealId) => {
        set({ cart: get().cart.filter((i) => i.meal.id !== mealId) });
      },
      updateCartQuantity: (mealId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(mealId);
        } else {
          const currentCart = [...get().cart];
          const item = currentCart.find((i) => i.meal.id === mealId);
          if (item) {
            item.quantity = quantity;
            set({ cart: currentCart });
          }
        }
      },
      clearCart: () => set({ cart: [] }),
      getCartTotal: () => {
        const cart = get().cart;
        const totalPrice = cart.reduce((sum, item) => {
          const price = item.meal.discount_price ?? item.meal.price;
          return sum + price * item.quantity;
        }, 0);
        const totalKcal = cart.reduce(
          (sum, item) => sum + item.meal.total_kcal * item.quantity,
          0
        );
        return { totalPrice, totalKcal };
      },

      savedGroupId: null,
      setSavedGroupId: (savedGroupId) => set({ savedGroupId }),

      resetKiosk: () =>
        set({
          orderMode: 'smart_budget',
          savedGroupId: null,
          peopleCount: 1,
          people: [initialPerson],
          budget: 150,
          mealTime: getDefaultMealTime(),
          selectedRecommendation: null,
          selectedShares: [],
          cart: [],
        }),
    }),
    {
      name: 'smart-budget-kiosk-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
