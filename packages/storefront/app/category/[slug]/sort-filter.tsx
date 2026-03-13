'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslation } from '@forkcart/i18n/react';

export function SortFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const current = `${searchParams.get('sort') ?? 'createdAt'}:${searchParams.get('order') ?? 'desc'}`;

  const SORT_OPTIONS = [
    { label: t('category.sort.newest'), value: 'createdAt:desc' },
    { label: t('category.sort.priceLowHigh'), value: 'price:asc' },
    { label: t('category.sort.priceHighLow'), value: 'price:desc' },
    { label: t('category.sort.nameAZ'), value: 'name:asc' },
  ] as const;

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
        {t('category.sort.label')}
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
