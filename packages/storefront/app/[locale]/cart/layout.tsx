import { getPageByType } from '@/lib/api';
import { DynamicPageRenderer } from '@/components/page-builder/dynamic-page-renderer';

export default async function CartLayout({ children }: { children: React.ReactNode }) {
  const pbPage = await getPageByType('cart');
  if (pbPage?.content) {
    return (
      <DynamicPageRenderer content={pbPage.content} dynamicBlockType="DynamicCart">
        {children}
      </DynamicPageRenderer>
    );
  }
  return <>{children}</>;
}
