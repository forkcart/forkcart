import Link from 'next/link';
import { getPageByType } from '@/lib/api';
import { PageRenderer } from '@/components/page-builder/renderer';

export default async function NotFound() {
  // Try to load custom 404 page from Page Builder
  try {
    const page = await getPageByType('error404');
    if (page?.content && Object.keys(page.content as object).length > 0) {
      return (
        <main>
          <PageRenderer content={page.content} />
        </main>
      );
    }
  } catch {
    // Fall through to default
  }

  // Default 404
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-4 text-6xl font-bold text-gray-900">404</h1>
      <p className="mb-8 text-xl text-gray-600">Page not found</p>
      <Link
        href="/"
        className="rounded-lg bg-gray-900 px-6 py-3 text-white transition-colors hover:bg-gray-800"
      >
        Back to Homepage
      </Link>
    </main>
  );
}
