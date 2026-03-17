import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartProvider } from '@/components/cart/cart-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { CurrencyProvider } from '@/components/currency/currency-provider';
import { ChatWidget } from '@/components/chat/chat-widget';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { I18nWrapper } from '@/components/i18n/i18n-provider-wrapper';
import { getI18nConfig, fallbackConfig } from '@/lib/i18n-config';
import { StorefrontSlot } from '@/components/plugins/StorefrontSlot';

/**
 * Generate static params at build time (uses ENV fallback).
 * At runtime, the middleware handles all locale routing dynamically.
 */
export function generateStaticParams() {
  return fallbackConfig.supportedLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { defaultLocale, supportedLocales } = await getI18nConfig();

  return {
    alternates: {
      canonical: locale === defaultLocale ? '/' : `/${locale}`,
      languages: Object.fromEntries(
        supportedLocales.map((l) => [l, l === defaultLocale ? '/' : `/${l}`]),
      ),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { supportedLocales } = await getI18nConfig();

  if (!supportedLocales.includes(locale)) {
    notFound();
  }

  return (
    <I18nWrapper locale={locale}>
      <AuthProvider>
        <CurrencyProvider>
          <CartProvider>
            {/* Plugin slot: before header */}
            <StorefrontSlot slotName="header-before" />
            <Header />
            {/* Plugin slot: after header */}
            <StorefrontSlot slotName="header-after" />
            <main className="flex-1">{children}</main>
            {/* Plugin slot: before footer */}
            <StorefrontSlot slotName="footer-before" />
            <Footer />
            {/* Plugin slot: after footer */}
            <StorefrontSlot slotName="footer-after" />
            <CartDrawer />
            <ChatWidget />
          </CartProvider>
        </CurrencyProvider>
      </AuthProvider>
    </I18nWrapper>
  );
}
