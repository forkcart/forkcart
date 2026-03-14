'use client';

import Link from 'next/link';
import { useLocale, useDefaultLocale } from '@forkcart/i18n/react';
import { localePath } from '@/lib/navigation';
import type { ComponentProps } from 'react';

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
  locale?: string;
};

/** Link that automatically adds locale prefix for non-default locales */
export function LocaleLink({ href, locale: explicitLocale, ...props }: LocaleLinkProps) {
  const currentLocale = useLocale();
  const defaultLocale = useDefaultLocale();
  const locale = explicitLocale ?? currentLocale;
  const localizedHref = localePath(href, locale, defaultLocale);

  return <Link href={localizedHref} {...props} />;
}
