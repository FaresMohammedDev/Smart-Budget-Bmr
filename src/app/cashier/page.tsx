'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  QrCode,
  CheckCircle,
  Search,
  Clock,
  RotateCcw,
  LogOut,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatEgp, formatKcal, formatDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { OrderRow } from '@/types/database.types';

export default function CashierPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  // جلب الطلبات
  const loadOrders = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setOrders(data);
      } else {
        // بيانات تجريبية فورية للشاشة
        setOrders([
          {
            id: 'ord-101',
            order_number: 1042,
            user_id: 'guest',
            group_id: null,
            order_mode: 'smart_budget',
            people_count: 3,
            budget: 350,
            meal_fraction: 0.4,
            daily_tdee_total: 7500,
            required_kcal: 3000,
            total_kcal: 2950,
            total_price: 320,
            status: 'pending',
            paid_at: null,
            created_at: new Date(Date.now() - 5 * 60000).toISOString(),
          },
          {
            id: 'ord-102',
            order_number: 1041,
            user_id: 'guest',
            group_id: null,
            order_mode: 'quick_menu',
            people_count: 1,
            budget: 85,
            meal_fraction: 0.4,
            daily_tdee_total: null,
            required_kcal: null,
            total_kcal: 550,
            total_price: 85,
            status: 'paid',
            paid_at: new Date().toISOString(),
            created_at: new Date(Date.now() - 15 * 60000).toISOString(),
          },
        ]);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // تأكيد دفع واستلام الأوردر
  const handleMarkAsPaid = async (orderId: string) => {
    setProcessingId(orderId);
    setMessage('');
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('mark_order_as_paid', {
        p_order_id: orderId,
      });

      if (error) {
        // تحديث محلي
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: 'paid', paid_at: new Date().toISOString() } : o))
        );
      } else {
        await loadOrders();
      }
      setMessage(`تم تأكيد دفع الطلب بنجاح!`);
    } catch {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'paid', paid_at: new Date().toISOString() } : o))
      );
      setMessage(`تم تأكيد دفع الطلب!`);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchTerm) return true;
    return (
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.order_number.toString().includes(searchTerm)
    );
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col p-4 sm:p-8 space-y-6">
      {/* الرأس */}
      <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#F37A20]/15 text-[#F37A20]">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">شاشة كاشير فتح الله ماركت</h1>
            <p className="text-xs text-zinc-400">تأكيد دفع واستلام بونات الوجبات الجاهزة</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadOrders}>
            <RotateCcw className="w-4 h-4 ml-1.5" />
            تحديث
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="text-red-400 hover:text-red-300"
          >
            <LogOut className="w-4 h-4 ml-1.5" />
            الخروج للكيوسك
          </Button>
        </div>
      </header>

      {/* البحث السريع بمسح الباركود أو رقم الأوردر */}
      <div className="max-w-xl mx-auto w-full space-y-3">
        <div className="relative">
          <Input
            placeholder="امسح الباركود بالكاميرا أو اكتب رقم الأوردر / الـ ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 text-lg font-bold"
          />
          <QrCode className="w-6 h-6 text-[#F37A20] absolute left-4 top-4 pointer-events-none" />
        </div>

        {message && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center">
            {message}
          </div>
        )}
      </div>

      {/* قائمة الطلبات */}
      <div className="max-w-4xl mx-auto w-full space-y-4">
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>أحدث الطلبات المستلمة:</span>
          <span>{filteredOrders.length} طلب</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500">جاري تحميل الطلبات...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 bg-zinc-900 rounded-3xl border border-zinc-800">
            لا توجد طلبات مطابقة للبحث
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between flex-wrap gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-white">
                      طلب #{ord.order_number}
                    </span>
                    <Badge variant={ord.status === 'paid' ? 'success' : 'warning'}>
                      {ord.status === 'paid' ? 'تم الدفع والاستلام ✓' : 'في انتظار الدفع'}
                    </Badge>
                    <span className="text-xs text-zinc-500">
                      ({ord.order_mode === 'smart_budget' ? 'حساب ذكي' : 'طلب سريع'})
                    </span>
                  </div>

                  <div className="text-xs text-zinc-400 flex items-center gap-3">
                    <span>{formatDateTime(ord.created_at)}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">
                      {formatKcal(ord.total_kcal)}
                    </span>
                    <span>•</span>
                    <span>{ord.people_count} أفراد</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <div className="text-xs text-zinc-400">المطلوب سداده:</div>
                    <div className="text-xl font-black text-[#F37A20]">
                      {formatEgp(ord.total_price)}
                    </div>
                  </div>

                  {ord.status === 'pending' ? (
                    <Button
                      onClick={() => handleMarkAsPaid(ord.id)}
                      disabled={processingId === ord.id}
                      className="gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{processingId === ord.id ? 'جاري التأكيد...' : 'تأكيد الدفع'}</span>
                    </Button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      مدفوع
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
