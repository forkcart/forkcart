import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartProvider } from '@/components/cart/cart-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { ChatWidget } from '@/components/chat/chat-widget';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { I18nWrapper } from '@/components/i18n/i18n-provider-wrapper';
import { defaultLocale, supportedLocales } from '@/lib/i18n-config';

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
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

  if (!supportedLocales.includes(locale)) {
    notFound();
  }

  return (
    <I18nWrapper locale={locale}>
      <AuthProvider>
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CartDrawer />
          <ChatWidget />
        </CartProvider>
      </AuthProvider>
    </I18nWrapper>
  );
}
