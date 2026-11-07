'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { Printer, RotateCcw, Wallet, Flame, ShoppingBag } from 'lucide-react';
import { KioskHeader } from '@/components/layout/KioskHeader';
import { Button } from '@/components/ui/Button';
import { Receipt } from '@/features/orders/components/Receipt';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { formatEgp, formatKcal } from '@/lib/format';

import { getOrder, errorMessage } from '@/lib/data/repository';
import { endCustomerSession } from '@/lib/data/session';
import type { OrderDetails } from '@/lib/data/order';

const AUTO_RESET_SECONDS = 60;

// قصاصات احتفال ثابتة (من غير عشوائية وقت العرض)
const CONFETTI = [
  { x: 6, dx: 40, d: 0, t: 4.2, c: '#6B0F1A' }, { x: 14, dx: -30, d: 0.3, t: 3.8, c: '#E5A91E' },
  { x: 22, dx: 60, d: 0.1, t: 4.6, c: '#16A34A' }, { x: 31, dx: -50, d: 0.6, t: 4, c: '#E5A91E' },
  { x: 40, dx: 30, d: 0.2, t: 4.4, c: '#6B0F1A' }, { x: 49, dx: -20, d: 0.8, t: 3.9, c: '#D97706' },
  { x: 57, dx: 50, d: 0.4, t: 4.5, c: '#16A34A' }, { x: 65, dx: -60, d: 0.05, t: 4.1, c: '#6B0F1A' },
  { x: 73, dx: 25, d: 0.7, t: 4.3, c: '#E5A91E' }, { x: 81, dx: -35, d: 0.25, t: 3.7, c: '#D97706' },
  { x: 89, dx: 45, d: 0.5, t: 4.7, c: '#6B0F1A' }, { x: 95, dx: -25, d: 0.15, t: 4, c: '#16A34A' },
];

