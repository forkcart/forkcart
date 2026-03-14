import { PageWrapper } from '@/components/page-builder/page-wrapper';

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageWrapper pageType="category" position="above">
      {children}
    </PageWrapper>
  );
}
