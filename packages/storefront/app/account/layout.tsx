import { PageWrapper } from '@/components/page-builder/page-wrapper';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageWrapper pageType="account" position="above">
      {children}
    </PageWrapper>
  );
}
