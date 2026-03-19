import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPage, resolvePageForLocale } from '@/lib/api';
import { getI18nConfig } from '@/lib/i18n-config';
import { PageRenderer } from '@/components/page-builder/renderer';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;

  try {
    const page = await getPage(slug);
    const i18n = await getI18nConfig();
    const resolved = resolvePageForLocale(page, locale, i18n.defaultLocale);
    return {
      title: resolved.seoTitle ?? resolved.title,
      description: resolved.seoDescription ?? undefined,
      openGraph: resolved.ogImage ? { images: [{ url: resolved.ogImage }] } : undefined,
    };
  } catch {
    return { title: 'Page Not Found' };
  }
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug, locale } = await params;

  let page;
  try {
    page = await getPage(slug);
  } catch {
    notFound();
  }

  if (!page || page.status !== 'published') {
    notFound();
  }

  // System pages (product, cart, checkout etc.) are not directly accessible via /p/
  // They are used as templates by their respective routes (/product/[slug], /cart, etc.)
  if (page.pageType && page.pageType !== 'custom') {
    notFound();
  }

  // Resolve translated content for the current locale
  const i18n = await getI18nConfig();
  const resolved = resolvePageForLocale(page, locale, i18n.defaultLocale);

  return (
    <main>
      <PageRenderer content={resolved.content} locale={locale} />
    </main>
  );
}
