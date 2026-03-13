import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartProvider } from '@/components/cart/cart-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { ChatWidget } from '@/components/chat/chat-widget';
import { I18nWrapper } from '@/components/i18n/i18n-provider-wrapper';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <I18nWrapper>
          <AuthProvider>
            <CartProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <ChatWidget />
            </CartProvider>
          </AuthProvider>
        </I18nWrapper>
      </body>
    </html>
  );
}
