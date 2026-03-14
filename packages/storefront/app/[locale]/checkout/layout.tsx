import { getPageByType } from '@/lib/api';
import { DynamicPageRenderer } from '@/components/page-builder/dynamic-page-renderer';

export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const pbPage = await getPageByType('checkout');
  if (pbPage?.content) {
    return (
      <DynamicPageRenderer content={pbPage.content} dynamicBlockType="DynamicCheckout">
        {children}
      </DynamicPageRenderer>
    );
  }
  return <>{children}</>;
}
