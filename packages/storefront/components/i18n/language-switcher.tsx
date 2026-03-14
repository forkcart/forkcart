'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTranslation, Flag, LOCALE_NAMES } from '@forkcart/i18n/react';
import { useState, useRef, useEffect } from 'react';

export function StorefrontLanguageSwitcher({ className }: { className?: string }) {
  const { locale, defaultLocale, supportedLocales: locales } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const switchLocale = (newLocale: string) => {
    // Remove current locale prefix from pathname
    let basePath = pathname;
    for (const loc of locales) {
      if (pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`) {
        basePath = pathname.slice(loc.length + 1) || '/';
        break;
      }
    }

    // Build new path — default locale has no prefix
    const newPath = newLocale === defaultLocale ? basePath : `/${newLocale}${basePath}`;

    localStorage.setItem('forkcart_locale', newLocale);
    router.push(newPath);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-md border bg-transparent px-2.5 py-1.5 text-sm transition hover:bg-gray-100"
        aria-label="Select language"
        aria-expanded={open}
      >
        <Flag locale={locale} size={18} />
        <span className="text-xs font-medium uppercase text-gray-600">{locale}</span>
        <svg
          className={`h-3 w-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-lg border bg-white py-1 shadow-lg">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => switchLocale(loc)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-gray-50 ${
                loc === locale ? 'bg-gray-50 font-medium' : 'text-gray-600'
              }`}
            >
              <Flag locale={loc} size={18} />
              <span>{LOCALE_NAMES[loc] ?? loc.toUpperCase()}</span>
              {loc === locale && (
                <svg
                  className="ml-auto h-4 w-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
