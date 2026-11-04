import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-arabic',
  display: 'swap',
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
    <html lang="ar" dir="rtl" className={`${ibmPlexArabic.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#FAF6F0] text-stone-900 font-sans selection:bg-[#E8590C] selection:text-white flex flex-col">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
