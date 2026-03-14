import { getPageByType } from '@/lib/api';
import { DynamicPageRenderer } from '@/components/page-builder/dynamic-page-renderer';

export default async function SearchLayout({ children }: { children: React.ReactNode }) {
  const pbPage = await getPageByType('search');
  if (pbPage?.content) {
    return (
      <DynamicPageRenderer content={pbPage.content} dynamicBlockType="DynamicSearch">
        {children}
      </DynamicPageRenderer>
    );
  }
  return <>{children}</>;
}
