import { PageWrapper } from '@/components/page-builder/page-wrapper';

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageWrapper pageType="cart" position="above">
      {children}
    </PageWrapper>
  );
}
