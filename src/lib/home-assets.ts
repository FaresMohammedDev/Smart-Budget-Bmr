// Home-page photos live in Supabase Storage (public bucket `meal-images`, folder `home/`),
// so every device loads the same files. Upload / refresh them with: node scripts/upload-home-assets.mjs

const BUCKET = 'meal-images';
const FOLDER = 'home';

export function homeAsset(name: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  return base ? `${base}/storage/v1/object/public/${BUCKET}/${FOLDER}/${name}.jpg` : null;
}

const urls = (names: string[]) => names.map(homeAsset).filter((u): u is string => Boolean(u));

export const HOME_SLIDES = {
  smart: () => urls(['smart-1', 'smart-2', 'smart-3', 'smart-4']),
  menu: () => urls(['menu-1', 'menu-2', 'menu-3', 'menu-4']),
  strip: () =>
    urls(['float-1', 'menu-3', 'float-2', 'smart-2', 'float-3', 'menu-2', 'float-4', 'smart-3', 'float-5', 'menu-4', 'float-6', 'smart-4']),
};
