'use client';

import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatEgp, formatKcal, formatDateTime } from '@/lib/format';
import { OrderRow, OrderItemRow, OrderPersonRow } from '@/types/database.types';

export interface ReceiptProps {
  order: OrderRow;
  items: OrderItemRow[];
  people?: OrderPersonRow[];
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(
  ({ order, items, people = [] }, ref) => {
    return (
      <div
        ref={ref}
        className="w-[80mm] max-w-[80mm] mx-auto bg-white text-black p-4 font-mono text-[11px] leading-tight select-none border border-zinc-200 shadow-sm print:border-none print:shadow-none"
        dir="rtl"
      >
        {/* رأس البون */}
        <div className="text-center pb-2 border-b-2 border-dashed border-black">
          <div className="text-base font-black tracking-wider uppercase">
            فتح الله ماركت
          </div>
          <div className="text-[10px] font-semibold">FATHALLA MARKET - 1948</div>
          <div className="text-[10px] mt-0.5">قسم الوجبات الجاهزة والمطعم</div>
          <div className="text-xs font-bold mt-1 bg-black text-white py-0.5 px-2 inline-block rounded">
            بون استلام وجبة #{order.order_number}
          </div>
        </div>

        {/* تفاصيل الوقت والطلب */}
        <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
          <div className="flex justify-between">
            <span>التاريخ:</span>
            <span>{formatDateTime(order.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span>نوع الطلب:</span>
            <span className="font-bold">
              {order.order_mode === 'smart_budget'
                ? `حساب ذكي (${order.people_count} أفراد)`
                : 'طلب سريع مباشر'}
            </span>
          </div>
          {order.budget && (
            <div className="flex justify-between">
              <span>الميزانية المحددة:</span>
              <span>{formatEgp(order.budget)}</span>
            </div>
          )}
        </div>

        {/* جدول الوجبات */}
        <div className="py-2 border-b-2 border-dashed border-black">
          <div className="font-bold text-[11px] mb-1">تفاصيل الوجبات:</div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="border-b border-dotted border-zinc-300 pb-1.5 last:border-none">
                <div className="flex justify-between font-bold text-[11px]">
                  <span>
                    {item.quantity} × {item.meal_name_ar}
                  </span>
                  <span>{formatEgp(item.line_total)}</span>
                </div>
                <div className="text-[9px] text-zinc-600 flex justify-between mt-0.5">
                  <span>سعرات الصنف: {formatKcal(item.unit_kcal * item.quantity)}</span>
                  <span>({formatEgp(item.unit_price)} للواحدة)</span>
                </div>

                {/* تفصيل مكونات الصنف والسعرات المحسوبة */}
                {item.components && item.components.length > 0 && (
                  <div className="mt-1 pr-2 border-r-2 border-zinc-400 text-[8.5px] text-zinc-700 space-y-0.5">
                    {item.components.map((comp, cIdx) => (
                      <div key={cIdx} className="flex justify-between">
                        <span>• {comp.name_ar} ({comp.quantity} {comp.unit})</span>
                        <span>{comp.kcal} سعرة</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ملخص الحساب والسعرات */}
        <div className="py-2 border-b-2 border-dashed border-black space-y-1">
          <div className="flex justify-between text-xs font-black">
            <span>إجمالي الحساب:</span>
            <span>{formatEgp(order.total_price)}</span>
          </div>
          <div className="flex justify-between text-[10px] font-bold">
            <span>إجمالي السعرات الحرارية:</span>
            <span>{formatKcal(order.total_kcal)}</span>
          </div>
          {order.required_kcal && (
            <div className="flex justify-between text-[9px] text-zinc-600">
              <span>الاحتياج الغذائي المستهدف:</span>
              <span>{formatKcal(order.required_kcal)}</span>
            </div>
          )}
        </div>

        {/* نصيب كل فرد في حالة المجموعة */}
        {people.length > 0 && (
          <div className="py-2 border-b border-dashed border-black text-[9.5px]">
            <div className="font-bold text-[10px] mb-1">نصيب كل فرد من الوجبة:</div>
            <div className="space-y-1">
              {people.map((p, pIdx) => (
                <div key={pIdx} className="bg-zinc-100 p-1 rounded">
                  <div className="flex justify-between font-bold">
                    <span>{p.name} ({p.share_percent}%):</span>
                    <span>{formatKcal(p.share_kcal)}</span>
                  </div>
                  {p.share_details && p.share_details.length > 0 && (
                    <div className="text-[8.5px] text-zinc-600 mt-0.5">
                      {p.share_details.map((d, dIdx) => (
                        <div key={dIdx}>• {d.portion_description}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QR Code للكاشير */}
        <div className="pt-3 pb-2 text-center flex flex-col items-center">
          <div className="p-1.5 bg-white border border-black rounded inline-block">
            <QRCodeSVG
              value={order.id}
              size={96}
              level="M"
              includeMargin={false}
            />
          </div>
          <div className="text-[8px] font-mono mt-1 text-zinc-600 uppercase">
            ID: {order.id.slice(0, 18)}...
          </div>
          <div className="text-[9px] font-bold mt-1 text-zinc-900">
            امسح الباركود لتأكيد الدفع والاستلام
          </div>
        </div>

        {/* رسالة الختام */}
        <div className="text-center pt-1 text-[8.5px] text-zinc-500 border-t border-dotted border-zinc-400">
          شكراً لتسوقكم في فتح الله ماركت · طازج يومياً
        </div>
      </div>
    );
  }
);
Receipt.displayName = 'Receipt';
