import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getThemeSettings, generateThemeCSS } from '@/lib/theme';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'ForkCart — Modern Open Source E-Commerce',
    template: '%s | ForkCart',
  },
  description: 'AI-powered open source e-commerce platform. Fast, modern, self-hosted.',
  openGraph: {
    type: 'website',
    siteName: 'ForkCart',
    title: 'ForkCart — Modern Open Source E-Commerce',
    description: 'AI-powered open source e-commerce platform.',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const themeSettings = await getThemeSettings();
  const themeCSS = generateThemeCSS(themeSettings);

  return (
    <html lang="en" suppressHydrationWarning>
      {themeCSS && (
        <head>
          <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
        </head>
      )}
      <body className={`${inter.className} flex min-h-screen flex-col`}>{children}</body>
    </html>
  );
}
