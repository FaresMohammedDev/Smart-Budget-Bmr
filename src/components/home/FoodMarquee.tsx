import Image from 'next/image';

/** شريط صور متحرك بلا نهاية (الصور من التخزين السحابي). */
export function FoodMarquee({ images }: { images: string[] }) {
  if (images.length === 0) return null;
  const loop = [...images, ...images];

  return (
    <div
      dir="ltr"
      aria-hidden="true"
      className="marquee-mask relative overflow-hidden py-1"
    >
      <div className="anim-marquee flex w-max gap-4">
        {loop.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative w-28 h-20 shrink-0 rounded-2xl overflow-hidden border-2 border-white shadow-md rotate-0 even:-translate-y-0.5"
          >
            <Image src={src} alt="" fill unoptimized sizes="112px" className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}
