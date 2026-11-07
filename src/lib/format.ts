/**
 * دوال تنسيق العملة والسعرات والتواريخ باللغة العربية
 */

export function formatEgp(amount: number): string {
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ج.م`;
}

export function formatKcal(kcal: number): string {
  return `${Math.round(kcal).toLocaleString('en-US')} سعرة`;
}

export function formatDateTime(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleString('ar-EG-u-nu-latn', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
