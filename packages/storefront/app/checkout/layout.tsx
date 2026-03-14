import { PageWrapper } from '@/components/page-builder/page-wrapper';

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageWrapper pageType="checkout" position="above">
      {children}
    </PageWrapper>
  );
}
