import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getThemeSettings, generateThemeCSS } from '@/lib/theme';
import { StorefrontSlot } from '@/components/plugins/StorefrontSlot';
import { ReactGlobals } from '@/components/plugins/ReactGlobals';
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

        {/* ForkCart generator tag — for PublicWWW/BuiltWith discoverability */}
        <meta name="generator" content="ForkCart" />

        {/* API URL for storefront plugins */}
        <meta name="forkcart-api" content={API_URL} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.FORKCART = window.FORKCART || {}; window.FORKCART.apiUrl = "${API_URL}";`,
          }}
        />
        {/* Import map: resolve bare "react" imports in plugin ESM bundles
            to shim modules that re-export the host React instance */}
        <script
          type="importmap"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              imports: {
                react: '/_plugin-shims/react.js',
                'react-dom': '/_plugin-shims/react-dom.js',
                'react/jsx-runtime': '/_plugin-shims/react-jsx-runtime.js',
              },
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // ChunkLoadError auto-recovery: reload once on stale chunk 404s
              window.addEventListener('error', function(e) {
                var msg = (e.message || '') + ' ' + ((e.error && e.error.message) || '');
                if (msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf('Loading chunk') !== -1
                    || msg.indexOf('Failed to fetch dynamically imported module') !== -1) {
                  var key = 'chunk_reload_' + location.pathname;
                  if (!sessionStorage.getItem(key)) {
                    sessionStorage.setItem(key, '1');
                    location.reload();
                  }
                }
              });
            `,
          }}
        />
        {themeCSS && <style dangerouslySetInnerHTML={{ __html: themeCSS }} />}
        {/* Plugin slot: head (for custom CSS, meta tags, etc.) */}
        <StorefrontSlot slotName="head" />
      </head>
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        {/* Plugin slot: body start */}
        <ReactGlobals />
        <StorefrontSlot slotName="body-start" />
        {children}
        {/* Plugin slot: body end */}
        <StorefrontSlot slotName="body-end" />
      </body>
    </html>
  );
}
