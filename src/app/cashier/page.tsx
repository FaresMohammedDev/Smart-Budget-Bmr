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
  Utensils,
  Check,
  Zap,
  UtensilsCrossed,
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  // جلب الطلبات الفعلية من Supabase
  const loadOrders = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => {
      loadOrders();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // تأكيد دفع واستلام الأوردر
  const handleMarkAsPaid = async (orderId: string) => {
    setProcessingId(orderId);
    setMessage('');
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc('mark_order_as_paid', {
        p_order_id: orderId,
      });

      if (rpcError) {
        await supabase
          .from('orders')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', orderId);
      }

      await loadOrders();
      setMessage(`تم تأكيد دفع واستلام الطلب بنجاح!`);
      setTimeout(() => setMessage(''), 4000);
    } catch {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'paid', paid_at: new Date().toISOString() } : o))
      );
      setMessage(`تم تأكيد دفع الطلب!`);
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !searchTerm ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.order_number.toString().includes(searchTerm);

    const matchesStatus =
      statusFilter === 'all' ? true : o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const paidCount = orders.filter((o) => o.status === 'paid').length;
  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFDF9] via-[#FFF6ED] to-[#FFEDE0] text-stone-900 flex flex-col p-4 sm:p-8 space-y-6">
      {/* الرأس */}
      <header className="flex items-center justify-between border-b-2 border-orange-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#BA1A1A] to-[#E8590C] text-white shadow-md shadow-orange-500/25">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900">شاشة كاشير فتح الله ماركت</h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black border border-emerald-200">
                POS Terminal
              </span>
            </div>
            <p className="text-xs text-stone-600 font-bold">تأكيد دفع واستلام بونات الوجبات الساخنة بالمطعم</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="sm" onClick={loadOrders} className="bg-white hover:bg-stone-100 border border-stone-200 shadow-sm text-stone-700 font-bold">
            <RotateCcw className="w-4 h-4 ml-1.5" />
            تحديث
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-white border border-red-200 shadow-sm font-bold"
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
            className="pl-12 text-lg font-bold bg-white border-2 border-orange-200 focus:border-red-500 shadow-sm"
          />
          <QrCode className="w-6 h-6 text-orange-600 absolute left-4 top-4 pointer-events-none" />
        </div>

        {/* فلاتر الحالات: الكل - المؤكدة (المدفوعة) - قيد الانتظار */}
        <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-white border border-stone-200 shadow-sm">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-gradient-to-r from-stone-800 to-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            جميع الطلبات ({orders.length})
          </button>

          <button
            onClick={() => setStatusFilter('paid')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-600 hover:text-emerald-700'
            }`}
          >
            <span className="flex items-center gap-1">
              <span>المؤكدة والمدفوعة</span>
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {paidCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-sm'
                : 'text-stone-600 hover:text-orange-700'
            }`}
          >
            <span>في انتظار الدفع</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {pendingCount}
            </span>
          </button>
        </div>

        {message && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black text-center shadow-sm animate-in fade-in">
            {message}
          </div>
        )}
      </div>

      {/* قائمة الطلبات */}
      <div className="max-w-4xl mx-auto w-full space-y-4">
        <div className="flex items-center justify-between text-sm text-stone-600 font-bold">
          <span>
            {statusFilter === 'paid'
              ? 'الطلبات المؤكدة والمدفوعة:'
              : statusFilter === 'pending'
              ? 'الطلبات في انتظار الدفع واستلام الوجبة:'
              : 'أحدث الطلبات المستلمة من الكيوسك:'}
          </span>
          <span className="text-orange-700 font-black">{filteredOrders.length} طلب</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-stone-500 font-bold">جاري تحميل أحدث الطلبات...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-stone-500 bg-white rounded-3xl border border-stone-200 shadow-sm font-bold">
            لا توجد طلبات مطابقة للبحث حالياً
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-5 rounded-3xl bg-white border border-orange-100 hover:border-orange-300 transition-all shadow-sm hover:shadow-md flex items-center justify-between flex-wrap gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-stone-900">
                      بون استلام #{ord.order_number}
                    </span>
                    <Badge variant={ord.status === 'paid' ? 'success' : 'warning'}>
                      {ord.status === 'paid' ? 'تم الدفع والاستلام' : 'في انتظار الدفع'}
                    </Badge>
                    <span className="text-xs text-stone-500 font-bold inline-flex items-center gap-1">
                      {ord.order_mode === 'smart_budget' ? (
                        <>
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span>(حساب ذكي)</span>
                        </>
                      ) : (
                        <>
                          <UtensilsCrossed className="w-3 h-3 text-orange-500" />
                          <span>(طلب سريع مباشر)</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="text-xs text-stone-500 flex items-center gap-3 font-semibold">
                    <span>{formatDateTime(ord.created_at)}</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-bold">
                      {formatKcal(ord.total_kcal)}
                    </span>
                    <span>•</span>
                    <span>{ord.people_count} أفراد</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <div className="text-xs text-stone-500 font-bold">المطلوب سداده:</div>
                    <div className="text-2xl font-black text-red-600">
                      {formatEgp(ord.total_price)}
                    </div>
                  </div>

                  {ord.status === 'pending' ? (
                    <Button
                      onClick={() => handleMarkAsPaid(ord.id)}
                      disabled={processingId === ord.id}
                      className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{processingId === ord.id ? 'جاري التأكيد...' : 'تأكيد الدفع والاستلام'}</span>
                    </Button>
                  ) : (
                    <span className="text-xs font-black text-emerald-700 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>مدفوع ومسلم</span>
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
