import { getPageByType } from '@/lib/api';
import { DynamicPageRenderer } from '@/components/page-builder/dynamic-page-renderer';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const pbPage = await getPageByType('account');
  if (pbPage?.content) {
    return (
      <DynamicPageRenderer content={pbPage.content} dynamicBlockType="DynamicAccount">
        {children}
      </DynamicPageRenderer>
    );
  }
  return <>{children}</>;
}
