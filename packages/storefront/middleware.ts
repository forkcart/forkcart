import { NextRequest, NextResponse } from 'next/server';
import { getI18nConfig, fallbackConfig } from './lib/i18n-config';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, API routes, Next internals
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Fetch locale config from admin API (cached, 1 min TTL)
  const { defaultLocale, supportedLocales } = await getI18nConfig();

  // Check if first segment is a supported locale
  const segments = pathname.split('/');
  const maybeLocale = segments[1];

  if (maybeLocale && supportedLocales.includes(maybeLocale)) {
    if (maybeLocale === defaultLocale) {
      // Default locale should NOT have prefix → redirect to clean URL
      const rest = segments.slice(2).join('/');
      const newPath = rest ? `/${rest}` : '/';
      const url = request.nextUrl.clone();
      url.pathname = newPath;
      return NextResponse.redirect(url);
    }
    // Non-default locale with prefix → serve as-is
    return NextResponse.next();
  }

  // Check if first segment looks like a locale code but isn't supported
  // → redirect to the same path without the prefix (default locale)
  // Skip 'ext' — it's the plugin storefront pages prefix, not a locale
  const RESERVED_PREFIXES = ['ext', 'api', 'app'];
  if (
    maybeLocale &&
    /^[a-z]{2,3}$/.test(maybeLocale) &&
    !supportedLocales.includes(maybeLocale) &&
    !RESERVED_PREFIXES.includes(maybeLocale)
  ) {
    const rest = segments.slice(2).join('/');
    const newPath = rest ? `/${rest}` : '/';
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.redirect(url);
  }

  // No locale prefix → internally rewrite to /[defaultLocale]/...
  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
};
