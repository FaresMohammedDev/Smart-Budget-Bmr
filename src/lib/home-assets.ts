// صور الصفحة الرئيسية بتتخزن في Supabase Storage (bucket عام `meal-images`، فولدر `home/`)
// علشان تظهر من أي جهاز. لرفعها أو تحديثها: node scripts/upload-home-assets.mjs
// لو متغيرات Supabase مش موجودة وقت البناء (زي نشر من غير env) بنرجع لنفس الصور من مصدرها الأصلي
// علشان الصفحة ما تفضلش فاضية.

const BUCKET = 'meal-images';
const FOLDER = 'home';

// نفس القائمة في scripts/upload-home-assets.mjs: خلّيهم متطابقين.
const PHOTO_IDS: Record<string, string> = {
  'smart-1': '1544025162-d76694265947',
  'smart-2': '1546069901-ba9599a7e63c',
  'smart-3': '1512621776951-a57141f2eefd',
  'smart-4': '1598515214211-89d3c73ae83b',
  'menu-1': '1562967914-608f82629710',
  'menu-2': '1529006557810-274b9b2fc783',
  'menu-3': '1568901346375-23c9450c58cd',
  'menu-4': '1555939594-58d7cb561ad1',
  'float-1': '1509722747041-616f39b57569',
  'float-2': '1585937421612-70a008356fbe',
  'float-3': '1551183053-bf91a1d81141',
  'float-4': '1504674900247-0877df9cc836',
  'float-5': '1541544741938-0af808871cc0',
  'float-6': '1546173159-315724a31696',
};

export function homeAsset(name: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (base) return `${base}/storage/v1/object/public/${BUCKET}/${FOLDER}/${name}.jpg`;
  return `https://images.unsplash.com/photo-${PHOTO_IDS[name]}?w=1400&auto=format&fit=crop&q=80`;
}

const urls = (names: string[]) => names.map(homeAsset);

export const HOME_SLIDES = {
  smart: () => urls(['smart-1', 'smart-2', 'smart-3', 'smart-4']),
  menu: () => urls(['menu-1', 'menu-2', 'menu-3', 'menu-4']),
  strip: () =>
    urls(['float-1', 'menu-3', 'float-2', 'smart-2', 'float-3', 'menu-2', 'float-4', 'smart-3', 'float-5', 'menu-4', 'float-6', 'smart-4']),
};
