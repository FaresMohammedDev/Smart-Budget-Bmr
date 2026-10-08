'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import {
  Printer,
  CheckCircle2,
  RotateCcw,
  Clock,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { KioskHeader } from '@/components/layout/KioskHeader';
import { Button } from '@/components/ui/Button';
import { Receipt } from '@/features/orders/components/Receipt';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { OrderRow, OrderItemRow, OrderPersonRow } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';

export default function ReceiptPrintPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = (params?.id as string) || 'ord-sample';
  const {
    resetKiosk,
    selectedRecommendation,
    selectedShares,
    people,
    budget,
    orderMode,
    cart,
  } = usePlannerStore();

  const receiptRef = useRef<HTMLDivElement>(null);
  const [countdown, setCountdown] = useState(60);

  // 1. بناء بيانات الأوردر الفورية من الحالة المحلية لضمان جاهزية البون فوراً
  const initialOrderData = useMemo(() => {
    const sampleNumber = Math.floor(1000 + Math.random() * 9000);

    let items: OrderItemRow[] = [];

    if (orderMode === 'quick_menu' && cart.length > 0) {
      items = cart.map((c, idx) => ({
        id: `oi-${idx}`,
        order_id: orderId,
        meal_id: c.meal.id,
        meal_name_ar: c.meal.name_ar,
        meal_name_en: c.meal.name_en,
        portion_type: c.meal.portion_type,
        unit_price: c.meal.discount_price ?? c.meal.price,
        quantity: c.quantity,
        unit_kcal: c.meal.total_kcal,
        line_total: (c.meal.discount_price ?? c.meal.price) * c.quantity,
        components: [
          { name_ar: 'مكونات فتح الله الطازجة', name_en: 'Fresh Items', quantity: 150, unit: 'g', kcal: c.meal.total_kcal },
        ],
      }));
    } else if (selectedRecommendation) {
      items = selectedRecommendation.items.map((it, idx) => ({
        id: `oi-${idx}`,
        order_id: orderId,
        meal_id: it.meal.id,
        meal_name_ar: it.meal.name_ar,
        meal_name_en: it.meal.name_en,
        portion_type: it.meal.portion_type,
        unit_price: it.meal.discount_price ?? it.meal.price,
        quantity: it.quantity,
        unit_kcal: it.meal.total_kcal,
        line_total: (it.meal.discount_price ?? it.meal.price) * it.quantity,
        components: [
          { name_ar: 'مكون رئيسي', name_en: 'Main Base', quantity: 150, unit: 'g', kcal: Math.round(it.meal.total_kcal * 0.7) },
          { name_ar: 'توابل وإضافات', name_en: 'Seasonings', quantity: 30, unit: 'g', kcal: Math.round(it.meal.total_kcal * 0.3) },
        ],
      }));
    } else {
      items = [
        {
          id: 'oi-default',
          order_id: orderId,
          meal_id: 'm1',
          meal_name_ar: 'ساندوتش شاورما فراخ',
          meal_name_en: 'Chicken Shawarma Sandwich',
          portion_type: 'individual',
          unit_price: 85,
          quantity: 2,
          unit_kcal: 550,
          line_total: 170,
          components: [
            { name_ar: 'شاورما فراخ', name_en: 'Chicken', quantity: 120, unit: 'g', kcal: 240 },
            { name_ar: 'عيش سوري', name_en: 'Syrian Bread', quantity: 1, unit: 'piece', kcal: 200 },
          ],
        },
      ];
    }

    const calculatedTotal = items.reduce((s, i) => s + i.line_total, 0);
    const calculatedKcal = items.reduce((s, i) => s + i.unit_kcal * i.quantity, 0);

    const initialOrder: OrderRow = {
      id: orderId,
      order_number: sampleNumber,
      user_id: 'guest',
      group_id: null,
      order_mode: orderMode,
      people_count: people.length || 1,
      budget: budget || calculatedTotal,
      meal_fraction: 0.4,
      daily_tdee_total: 2500,
      required_kcal: 1000,
      total_kcal: calculatedKcal,
      total_price: calculatedTotal,
      status: 'pending',
      paid_at: null,
      created_at: new Date().toISOString(),
    };

    const initialPeople: OrderPersonRow[] =
      people.length > 0
        ? people.map((p, idx) => {
            const sh = selectedShares[idx];
            return {
              id: `op-${idx}`,
              order_id: orderId,
              name: p.name || `فرد ${idx + 1}`,
              age: p.age,
              gender: p.gender,
              height_cm: p.heightCm,
              weight_kg: p.weightKg,
              activity_level: p.activityLevel,
              bmr: 1700,
              tdee: 2500,
              target_kcal: 1000,
              share_percent: sh?.sharePercent ?? Math.round(100 / people.length),
              share_kcal: sh?.shareKcal ?? Math.round(calculatedKcal / people.length),
              share_details: sh?.allocatedItems?.map((a) => ({
                meal_name_ar: a.mealNameAr,
                portion_description: a.portionDescription,
              })) ?? [{ meal_name_ar: 'حصة متوازنة', portion_description: 'وجبة متكاملة' }],
            };
          })
        : [];

    return { order: initialOrder, items, people: initialPeople };
  }, [orderId, orderMode, cart, selectedRecommendation, selectedShares, people, budget]);

  const [order, setOrder] = useState<OrderRow>(initialOrderData.order);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>(initialOrderData.items);
  const [orderPeople, setOrderPeople] = useState<OrderPersonRow[]>(initialOrderData.people);

  // محاولة جلب أحدث البيانات من Supabase إن وُجدت
  useEffect(() => {
    async function syncWithServer() {
      try {
        const supabase = createClient();
        const { data: dbOrder } = await supabase
          .from('orders')
          .select('*, order_items(*), order_people(*)')
          .eq('id', orderId)
          .single();

        if (dbOrder) {
          setOrder(dbOrder);
          if (dbOrder.order_items?.length > 0) setOrderItems(dbOrder.order_items);
          if (dbOrder.order_people?.length > 0) setOrderPeople(dbOrder.order_people);
        }
      } catch {
        // الاعتماد على البيانات المحلية الجاهزة
      }
    }

    syncWithServer();
  }, [orderId]);

  // دالة الطباعة بمكتبة react-to-print مع fallback آمن 100%
  const printAction = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Fathalla-Receipt-${order.order_number}`,
  });

  const handlePrintClick = () => {
    if (receiptRef.current) {
      try {
        printAction();
      } catch {
        window.print();
      }
    } else {
      window.print();
    }
  };

  // عداد الخروج التلقائي
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          resetKiosk();
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, resetKiosk]);

  const handleFinish = () => {
    resetKiosk();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <KioskHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-8">
        {/* شارة النجاح */}
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            تم تسجيل طلبك بنجاح!
          </h1>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto">
            يرجى طباعة البون أدناه والتوجه به إلى كاشير قسم الوجبات بفتح الله ماركت لتأكيد الدفع واستلام الوجبة فوراً.
          </p>

          <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 pt-2">
            <Clock className="w-4 h-4 text-[#F37A20]" />
            <span>سيتم إعادة ضبط الشاشة تلقائياً بعد: </span>
            <span className="font-bold text-[#F37A20] text-sm">{countdown} ثانية</span>
          </div>
        </div>

        {/* أزرار التحكم بالطباعة */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button
            size="xl"
            onClick={handlePrintClick}
            className="gap-3 text-lg px-8 py-4 shadow-xl select-none"
          >
            <Printer className="w-6 h-6" />
            <span>طباعة البون الآن</span>
          </Button>

          <Button
            variant="secondary"
            size="xl"
            onClick={handleFinish}
            className="gap-2 select-none"
          >
            <RotateCcw className="w-5 h-5 text-zinc-400" />
            <span>طلب جديد</span>
          </Button>
        </div>

        {/* معاينة البون (تطابق الورق الحراري 80mm) */}
        <div className="space-y-3">
          <div className="text-center text-xs font-bold text-zinc-400">
            معاينة بون الكاشير الحراري (80mm Thermal Receipt)
          </div>

          <div className="p-4 bg-zinc-900/60 rounded-3xl border border-zinc-800 flex justify-center overflow-x-auto">
            {/* الحاوية المضمونة للـ Ref */}
            <div ref={receiptRef}>
              <Receipt
                order={order}
                items={orderItems}
                people={orderPeople}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
