import { PageWrapper } from '@/components/page-builder/page-wrapper';

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageWrapper pageType="product" position="below">
      {children}
    </PageWrapper>
  );
}
