import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getThemeSettings, generateThemeCSS } from '@/lib/theme';
import { StorefrontSlot } from '@/components/plugins/StorefrontSlot';
import { API_URL } from '@/lib/config';
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
      <head>
        <link rel="icon" href="/favicon.png" />
        {/* API URL for storefront plugins */}
        <meta name="forkcart-api" content={API_URL} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.FORKCART = window.FORKCART || {}; window.FORKCART.apiUrl = "${API_URL}";`,
          }}
        />
        {themeCSS && <style dangerouslySetInnerHTML={{ __html: themeCSS }} />}
        {/* Plugin slot: head (for custom CSS, meta tags, etc.) */}
        <StorefrontSlot slotName="head" />
      </head>
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        {/* Plugin slot: body start */}
        <StorefrontSlot slotName="body-start" />
        {children}
        {/* Plugin slot: body end */}
        <StorefrontSlot slotName="body-end" />
      </body>
    </html>
  );
}
