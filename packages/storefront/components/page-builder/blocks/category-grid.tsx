import Link from 'next/link';
import { getCategories } from '@/lib/api';
import type { Category } from '@forkcart/shared';

export interface CategoryGridProps {
  columns?: 2 | 3 | 4;
  title?: string;
  className?: string;
}

export async function RenderCategoryGrid({ columns = 3, title, className }: CategoryGridProps) {
  let categories: Category[] = [];

  try {
    categories = await getCategories();
  } catch {
    // API not available
  }

  if (categories.length === 0) return null;

  const gridCols: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <section className={`mx-auto w-full max-w-6xl px-6 py-12 ${className ?? ''}`}>
      {title && <h2 className="mb-6 text-2xl font-bold text-gray-900">{title}</h2>}
      <div className={`grid gap-6 ${gridCols[columns] ?? gridCols[3]}`}>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="group block rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900 transition group-hover:text-accent">
              {category.name}
            </h3>
            {category.description && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-500">{category.description}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
