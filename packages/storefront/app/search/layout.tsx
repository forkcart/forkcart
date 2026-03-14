import { PageWrapper } from '@/components/page-builder/page-wrapper';

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageWrapper pageType="search" position="above">
      {children}
    </PageWrapper>
  );
}
