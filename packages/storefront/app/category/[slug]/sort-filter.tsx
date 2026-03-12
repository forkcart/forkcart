'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const SORT_OPTIONS = [
  { label: 'Newest', value: 'createdAt:desc' },
  { label: 'Price: Low to High', value: 'price:asc' },
  { label: 'Price: High to Low', value: 'price:desc' },
  { label: 'Name: A–Z', value: 'name:asc' },
] as const;

export function SortFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = `${searchParams.get('sort') ?? 'createdAt'}:${searchParams.get('order') ?? 'desc'}`;

  function handleChange(value: string) {
    const [sort, order] = value.split(':');
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sort || 'name');
    params.set('order', order || 'asc');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-sm text-gray-500">
        Sort by
      </label>
      <select
        id="sort"
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="h-9 rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
