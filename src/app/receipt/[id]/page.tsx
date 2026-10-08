'use client';

import { useEffect, useRef, useState } from 'react';
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
  const { resetKiosk, selectedRecommendation, people, budget, orderMode } = usePlannerStore();

  const receiptRef = useRef<HTMLDivElement>(null);
  const [countdown, setCountdown] = useState(45);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [orderPeople, setOrderPeople] = useState<OrderPersonRow[]>([]);
  const [loading, setLoading] = useState(true);

  // دالة الطباعة عبر react-to-print
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Fathalla-Receipt-${orderId}`,
  });

  // جلب بيانات الأوردر من Supabase أو تجهيزها من Zustand Store
  useEffect(() => {
    async function fetchOrderData() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: dbOrder } = await supabase
          .from('orders')
          .select('*, order_items(*), order_people(*)')
          .eq('id', orderId)
          .single();

        if (dbOrder) {
          setOrder(dbOrder);
          setOrderItems(dbOrder.order_items || []);
          setOrderPeople(dbOrder.order_people || []);
        } else {
          // بناء بيانات تجريبية فورية للعرض والطباعة
          const sampleNumber = Math.floor(1000 + Math.random() * 9000);
          const sampleItems: OrderItemRow[] = selectedRecommendation
            ? selectedRecommendation.items.map((it) => ({
                id: `oi-${it.meal.id}`,
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
                  { name_ar: 'مكون رئيسي طازج', name_en: 'Fresh Base', quantity: 150, unit: 'g', kcal: 350 },
                  { name_ar: 'إضافات وبهارات فتح الله', name_en: 'Spices', quantity: 30, unit: 'g', kcal: 50 },
                ],
              }))
            : [
                {
                  id: 'oi-1',
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

          const calculatedTotal = sampleItems.reduce((s, i) => s + i.line_total, 0);
          const calculatedKcal = sampleItems.reduce((s, i) => s + i.unit_kcal * i.quantity, 0);

          setOrder({
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
          });

          setOrderItems(sampleItems);

          if (people.length > 0) {
            setOrderPeople(
              people.map((p, pIdx) => ({
                id: `op-${pIdx}`,
                order_id: orderId,
                name: p.name || `فرد ${pIdx + 1}`,
                age: p.age,
                gender: p.gender,
                height_cm: p.heightCm,
                weight_kg: p.weightKg,
                activity_level: p.activityLevel,
                bmr: 1700,
                tdee: 2500,
                target_kcal: 1000,
                share_percent: Math.round(100 / people.length),
                share_kcal: Math.round(calculatedKcal / people.length),
                share_details: [{ meal_name_ar: 'حصة متوازنة', portion_description: 'وجبة متكاملة' }],
              }))
            );
          }
        }
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }

    fetchOrderData();
  }, [orderId, selectedRecommendation, people, budget, orderMode]);

  // عداد تلقائي للخروج وإعادة ضبط الكيوسك
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
            onClick={() => handlePrint && handlePrint()}
            className="gap-3 text-lg px-8 py-4 shadow-xl"
          >
            <Printer className="w-6 h-6" />
            <span>طباعة البون الآن</span>
          </Button>

          <Button
            variant="secondary"
            size="xl"
            onClick={handleFinish}
            className="gap-2"
          >
            <RotateCcw className="w-5 h-5 text-zinc-400" />
            <span>طلب جديد</span>
          </Button>
        </div>

        {/* معاينة البون (مطابق لما سيخرج من الطابعة الحرارية 80mm) */}
        {loading ? (
          <div className="p-12 text-center text-zinc-500">جاري تجهيز البون...</div>
        ) : order ? (
          <div className="space-y-3">
            <div className="text-center text-xs font-bold text-zinc-400">
              معاينة بون الكاشير الحراري (80mm Thermal Receipt)
            </div>

            <div className="p-4 bg-zinc-900/60 rounded-3xl border border-zinc-800 flex justify-center overflow-x-auto">
              <Receipt
                ref={receiptRef}
                order={order}
                items={orderItems}
                people={orderPeople}
              />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
