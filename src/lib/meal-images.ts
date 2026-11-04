/**
 * صور الوجبات والأكلات الطازجة الحقيقية عالية الدقة لمطعم فتح الله
 * توفر صوراً احترافية وشهية بنمط مطاعم الوجبات السريعة العالمية
 */

export const MEAL_IMAGE_MAP: Record<string, string> = {
  // شاورما
  'ساندوتش شاورما فراخ': 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&auto=format&fit=crop&q=80',
  'ساندوتش شاورما فراخ سوري سوبر': 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&auto=format&fit=crop&q=80',
  'شاورما فراخ': 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&auto=format&fit=crop&q=80',

  // كفتة ومشويات
  'ساندوتش كفتة': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
  'طبق كفتة مشوية على الفحم مع سلطات': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
  'صينية مشويات مشكلة عائلي': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',

  // فراخ ودجاج
  'ربع فرخة مشوية بالأرز': 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&auto=format&fit=crop&q=80',
  'وجبة كرسبي تشيكن ستريبس مقرمشة': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=800&auto=format&fit=crop&q=80',

  // كبدة
  'ساندوتش كبدة إسكندراني': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',

  // طعمية وفلافل وفول
  'ساندوتش طعمية': 'https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?w=800&auto=format&fit=crop&q=80',
  'ساندوتش فلافل': 'https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?w=800&auto=format&fit=crop&q=80',
  'طبق فول بالعيش': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=80',

  // مكرونة بشاميل
  'صينية مكرونة بشاميل عائلي': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=80',
  'صينية مكرونة بشاميل صغيرة': 'https://images.unsplash.com/photo-1621996346565-e3d5d6281781?w=800&auto=format&fit=crop&q=80',

  // مقبلات وسلطات
  'بطاطس محمرة': 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=800&auto=format&fit=crop&q=80',
  'سلطة خضراء': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
  'سلطة طحينة': 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop&q=80',

  // مشروبات
  'مياه معدنية': 'https://images.unsplash.com/photo-1559839914-17aae19cec71?w=800&auto=format&fit=crop&q=80',
  'مشروب غازي': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop&q=80',
};

/**
 * دالة ذكية لإرجاع صورة شهية حقيقية مطابقة لأي اسم وجبة
 */
export function getMealImageUrl(mealNameAr?: string, existingUrl?: string | null): string {
  // إذا كانت الصورة الحالية رابط إنسبلاش صالح وليست placeholder
  if (
    existingUrl &&
    !existingUrl.includes('meal-placeholder') &&
    !existingUrl.includes('fathalla-logo') &&
    existingUrl.startsWith('http')
  ) {
    return existingUrl;
  }

  if (!mealNameAr) {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80';
  }

  const name = mealNameAr.trim();

  // مطابقة تامة
  if (MEAL_IMAGE_MAP[name]) {
    return MEAL_IMAGE_MAP[name];
  }

  // مطابقة بالكلمات المفتاحية
  if (name.includes('شاورما')) {
    return 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('كفتة') || name.includes('كباب')) {
    return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('مشويات') || name.includes('مشوي')) {
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('فراخ') || name.includes('دجاج') || name.includes('تشيكن') || name.includes('كرسبي')) {
    return 'https://images.unsplash.com/photo-1562967914-608f82629710?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('كبدة')) {
    return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('طعمية') || name.includes('فلافل')) {
    return 'https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('فول')) {
    return 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('بشاميل') || name.includes('مكرونة')) {
    return 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('بطاطس') || name.includes('فرايز')) {
    return 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('طحينة')) {
    return 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('سلطة')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('ماء') || name.includes('مياه')) {
    return 'https://images.unsplash.com/photo-1559839914-17aae19cec71?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('غازي') || name.includes('مشروب') || name.includes('بيبسي') || name.includes('كولا')) {
    return 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop&q=80';
  }

  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80';
}
