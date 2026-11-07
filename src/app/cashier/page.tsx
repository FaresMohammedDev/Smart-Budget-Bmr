'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, RotateCcw, LogOut, Check, CheckCircle2, Calculator, UtensilsCrossed, Users, Flame, Search, Banknote, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCountUp } from '@/components/people/KcalRing';
import { formatEgp, formatKcal } from '@/lib/format';
import { listOrders, markOrderPaid, getOrder, errorMessage } from '@/lib/data/repository';
import type { OrderDetails } from '@/lib/data/order';
import { OrderRow } from '@/types/database.types';

type Filter = 'all' | 'pending' | 'paid';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'pending', label: 'منتظر' },
  { id: 'paid', label: 'مدفوع' },
  { id: 'all', label: 'الكل' },
];

function shortTime(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString()
    ? time
    : `${d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} · ${time}`;
}

const statusMeta = (s: string) =>
  s === 'paid'
    ? { label: 'مدفوع', cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' }
    : s === 'cancelled'
    ? { label: 'ملغي', cls: 'bg-stone-100 text-stone-600 border-stone-300' }
    : { label: 'منتظر', cls: 'bg-amber-50 text-amber-800 border-amber-300' };

export default function CashierPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Filter>('pending');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // جلب الطلبات الفعلية
  const loadOrders = useCallback(async () => {
    try {
      setOrders(await listOrders(searchTerm));
      setErrorMsg('');
    } catch (error) {
      setErrorMsg(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const debounce = setTimeout(loadOrders, 250);
    const interval = setInterval(loadOrders, 5000);
    return () => {
      clearTimeout(debounce);
      clearInterval(interval);
    };
  }, [loadOrders]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 2800);
    return () => clearTimeout(t);
  }, [message]);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !searchTerm || o.id.toLowerCase().includes(searchTerm.toLowerCase()) || o.order_number.toString().includes(searchTerm);
    return matchesSearch && (statusFilter === 'all' || o.status === statusFilter);
  });

  const pending = orders.filter((o) => o.status === 'pending');
  const pendingCount = pending.length;
  const paidCount = orders.filter((o) => o.status === 'paid').length;
  const pendingTotal = pending.reduce((sum, o) => sum + Number(o.total_price), 0);

  // اختيار تلقائي لأول طلب (أو الاحتفاظ بالمختار لو لسه موجود)
  const effectiveId =
    selectedId && filteredOrders.some((o) => o.id === selectedId) ? selectedId : (filteredOrders[0]?.id ?? null);
  const selected = filteredOrders.find((o) => o.id === effectiveId) ?? null;

  useEffect(() => {
    if (!effectiveId) return;
    let active = true;
    getOrder(effectiveId)
      .then((d) => { if (active) setDetails(d); })
      .catch(() => { if (active) setDetails(null); });
    return () => { active = false; };
  }, [effectiveId, selected?.status]);

  const shownDetails = details && details.order.id === effectiveId ? details : null;
  const totalShown = useCountUp(Number(selected?.total_price ?? 0), 400);

  const handleMarkAsPaid = async (id: string) => {
    if (processingId) return;
    setProcessingId(id);
    setMessage('');
    setErrorMsg('');
    try {
      await markOrderPaid(id);
      await loadOrders();
      setMessage('تم الدفع');
    } catch (error) {
      setErrorMsg(errorMessage(error));
    } finally {
      setProcessingId(null);
    }
  };

  const glass =
    'rounded-[2rem] bg-white/90 backdrop-blur border-2 border-[#E7D7C7] shadow-[0_18px_40px_-22px_rgba(43,24,16,0.35)]';

  return (
    <div className="relative min-h-screen lg:h-screen overflow-x-clip lg:overflow-hidden bg-[#F8F4EE] text-[#1E1210] flex flex-col select-none">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="anim-blob absolute -top-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-[#6B0F1A]/12 blur-3xl" />
        <div className="anim-blob-slow absolute -bottom-40 -left-28 w-[34rem] h-[34rem] rounded-full bg-[#E5A91E]/20 blur-3xl" />
      </div>

      <header className="relative z-20 bg-white/95 backdrop-blur-md border-b-2 border-[#E7D7C7] px-4 sm:px-8 py-3 flex items-center gap-3">
        <h1 dir="ltr" className="text-2xl font-black tracking-tight">
          Smart <span className="text-[#6B0F1A]">Budget</span>
        </h1>
        <span className="px-4 py-1.5 rounded-full bg-[#6B0F1A] text-white text-sm font-black">الكاشير</span>
        <div className="flex-1" />
        {pendingCount > 0 && (
          <span className="hidden sm:flex items-center gap-2 text-sm font-black text-amber-800">
            <span className="relative flex w-2.5 h-2.5">
              <span className="anim-ring absolute inset-0 rounded-full bg-amber-500" />
              <span className="relative w-2.5 h-2.5 rounded-full bg-amber-500" />
            </span>
            <span className="tabular-nums">{pendingCount}</span>
          </span>
        )}
        <Button variant="outline" size="sm" onClick={loadOrders} className="font-bold text-xs">
          <RotateCcw className="w-4 h-4 ml-1.5" />
          تحديث
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push('/')} className="font-bold text-xs text-red-700">
          <LogOut className="w-4 h-4 ml-1.5" />
          خروج
        </Button>
      </header>

      {errorMsg && (
        <p role="alert" className="anim-fade-up fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-full bg-red-700 text-white font-black text-sm shadow-2xl">
          {errorMsg}
        </p>
      )}
      {message && (
        <p role="status" className="anim-fade-up fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-full bg-emerald-700 text-white font-black text-sm shadow-2xl flex items-center gap-2">
          <Check className="w-5 h-5 stroke-[3]" />
          {message}
        </p>
      )}

      <main className="relative z-10 flex-1 min-h-0 w-full max-w-[92rem] mx-auto px-4 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-[1fr_27rem] gap-4">
        {/* قائمة الطلبات */}
        <section className={`${glass} anim-fade-up min-h-0 p-4 flex flex-col gap-3`}>
          <div className="relative">
            <input
              ref={searchRef}
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="رقم الطلب أو QR"
              aria-label="بحث"
              className="w-full h-14 rounded-2xl bg-white border-2 border-[#D6C7B2] pr-12 pl-14 text-xl font-black focus:outline-none focus:border-[#6B0F1A] placeholder:text-stone-400 placeholder:font-bold"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-stone-400 pointer-events-none" />
            <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 text-[#6B0F1A] pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            {FILTERS.map((f) => {
              const on = statusFilter === f.id;
              const count = f.id === 'pending' ? pendingCount : f.id === 'paid' ? paidCount : orders.length;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`flex-1 h-12 rounded-2xl border-2 font-black flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
                    on
                      ? 'bg-gradient-to-b from-[#8B1422] to-[#6B0F1A] text-white border-[#3E080F] shadow-[0_4px_0_0_#3E080F] -translate-y-0.5'
                      : 'bg-white border-[#D6C7B2] text-stone-600 hover:border-[#6B0F1A]/50'
                  }`}
                >
                  {f.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs tabular-nums ${on ? 'bg-white/20' : 'bg-[#F8F4EE] text-[#6B0F1A]'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-h-[14rem] lg:min-h-0 overflow-y-auto -mx-1 px-1 py-1 space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white/70 border-2 border-[#E7D7C7] animate-pulse" />)
            ) : filteredOrders.length === 0 ? (
              <div className="h-full min-h-[10rem] flex flex-col items-center justify-center gap-2 text-stone-300">
                <Inbox className="w-16 h-16 stroke-1" />
                <span className="font-black text-stone-500">مفيش طلبات</span>
              </div>
            ) : (
              filteredOrders.map((o, idx) => {
                const on = o.id === effectiveId;
                const st = statusMeta(o.status);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelectedId(o.id)}
                    className={`anim-fade-up w-full text-right rounded-2xl border-2 p-3 flex items-center gap-3 transition-all duration-200 cursor-pointer ${
                      on ? 'bg-[#FAF0F0] border-[#6B0F1A] shadow-md -translate-x-1' : 'bg-white border-[#E7D7C7] hover:border-[#6B0F1A]/50'
                    }`}
                    style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}
                  >
                    <span className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${o.order_mode === 'smart_budget' ? 'bg-[#6B0F1A] text-white' : 'bg-[#E5A91E] text-[#3E080F]'}`}>
                      {o.order_mode === 'smart_budget' ? <Calculator className="w-5 h-5" /> : <UtensilsCrossed className="w-5 h-5" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span dir="ltr" className="block text-2xl font-black tabular-nums leading-tight text-right">#{o.order_number}</span>
                      <span className="flex items-center gap-2 text-xs font-bold text-stone-500 tabular-nums">
                        <span>{shortTime(o.created_at)}</span>
                        {o.people_count > 1 && (
                          <span className="flex items-center gap-0.5">
                            <Users className="w-3.5 h-3.5" />
                            {o.people_count}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="text-left shrink-0">
                      <span className="block text-xl font-black text-[#6B0F1A] tabular-nums">{formatEgp(Number(o.total_price))}</span>
                      <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full border-2 text-xs font-black ${st.cls}`}>{st.label}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {pendingCount > 0 && (
            <div className="flex items-center justify-between rounded-2xl bg-amber-50 border-2 border-amber-300 px-4 py-2.5 text-amber-900">
              <span className="font-black text-sm">منتظر · {pendingCount}</span>
              <span className="font-black text-xl tabular-nums">{formatEgp(pendingTotal)}</span>
            </div>
          )}
        </section>

        {/* تفاصيل الطلب */}
        <aside className={`${glass} anim-fade-up min-h-0 p-5 flex flex-col gap-4`} style={{ animationDelay: '120ms' }}>
          {!selected ? (
            <div className="flex-1 min-h-[14rem] flex flex-col items-center justify-center gap-2 text-stone-300">
              <QrCode className="w-20 h-20 stroke-1" />
              <span className="font-black text-stone-500">اختار طلب</span>
            </div>
          ) : (
            <>
              <div key={selected.id} className="anim-fade-up flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-stone-500">الطلب</div>
                  <div dir="ltr" className="text-6xl font-black text-[#6B0F1A] tabular-nums leading-none text-right">#{selected.order_number}</div>
                </div>
                <span className={`px-4 py-1.5 rounded-full border-2 text-sm font-black ${statusMeta(selected.status).cls}`}>
                  {statusMeta(selected.status).label}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs font-black tabular-nums">
                <span className="px-3 py-1 rounded-full bg-[#F8F4EE] border-2 border-[#E7D7C7] text-stone-600">{shortTime(selected.created_at)}</span>
                <span className="px-3 py-1 rounded-full bg-emerald-50 border-2 border-emerald-300 text-emerald-800 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  {formatKcal(Number(selected.total_kcal))}
                </span>
                {selected.people_count > 1 && (
                  <span className="px-3 py-1 rounded-full bg-[#FAF0F0] border-2 border-[#6B0F1A]/25 text-[#6B0F1A] flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {selected.people_count}
                  </span>
                )}
              </div>

              <div className="flex-1 min-h-[6rem] overflow-y-auto -mx-1 px-1 space-y-1.5">
                {shownDetails ? (
                  shownDetails.items.map((it, i) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-xl bg-[#F8F4EE] border-2 border-[#E7D7C7] px-3 py-2">
                      <span className="w-9 h-9 rounded-full bg-[#6B0F1A] text-white font-black text-sm flex items-center justify-center shrink-0">×{it.quantity}</span>
                      <span className="flex-1 min-w-0 font-black truncate">{it.meal_name_ar}</span>
                      <span className="font-black text-[#6B0F1A] tabular-nums shrink-0">{formatEgp(Number(it.line_total))}</span>
                    </div>
                  ))
                ) : (
                  <div className="space-y-1.5">
                    {[0, 1].map((i) => <div key={i} className="h-12 rounded-xl bg-white/70 border-2 border-[#E7D7C7] animate-pulse" />)}
                  </div>
                )}
              </div>

              <div className="flex items-baseline justify-between border-t-2 border-[#EADBCB] pt-3">
                <span className="font-black text-stone-600">الإجمالي</span>
                <span className="text-5xl font-black text-[#6B0F1A] tabular-nums">{formatEgp(totalShown)}</span>
              </div>

              {selected.status === 'pending' ? (
                <Button
                  size="xl"
                  variant="primary"
                  onClick={() => handleMarkAsPaid(selected.id)}
                  disabled={processingId === selected.id}
                  className="w-full gap-3 py-5 text-2xl font-black"
                >
                  <Banknote className="w-8 h-8" />
                  <span>{processingId === selected.id ? '...' : 'تأكيد الدفع'}</span>
                </Button>
              ) : (
                <div className="h-16 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-800 flex items-center justify-center gap-2 text-xl font-black">
                  <CheckCircle2 className="w-7 h-7" />
                  {statusMeta(selected.status).label}
                </div>
              )}
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
