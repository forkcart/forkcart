import { getPageByType } from '@/lib/api';
import { PageRenderer } from './renderer';

interface PageWrapperProps {
  pageType: string;
  children: React.ReactNode;
  /** Render PB content above children (default), below, or replace entirely */
  position?: 'above' | 'below' | 'replace';
}

/**
 * Wraps a storefront page with optional Page Builder content.
 * If a published page with matching page_type exists, renders its content.
 * Otherwise, renders just the children (hardcoded fallback).
 */
export async function PageWrapper({ pageType, children, position = 'above' }: PageWrapperProps) {
  const page = await getPageByType(pageType);
  const hasContent = page?.content && Object.keys(page.content as object).length > 0;

  if (!hasContent) {
    return <>{children}</>;
  }

  if (position === 'replace') {
    return (
      <main>
        <PageRenderer content={page.content} />
      </main>
    );
  }

  return (
    <>
      {position === 'above' && <PageRenderer content={page.content} />}
      {children}
      {position === 'below' && <PageRenderer content={page.content} />}
    </>
  );
}
