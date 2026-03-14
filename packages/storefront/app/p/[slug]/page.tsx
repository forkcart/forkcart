import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPage } from '@/lib/api';
import { PageRenderer } from '@/components/page-builder/renderer';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const page = await getPage(slug);
    return {
      title: page.seoTitle ?? page.title,
      description: page.seoDescription ?? undefined,
    };
  } catch {
    return { title: 'Page Not Found' };
  }
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;

  let page;
  try {
    page = await getPage(slug);
  } catch {
    notFound();
  }

  if (!page || page.status !== 'published') {
    notFound();
  }

  return (
    <main>
      <PageRenderer content={page.content} />
    </main>
  );
}