export default function ReceiptPrintPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = (params?.id as string) || '';
  const { resetKiosk } = usePlannerStore();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [countdown, setCountdown] = useState(AUTO_RESET_SECONDS);
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    getOrder(orderId).then(data => { if (active) setDetails(data); }).catch(error => { if (active) setErrorMsg(errorMessage(error)); });
    return () => { active = false; };
  }, [orderId, retry]);
  const order = details?.order.id === orderId ? details.order : undefined;
  const orderItems = details?.items ?? [];
  const orderPeople = details?.people ?? [];
  const itemsCount = orderItems.reduce((sum, i) => sum + i.quantity, 0);

  // طباعة البون المحفوظ عبر حوار الطباعة في المتصفح.
  const printAction = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `SmartBudget-Receipt-${order?.order_number}`,
    onPrintError: (_location, error) => setErrorMsg(errorMessage(error)),
  });

  const handlePrintClick = () => {
    if (!order) return;
    if (order && receiptRef.current) {
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
    if (!order) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [order]);

  const handleFinish = useCallback(async () => {
    try {
      await endCustomerSession();
      resetKiosk();
      router.push('/');
    } catch (error) { setErrorMsg(errorMessage(error)); }
  }, [resetKiosk, router]);
  useEffect(() => {
    if (countdown === 0) endCustomerSession().then(() => { resetKiosk(); router.push('/'); }).catch(error => setErrorMsg(errorMessage(error)));
  }, [countdown, resetKiosk, router]);

  const ringR = 22;
  const ringC = 2 * Math.PI * ringR;

  return (
    <div className="relative min-h-screen lg:h-screen overflow-x-clip lg:overflow-hidden bg-[#F8F4EE] text-[#1E1210] flex flex-col select-none">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="anim-blob absolute -top-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-[#6B0F1A]/12 blur-3xl" />
        <div className="anim-blob-slow absolute -bottom-40 -left-28 w-[34rem] h-[34rem] rounded-full bg-[#E5A91E]/20 blur-3xl" />
      </div>

      <KioskHeader />

      <main className="relative z-10 flex-1 min-h-0 w-full max-w-[92rem] mx-auto px-4 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-[1fr_23rem] gap-5">
        {/* النجاح */}
        <section className="anim-fade-up relative overflow-hidden rounded-[2rem] bg-white/90 backdrop-blur border-2 border-[#E7D7C7] shadow-[0_18px_40px_-22px_rgba(43,24,16,0.35)] p-6 flex flex-col items-center justify-center gap-5 text-center min-h-[24rem]">
          {order && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              {CONFETTI.map((c, i) => (
                <span
                  key={i}
                  className="anim-confetti absolute top-0 w-2.5 h-4 rounded-sm"
                  style={{
                    right: `${c.x}%`,
                    background: c.c,
                    ['--dx' as string]: `${c.dx}px`,
                    ['--delay' as string]: `${c.d}s`,
                    ['--dur' as string]: `${c.t}s`,
                    ['--rot' as string]: `${(i % 2 ? 1 : -1) * 540}deg`,
                  }}
                />
              ))}
            </div>
          )}

          <div className="relative">
            {order && <span className="anim-ring absolute inset-0 rounded-full border-4 border-emerald-400" />}
            <span
              className={`relative w-28 h-28 rounded-full flex items-center justify-center border-4 ${
                order ? 'bg-emerald-50 border-emerald-500 anim-pop' : 'bg-stone-100 border-stone-300'
              }`}
            >
              {order ? (
                <svg viewBox="0 0 52 52" className="w-16 h-16" fill="none" stroke="#15803D" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path className="anim-draw" style={{ ['--len' as string]: 40, animationDelay: '0.25s' }} d="M14 27 L23 36 L39 17" />
                </svg>
              ) : errorMsg ? (
                <span className="text-4xl font-black text-red-600">!</span>
              ) : (
                <span className="w-10 h-10 border-4 border-[#6B0F1A] border-t-transparent rounded-full animate-spin" />
              )}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black">
            {order ? 'تم الطلب' : errorMsg ? 'تعذر تحميل الطلب' : '...'}
          </h1>

          {order && (
            <>
              <div className="anim-fade-up" style={{ animationDelay: '300ms' }}>
                <div className="text-sm font-black text-stone-500">رقم الطلب</div>
                <div dir="ltr" className="text-[clamp(3.5rem,8vw,6rem)] font-black leading-none text-[#6B0F1A] tabular-nums tracking-tight">
                  #{order.order_number}
                </div>
              </div>

              <div className="anim-fade-up flex items-center justify-center gap-2.5 flex-wrap text-sm font-black tabular-nums" style={{ animationDelay: '420ms' }}>
                <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FAF0F0] border-2 border-[#6B0F1A]/25 text-[#6B0F1A]">
                  <ShoppingBag className="w-4 h-4" />
                  {itemsCount}
                </span>
                <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FEF9EE] border-2 border-[#D97706]/35 text-[#854D0E]">
                  <Wallet className="w-4 h-4" />
                  {formatEgp(order.total_price)}
                </span>
                <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-50 border-2 border-emerald-300 text-emerald-800">
                  <Flame className="w-4 h-4" />
                  {formatKcal(order.total_kcal)}
                </span>
              </div>

              <p className="anim-fade-up text-2xl font-black text-stone-700" style={{ animationDelay: '540ms' }}>
                توجه للكاشير
              </p>
            </>
          )}

          {errorMsg && (
            <div role="alert" className="space-y-3">
              <p className="text-lg font-bold text-red-700">{errorMsg}</p>
              <Button onClick={() => { setErrorMsg(''); setDetails(null); setRetry((r) => r + 1); }}>إعادة</Button>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 flex-wrap pt-1">
            <Button size="xl" variant="primary" onClick={handlePrintClick} disabled={!order} className="gap-3 text-lg px-9 font-black select-none">
              <Printer className="w-6 h-6 stroke-[2.25]" />
              <span>طباعة البون</span>
            </Button>

            <Button variant="outline" size="xl" onClick={handleFinish} className="gap-3 select-none font-black text-stone-800">
              <span className="relative w-[3.25rem] h-[3.25rem] -my-2 -mr-3 flex items-center justify-center">
                {order && (
                  <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90" aria-hidden="true">
                    <circle cx="26" cy="26" r={ringR} fill="none" stroke="#EADBCB" strokeWidth="4" />
                    <circle
                      cx="26" cy="26" r={ringR} fill="none" stroke="#6B0F1A" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={ringC}
                      strokeDashoffset={ringC * (1 - countdown / AUTO_RESET_SECONDS)}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                )}
                <span className="relative text-sm font-black tabular-nums text-[#6B0F1A]">{order ? countdown : <RotateCcw className="w-5 h-5" />}</span>
              </span>
              <span>طلب جديد</span>
            </Button>
          </div>
        </section>

        {/* معاينة البون (تطابق الورق الحراري 80mm) */}
        <section className="anim-fade-up min-h-0 flex justify-center overflow-y-auto rounded-[2rem] bg-[#EADBCB]/60 border-2 border-[#E7D7C7] p-4" style={{ animationDelay: '150ms' }}>
          <div className="drop-shadow-xl h-fit">
            <div className="ticket-edge bg-white pb-3">
              <div ref={receiptRef}>
                {order && orderItems.length > 0 ? (
                  <Receipt order={order} items={orderItems} people={orderPeople} />
                ) : (
                  <div className="w-[80mm] max-w-full h-64 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-[#6B0F1A] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
