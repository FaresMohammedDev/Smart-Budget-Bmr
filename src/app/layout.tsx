import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  title: 'Smart Budget | فتح الله ماركت',
  description: 'النظام الذكي لاقتراح الوجبات حسب السعرات والميزانية - فتح الله ماركت',
  icons: {
    icon: '/images/fathalla-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-950 text-zinc-100 font-sans selection:bg-[#F37A20] selection:text-white flex flex-col">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
