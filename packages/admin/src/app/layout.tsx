import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/layout/providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ForkCart Admin',
  description: 'ForkCart E-Commerce Admin Panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__FORKCART_API_URL = "${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}";`,
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
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
